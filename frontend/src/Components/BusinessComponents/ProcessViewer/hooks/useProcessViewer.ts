import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useModelerInstance } from '../../../../shared/hooks/useModelerInstance';
import { useCallActivityNavigation } from '../../../../shared/hooks/useCallActivityNavigation';

export const useProcessViewer = (
  resourceId: string,
  contentId: string,
  selectedElementId?: string | null,
  onElementSelect?: (elementId: string) => void,
) => {
  const { getViewerInstance } = useModelerInstance();
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null | undefined>(selectedElementId);
  const importedRef = useRef(false);
  const highlightedIdRef = useRef<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  selectedIdRef.current = selectedElementId;

  const { data: xmlContent } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const viewer = useMemo(() => getViewerInstance(), []);
  useCallActivityNavigation(viewer, true);

  useEffect(() => {
    if (!onElementSelect) return undefined;

    const eventBus = viewer.get('eventBus') as {
      on: (event: string, listener: (event: any) => void) => void;
      off: (event: string, listener: (event: any) => void) => void;
    };
    const onElementClick = (event: any) => {
      const element = event?.element;
      if (!element?.id || typeof element.type !== 'string') return;

      const isSelectableActivity =
        element.type === 'bpmn:Task' ||
        element.type.endsWith('Task') ||
        element.type === 'bpmn:CallActivity' ||
        element.type === 'bpmn:SubProcess' ||
        element.type === 'bpmn:Transaction';

      if (isSelectableActivity) onElementSelect(element.id);
    };

    eventBus.on('element.click', onElementClick);
    return () => eventBus.off('element.click', onElementClick);
  }, [viewer, onElementSelect]);

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

    const padding = 20;
    const minX = Math.min(...bounds.map((bbox: any) => bbox.x));
    const minY = Math.min(...bounds.map((bbox: any) => bbox.y));

    // Keep the fitted zoom level, but anchor the diagram at the viewport's
    // upper-left instead of centering it in the available space.
    canvas.viewbox({
      x: minX - padding,
      y: minY - padding,
      width: viewport.width,
      height: viewport.height,
    });
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

    // Selection only changes the highlight. It must not pan or zoom the
    // diagram, so the user's visual reference remains stable.
  };

  const applySelectionRef = useRef(applySelection);
  applySelectionRef.current = applySelection;

  useEffect(() => {
    let cancelled = false;

    if (!viewerRef.current || !xmlContent) {
      importedRef.current = false;
      highlightedIdRef.current = null;
      setImportError(null);
      viewer.clear();
      return () => {
        cancelled = true;
      };
    }

    importedRef.current = false;
    setImportError(null);
    viewer.attachTo(viewerRef.current);

    // Attach the viewer before importing so its interaction and selection
    // services are active when import.done is emitted.
    viewer.importXML(xmlContent)
      .then(() => {
        if (cancelled) return;
        const canvas = viewer.get('canvas') as any;
        canvas.zoom('fit-viewport');
        alignDiagramTopLeft();
        importedRef.current = true;
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
    };
  }, [xmlContent, resourceId, contentId, viewer]);

  useEffect(() => {
    applySelectionRef.current();
  }, [selectedElementId]);

  return {
    viewerRef,
    content: xmlContent ?? '',
    importError,
  };
};
