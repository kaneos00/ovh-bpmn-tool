import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useBpmnViewerInstance } from '../../../../shared/hooks/useBpmnViewerInstance';
import { useCallActivityNavigation } from '../../../../shared/hooks/useCallActivityNavigation';
import type { ProcessViewerRemark } from '../ProcessViewer';

const ZOOM_STEP = 1.2;
const DIAGRAM_PADDING = 24;

export const useProcessViewer = (
  resourceId: string,
  contentId: string,
  selectedElementId?: string | null,
  onElementSelect?: (elementId: string) => void,
  remarks: ProcessViewerRemark[] = [],
) => {
  const { getViewerInstance } = useBpmnViewerInstance();
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null | undefined>(selectedElementId);
  const onElementSelectRef = useRef(onElementSelect);
  const importedRef = useRef(false);
  const highlightedIdRef = useRef<string | null>(null);
  const overlayIdsRef = useRef<Array<string | number>>([]);
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
        importedRef.current = true;
        // Wait for the Viewer canvas to receive its final flex layout before
        // calculating the initial fit. A 1:1 zoom crops larger processes until refresh.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (cancelled || generation !== importGenerationRef.current) return;
            fitDiagram();
          });
        });
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
    if (!importedRef.current) return undefined;

    const overlays = viewer.get('overlays') as any;
    const registry = viewer.get('elementRegistry') as any;
    overlayIdsRef.current.forEach(id => {
      try {
        overlays.remove(id);
      } catch {
        // The import may already have cleared the overlay.
      }
    });
    overlayIdsRef.current = [];

    const counts = new Map<string, { total: number; pending: number }>();
    remarks.forEach(remark => {
      if (!registry.get(remark.elementId)) return;
      const current = counts.get(remark.elementId) ?? { total: 0, pending: 0 };
      current.total += 1;
      if (remark.status === 'pending') current.pending += 1;
      counts.set(remark.elementId, current);
    });

    counts.forEach(({ total, pending }, elementId) => {
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.textContent = String(total);
      badge.title = pending > 0
        ? `${total} remarque(s) sur cet élément, dont ${pending} à traiter`
        : `${total} remarque(s) sur cet élément`;
      badge.setAttribute('aria-label', badge.title);
      Object.assign(badge.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '20px',
        height: '20px',
        padding: '0 5px',
        border: '2px solid #fff',
        borderRadius: '12px',
        background: pending > 0 ? '#b45309' : '#2459a6',
        color: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        fontSize: '11px',
        fontWeight: '700',
        lineHeight: '16px',
        cursor: 'pointer',
      });
      badge.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        onElementSelectRef.current?.(elementId);
      });
      const overlayId = overlays.add(elementId, 'contextual-remarks', {
        position: { top: -9, right: -9 },
        html: badge,
      });
      if (overlayId !== undefined && overlayId !== null) {
        overlayIdsRef.current.push(overlayId);
      }
    });

    return () => {
      overlayIdsRef.current.forEach(id => {
        try {
          overlays.remove(id);
        } catch {
          // Ignore overlays already removed by the viewer.
        }
      });
      overlayIdsRef.current = [];
    };
  }, [remarks, viewer, isImporting]);

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
