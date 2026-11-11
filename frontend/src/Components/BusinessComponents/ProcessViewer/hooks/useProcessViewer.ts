import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useBpmnViewerInstance } from '../../../../shared/hooks/useBpmnViewerInstance';
import { useCallActivityNavigation } from '../../../../shared/hooks/useCallActivityNavigation';
import type { ProcessViewerRemark } from '../ProcessViewer';

const ZOOM_STEP = 1.2;

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
  const initialViewportAppliedRef = useRef(false);
  const showDiagramAtActualSizeRef = useRef<() => boolean>(() => false);
  const resizeDiagramRef = useRef<() => void>(() => undefined);
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
    canvas.resized?.();
    // Use diagram-js' native fit-to-viewport calculation. It accounts for the
    // complete diagram bounds and avoids maintaining a second, fragile bbox
    // implementation in the application.
    canvas.zoom('fit-viewport');
  };

  const showDiagramAtActualSize = (): boolean => {
    if (!importedRef.current) return false;

    const canvas = viewer.get('canvas') as any;
    canvas.resized?.();
    const bounds = canvas.getBBox?.();
    const container = canvas.getContainer();
    const { width, height } = container.getBoundingClientRect();
    if (
      !bounds ||
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height) ||
      width <= 0 ||
      height <= 0 ||
      bounds.width <= 0 ||
      bounds.height <= 0
    ) return false;

    // One diagram unit per screen pixel: the initial Viewer scale is exactly
    // 1:1, with the diagram's upper-left corner aligned to the viewport's
    // upper-left corner. Larger diagrams can be panned to inspect the rest.
    canvas.viewbox({
      x: bounds.x,
      y: bounds.y,
      width,
      height,
    });
    return true;
  };

  const resizeDiagram = () => {
    if (!importedRef.current) return;

    const canvas = viewer.get('canvas') as any;
    const previousViewbox = canvas.viewbox();
    const previousZoom = canvas.zoom();
    const centerX = previousViewbox.x + previousViewbox.width / 2;
    const centerY = previousViewbox.y + previousViewbox.height / 2;

    canvas.resized?.();
    const container = canvas.getContainer();
    const { width, height } = container.getBoundingClientRect();
    if (width <= 0 || height <= 0 || !Number.isFinite(previousZoom) || previousZoom <= 0) return;

    // Keep the user's current zoom and diagram center when the workspace or
    // fullscreen viewport changes size; resizing must not silently "fit" it.
    canvas.viewbox({
      x: centerX - width / previousZoom / 2,
      y: centerY - height / previousZoom / 2,
      width: width / previousZoom,
      height: height / previousZoom,
    });
  };

  showDiagramAtActualSizeRef.current = showDiagramAtActualSize;
  resizeDiagramRef.current = resizeDiagram;

  // The Viewer can be imported while its tab is hidden (zero-sized). Observe
  // the real canvas container and apply its initial viewport as soon as the
  // tab becomes visible, without requiring a manual page reload.
  useEffect(() => {
    const host = viewerRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => {
      const entry = entries[entries.length - 1];
      if (!entry || entry.contentRect.width <= 0 || entry.contentRect.height <= 0 || !importedRef.current) return;
      if (!initialViewportAppliedRef.current) {
        initialViewportAppliedRef.current = showDiagramAtActualSizeRef.current();
      } else {
        resizeDiagramRef.current();
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [viewer]);

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
    initialViewportAppliedRef.current = false;
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

      // Selection is controlled by the React route/panel state below. Stop
      // diagram-js' lower-priority default click selector from racing that
      // state update (notably when the same element is clicked to deselect it).
      event?.stopPropagation?.();

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
        // Wait for the Viewer canvas to receive its final flex layout,
        // then center the process at the requested default scale of 1:1.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (cancelled || generation !== importGenerationRef.current) return;
            initialViewportAppliedRef.current = showDiagramAtActualSize();
            // Reapply the route-driven selection after the final canvas layout.
            // This avoids losing the blue marker when a process is opened through
            // explorer navigation while its XML and selection state resolve.
            applySelectionRef.current();
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
