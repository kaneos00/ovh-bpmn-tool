import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useModelerInstance } from '../../../../shared/hooks/useModelerInstance';
import { useCallActivityNavigation } from '../../../../shared/hooks/useCallActivityNavigation';

const ZOOM_STEP = 1.2;
const DIAGRAM_PADDING = 24;

export const useProcessViewer = (
  resourceId: string,
  contentId: string,
  selectedElementId?: string | null,
  onElementSelect?: (elementId: string) => void,
) => {
  const { getViewerInstance } = useModelerInstance();
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null | undefined>(selectedElementId);
  const onElementSelectRef = useRef(onElementSelect);
  const importedRef = useRef(false);
  const highlightedIdRef = useRef<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [minimapVisible, setMinimapVisible] = useState(false);
  const importGenerationRef = useRef(0);
  const importQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  selectedIdRef.current = selectedElementId;
  onElementSelectRef.current = onElementSelect;

  const { data: xmlContent, isLoading: isXmlLoading, isError: isXmlError } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const viewer = useMemo(() => getViewerInstance(), []);
  const setMinimapVisibility = useCallback((visible: boolean) => {
    setMinimapVisible(visible);
    const minimap = viewer.get('minimap') as { open?: () => void; close?: () => void };
    if (visible) minimap?.open?.();
    else minimap?.close?.();
  }, [viewer]);
  useCallActivityNavigation(viewer, true);

  const alignDiagramTopLeft = () => {
    const canvas = viewer.get('canvas') as any;
    const elementRegistry = viewer.get('elementRegistry') as any;
    const viewport = canvas.viewbox();
    if (!viewport) return;

    const bounds = elementRegistry
      .getAll()
      .filter((element: any) =>
        element &&
        !element.labelTarget &&
        !element.waypoints &&
        Number.isFinite(element.x) &&
        Number.isFinite(element.y) &&
        element.width > 0 &&
        element.height > 0,
      )
      .map((element: any) => canvas.getAbsoluteBBox(element))
      .filter((bbox: any) => bbox && Number.isFinite(bbox.x) && Number.isFinite(bbox.y));

    if (!bounds.length) return;

    const minX = Math.min(...bounds.map((bbox: any) => bbox.x));
    const minY = Math.min(...bounds.map((bbox: any) => bbox.y));

    // Preserve the current fit scale while aligning the diagram with the
    // upper-left edge of the available canvas.
    canvas.viewbox({
      x: minX - DIAGRAM_PADDING,
      y: minY - DIAGRAM_PADDING,
      width: viewport.width,
      height: viewport.height,
    });
  };

  const fitDiagramToWidth = () => {
    // The viewer starts at a true 1:1 scale, anchored at the diagram's
    // upper-left corner. Users can still choose "Ajuster" from the toolbar.
    (viewer.get('canvas') as any).zoom(1);
    alignDiagramTopLeft();
  };

  const zoomIn = () => {
    if (!importedRef.current) return;
    const canvas = viewer.get('canvas') as any;
    const container = canvas.getContainer();
    const rect = container.getBoundingClientRect();
    canvas.zoom(canvas.zoom() * ZOOM_STEP, { x: rect.width / 2, y: rect.height / 2 });
  };

  const zoomOut = () => {
    if (!importedRef.current) return;
    const canvas = viewer.get('canvas') as any;
    const container = canvas.getContainer();
    const rect = container.getBoundingClientRect();
    canvas.zoom(canvas.zoom() / ZOOM_STEP, { x: rect.width / 2, y: rect.height / 2 });
  };

  const resetZoom = () => {
    if (!importedRef.current) return;
    (viewer.get('canvas') as any).zoom(1);
  };

  const fitDiagram = () => {
    if (!importedRef.current) return;
    (viewer.get('canvas') as any).zoom('fit-viewport');
    alignDiagramTopLeft();
  };

  const applySelection = () => {
    if (!importedRef.current) return;

    const canvas = viewer.get('canvas') as any;
    const previousId = highlightedIdRef.current;
    if (previousId) canvas.removeMarker(previousId, 'task-selected');
    highlightedIdRef.current = null;

    const targetId = selectedIdRef.current;
    if (!targetId) return;

    const element = (viewer.get('elementRegistry') as any).get(targetId);
    if (!element) return;

    canvas.addMarker(targetId, 'task-selected');
    highlightedIdRef.current = targetId;
  };

  const applySelectionRef = useRef(applySelection);
  applySelectionRef.current = applySelection;

  useEffect(() => {
    let cancelled = false;
    const generation = ++importGenerationRef.current;

    if (!viewerRef.current) {
      setIsImporting(false);
      return () => {
        cancelled = true;
      };
    }

    const clearViewerAfterQueuedImports = () => {
      const clearTask = importQueueRef.current
        .catch(() => undefined)
        .then(() => {
          if (cancelled || generation !== importGenerationRef.current) return;
          viewer.clear();
        });
      importQueueRef.current = clearTask;
    };

    if (isXmlError) {
      importedRef.current = false;
      highlightedIdRef.current = null;
      setImportError('Le contenu XML du diagramme est indisponible.');
      setIsImporting(false);
      clearViewerAfterQueuedImports();
      return () => {
        cancelled = true;
        if (importGenerationRef.current === generation) importGenerationRef.current += 1;
      };
    }

    if (!xmlContent) {
      setMinimapVisibility(false);
      if (isXmlLoading) {
        // Keep the previous canvas covered while a route change fetches its XML.
        setImportError(null);
        setIsImporting(true);
        if (!importedRef.current) clearViewerAfterQueuedImports();
      } else {
        importedRef.current = false;
        highlightedIdRef.current = null;
        setImportError('Le processus ne contient pas de diagramme XML exploitable.');
        setIsImporting(false);
        clearViewerAfterQueuedImports();
      }
      return () => {
        cancelled = true;
        if (importGenerationRef.current === generation) importGenerationRef.current += 1;
      };
    }

    setIsImporting(true);
    // Close the actual minimap service as well as hiding its React wrapper.
    setMinimapVisibility(false);
    setImportError(null);
    viewer.attachTo(viewerRef.current);
    const eventBus = viewer.get('eventBus') as {
      on: (event: string, listener: (event: any) => void) => void;
      off: (event: string, listener: (event: any) => void) => void;
    };
    let clickListenerAttached = false;
    let pendingSelectionTimer: ReturnType<typeof setTimeout> | null = null;
    let lastClickedElementId: string | null = null;
    let lastClickAt = 0;
    const cancelPendingSelection = () => {
      if (pendingSelectionTimer) clearTimeout(pendingSelectionTimer);
      pendingSelectionTimer = null;
    };
    const onElementClick = (event: any) => {
      const element = event?.element;
      if (!element?.id) return;

      // Select BPMN shapes by their business-object type rather than a closed
      // list of diagram-js shape types. This includes collapsed SubProcesses
      // and future BPMN shape types, while excluding labels and connections.
      const elementType = element.businessObject?.$type ?? element.type;
      const isSelectableElement =
        typeof elementType === 'string' &&
        elementType.startsWith('bpmn:') &&
        !element.labelTarget &&
        !Array.isArray(element.waypoints);
      if (!isSelectableElement) return;

      const now = Date.now();
      const isRapidSecondClick =
        lastClickedElementId === element.id && now - lastClickAt < 280;
      lastClickedElementId = element.id;
      lastClickAt = now;

      // A rapid second click belongs to the double-click gesture. Cancel a
      // pending deselection, but never delay selecting a new element.
      if (isRapidSecondClick) {
        cancelPendingSelection();
        return;
      }

      cancelPendingSelection();
      const currentlySelected = selectedIdRef.current;
      if (currentlySelected !== element.id) {
        onElementSelectRef.current?.(element.id);
        return;
      }

      // Only delay deselection of an already-selected element so a double-click
      // can cancel it. New selections are applied immediately.
      pendingSelectionTimer = setTimeout(() => {
        pendingSelectionTimer = null;
        if (selectedIdRef.current === element.id) {
          onElementSelectRef.current?.('');
        }
      }, 220);
    };
    const onElementDoubleClick = (event: any) => {
      cancelPendingSelection();
      lastClickedElementId = null;
      lastClickAt = 0;

      const element = event?.element;
      const elementType = element?.businessObject?.$type ?? element?.type;
      const isTaskWithUrl =
        (elementType === 'bpmn:Task' || String(elementType ?? '').endsWith('Task')) &&
        elementType !== 'bpmn:CallActivity';
      const url = String(element?.businessObject?.link ?? '').trim();
      if (!isTaskWithUrl || !url) return;

      const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
    };

    const importTask = importQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (cancelled || generation !== importGenerationRef.current) return;
        await viewer.importXML(xmlContent);
        if (cancelled || generation !== importGenerationRef.current) return;

        // Attach interaction listeners only for the latest completed import.
        // Run before the Viewer drilldown handlers so collapsed SubProcess clicks are not consumed first.
        eventBus.on('element.click', 1500, onElementClick);
        eventBus.on('element.dblclick', onElementDoubleClick);
        clickListenerAttached = true;
        const canvas = viewer.get('canvas') as any;
        const elementRegistry = viewer.get('elementRegistry') as any;
        elementRegistry.getAll().forEach((element: any) => {
          if (element?.type === 'bpmn:StartEvent') {
            canvas.addMarker(element.id, 'bpmn-start-event');
          } else if (element?.type === 'bpmn:EndEvent') {
            canvas.addMarker(element.id, 'bpmn-end-event');
          } else if (element?.type === 'bpmn:DataStoreReference') {
            canvas.addMarker(element.id, 'bpmn-data-store');
          } else if (element?.type === 'bpmn:DataObjectReference') {
            canvas.addMarker(element.id, 'bpmn-data-object-reference');
          } else if (element?.type === 'bpmn:ExclusiveGateway') {
            canvas.addMarker(element.id, 'bpmn-gateway-exclusive');
          } else if (element?.type === 'bpmn:ParallelGateway') {
            canvas.addMarker(element.id, 'bpmn-gateway-parallel');
          } else if (element?.type === 'bpmn:InclusiveGateway') {
            canvas.addMarker(element.id, 'bpmn-gateway-inclusive');
          } else if (element?.type === 'bpmn:ComplexGateway') {
            canvas.addMarker(element.id, 'bpmn-gateway-complex');
          } else if (element?.type === 'bpmn:EventBasedGateway') {
            canvas.addMarker(element.id, 'bpmn-gateway-event-based');
          }
        });
        fitDiagramToWidth();
        importedRef.current = true;
        setIsImporting(false);
        // Keep the minimap closed on import; users can open it manually from the viewer controls.
        applySelectionRef.current();
      });

    importQueueRef.current = importTask.catch((error: unknown) => {
      if (cancelled || generation !== importGenerationRef.current) return;
      importedRef.current = false;
      highlightedIdRef.current = null;
      viewer.clear();
      setImportError(
        error instanceof Error
          ? `Le diagramme BPMN ne peut pas être affiché : ${error.message}`
          : 'Le diagramme BPMN ne peut pas être affiché : erreur lors de son import.',
      );
      setIsImporting(false);
    });

    return () => {
      cancelled = true;
      if (importGenerationRef.current === generation) importGenerationRef.current += 1;
      cancelPendingSelection();
      if (clickListenerAttached) {
        eventBus.off('element.click', onElementClick);
        eventBus.off('element.dblclick', onElementDoubleClick);
      }
    };
  }, [xmlContent, resourceId, contentId, viewer, isXmlLoading, isXmlError, setMinimapVisibility]);

  useEffect(() => {
    applySelectionRef.current();
  }, [selectedElementId]);

  useEffect(() => () => {
    try {
      viewer.destroy();
    } catch {
      // The viewer may already have been destroyed by its parent.
    }
  }, [viewer]);

  return {
    viewerRef,
    content: xmlContent ?? '',
    importError,
    // Keep the previous diagram visible while a subsequent process is fetched/imported.
    // Show the loading cover only before the first successful import.
    isLoading: (isXmlLoading || isImporting) && !importedRef.current,
    minimapVisible,
    setMinimapVisible: setMinimapVisibility,
    zoomIn,
    zoomOut,
    resetZoom,
    fitDiagram,
  };
};
