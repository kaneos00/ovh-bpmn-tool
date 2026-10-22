import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [minimapVisible, setMinimapVisible] = useState(false);

  selectedIdRef.current = selectedElementId;
  onElementSelectRef.current = onElementSelect;

  const { data: xmlContent } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const viewer = useMemo(() => getViewerInstance(), []);
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

    if (!viewerRef.current || !xmlContent) {
      importedRef.current = false;
      highlightedIdRef.current = null;
      setMinimapVisible(false);
      setImportError(null);
      viewer.clear();
      return () => {
        cancelled = true;
      };
    }

    importedRef.current = false;
    setMinimapVisible(false);
    setImportError(null);
    viewer.attachTo(viewerRef.current);
    const eventBus = viewer.get('eventBus') as {
      on: (event: string, listener: (event: any) => void) => void;
      off: (event: string, listener: (event: any) => void) => void;
    };
    let clickListenerAttached = false;
    const onElementClick = (event: any) => {
      const element = event?.element;
      if (!element?.id || typeof element.type !== 'string') return;
      const isSelectableElement =
        element.type === 'bpmn:Lane' ||
        element.type === 'bpmn:Participant' ||
        element.type === 'bpmn:Task' ||
        element.type.endsWith('Task') ||
        element.type === 'bpmn:CallActivity' ||
        element.type === 'bpmn:SubProcess' ||
        element.type === 'bpmn:Transaction';
      if (isSelectableElement) onElementSelectRef.current?.(element.id);
    };

    viewer.importXML(xmlContent)
      .then(() => {
        if (cancelled) return;
        // Register selection only after the diagram import has completed. This
        // avoids a stale click handler when returning to the viewer after editing.
        eventBus.on('element.click', onElementClick);
        clickListenerAttached = true;
        fitDiagramToWidth();
        importedRef.current = true;
        // Keep the minimap closed on import; users can open it manually from the viewer controls.
        applySelectionRef.current();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        importedRef.current = false;
        highlightedIdRef.current = null;
        viewer.clear();
        setImportError(
          error instanceof Error
            ? `Le diagramme BPMN ne peut pas être affiché : ${error.message}`
            : 'Le diagramme BPMN ne peut pas être affiché : erreur lors de son import.',
        );
      });

    return () => {
      cancelled = true;
      if (clickListenerAttached) eventBus.off('element.click', onElementClick);
    };
  }, [xmlContent, resourceId, contentId, viewer]);

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
    minimapVisible,
    setMinimapVisible,
    zoomIn,
    zoomOut,
    resetZoom,
    fitDiagram,
  };
};
