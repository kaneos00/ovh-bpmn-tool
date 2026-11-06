import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useBpmnViewerInstance } from '../../../../shared/hooks/useBpmnViewerInstance';
import { useCallActivityNavigation } from '../../../../shared/hooks/useCallActivityNavigation';

const ZOOM_STEP = 1.2;
const DIAGRAM_PADDING = 24;

export const useProcessViewer = (
  resourceId: string,
  contentId: string,
  selectedElementId?: string | null,
  onElementSelect?: (elementId: string) => void,
) => {
  const { getViewerInstance } = useBpmnViewerInstance();
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

  // Recreate the Viewer when provider extensions/modules change; an empty
  // dependency list would permanently capture the initial provider options.
  const viewer = useMemo(() => getViewerInstance(), [getViewerInstance]);
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

    const canvas = viewer.get('canvas') as any;
    const elementRegistry = viewer.get('elementRegistry') as any;
    canvas.resized?.();

    const container = canvas.getContainer();
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const availableWidth = containerWidth - DIAGRAM_PADDING * 2;
    const availableHeight = containerHeight - DIAGRAM_PADDING * 2;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    // Include shapes, labels and connections in the visual bounds, then fit
    // the complete BPMN geometry while preserving its aspect ratio.
    // The smaller of the width and height scales is the limiting dimension.
    const bounds = elementRegistry.getAll()
      .flatMap((element: any) => {
        if (!element) return [];

        // Connections can be horizontal or vertical (zero width/height), so
        // include their waypoints directly instead of relying on their bbox.
        if (Array.isArray(element.waypoints) && element.waypoints.length > 0) {
          const points = element.waypoints.filter((point: any) =>
            Number.isFinite(point.x) && Number.isFinite(point.y),
          );
          if (points.length > 0) {
            const xs = points.map((point: any) => point.x);
            const ys = points.map((point: any) => point.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            return [{
              x: minX,
              y: minY,
              width: Math.max(1, maxX - minX),
              height: Math.max(1, maxY - minY),
            }];
          }
        }

        if (
          !Number.isFinite(element.x) ||
          !Number.isFinite(element.y) ||
          element.width <= 0 ||
          element.height <= 0
        ) return [];

        return [canvas.getAbsoluteBBox(element)];
      })
      .filter((bbox: any) =>
        bbox &&
        Number.isFinite(bbox.x) &&
        Number.isFinite(bbox.y) &&
        Number.isFinite(bbox.width) &&
        Number.isFinite(bbox.height) &&
        bbox.width > 0 &&
        bbox.height > 0,
      );

    if (!bounds.length) return;

    const minX = Math.min(...bounds.map((bbox: any) => bbox.x));
    const minY = Math.min(...bounds.map((bbox: any) => bbox.y));
    const maxX = Math.max(...bounds.map((bbox: any) => bbox.x + bbox.width));
    const maxY = Math.max(...bounds.map((bbox: any) => bbox.y + bbox.height));
    const diagramWidth = maxX - minX;
    const diagramHeight = maxY - minY;
    if (diagramWidth <= 0 || diagramHeight <= 0) return;

    const scale = Math.min(
      availableWidth / diagramWidth,
      availableHeight / diagramHeight,
    );
    if (!Number.isFinite(scale) || scale <= 0) return;

    // canvas.viewbox works in diagram coordinates. Convert the screen-space
    // padding back through the selected scale so neither edge is clipped.
    canvas.viewbox({
      x: minX - DIAGRAM_PADDING / scale,
      y: minY - DIAGRAM_PADDING / scale,
      width: containerWidth / scale,
      height: containerHeight / scale,
    });
  };

  const resizeDiagram = () => {
    if (!importedRef.current) return;
    fitDiagram();
  };

  const applySelection = () => {
    if (!importedRef.current) return;

    const canvas = viewer.get('canvas') as any;
    const elementRegistry = viewer.get('elementRegistry') as any;
    const selection = viewer.get('selection') as any;
    const previousId = highlightedIdRef.current;
    if (previousId) {
      canvas.removeMarker(previousId, 'task-selected');
      const previousElement = elementRegistry.get(previousId);
      if (previousElement) selection?.deselect?.([previousElement]);
    }
    highlightedIdRef.current = null;

    const targetId = selectedIdRef.current;
    if (!targetId) {
      selection?.select?.([]);
      return;
    }

    const element = elementRegistry.get(targetId);
    if (!element) {
      selection?.select?.([]);
      return;
    }

    canvas.addMarker(targetId, 'task-selected');
    // Also use diagram-js selection so navigation from the RACI is visible
    // as an actual selection, not only as an application marker.
    selection?.select?.([element]);
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
      on: (event: string, listenerOrPriority: number | ((event: any) => void), listener?: (event: any) => void) => void;
      off: (event: string, listener: (event: any) => void) => void;
    };
    let clickListenerAttached = false;
    const onElementClick = (event: any) => {
      const clickedElement = event?.element;
      // diagram-js emits clicks on BPMN labels as separate elements. Resolve
      // those labels to their owning shape so the right-hand task panel always
      // follows the object the user actually clicked.
      const element = clickedElement?.labelTarget ?? clickedElement;
      if (!element?.id) return;

      // Select BPMN shapes by their business-object type rather than a closed
      // list of diagram-js shape types. This includes labels, collapsed
      // SubProcesses and future BPMN shape types, while excluding connections.
      const elementType = element.businessObject?.$type ?? element.type;
      const isConnection = Array.isArray(element.waypoints) ||
        /^(?:bpmn:)?(?:sequenceFlow|messageFlow|association|dataInputAssociation|dataOutputAssociation|conversationLink)$/i.test(String(elementType ?? ''));
      if (isConnection) {
        // Prevent diagram-js' default click handler from selecting a BPMN flow.
        event?.stopPropagation?.();
        const selection = viewer.get('selection') as any;
        selection?.deselect?.([element]);
        return;
      }
      const isSelectableElement =
        typeof elementType === 'string' &&
        elementType.startsWith('bpmn:') &&
        !Array.isArray(element.waypoints);
      if (!isSelectableElement) return;

      // Every click toggles the same element immediately. Do not interpret a
      // second click as a double-click exception: users expect it to deselect
      // the element and close its information panel.
      if (selectedIdRef.current === element.id) {
        onElementSelectRef.current?.('');
      } else {
        onElementSelectRef.current?.(element.id);
      }
    };
    const onElementDoubleClick = (event: any) => {
      const clickedElement = event?.element;
      const element = clickedElement?.labelTarget ?? clickedElement;
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
    resizeDiagram,
  };
};
