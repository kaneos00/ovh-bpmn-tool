import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useModelerInstance } from '../../../../shared/hooks/useModelerInstance';
import { useCallActivityNavigation } from '../../../../shared/hooks/useCallActivityNavigation';

export const useProcessViewer = (
  resourceId: string,
  contentId: string,
  selectedElementId?: string | null,
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

  const applySelection = () => {
    if (!importedRef.current) return;

    const canvas = viewer.get('canvas') as any;
    const previousId = highlightedIdRef.current;
    if (previousId) canvas.removeMarker(previousId, 'raci-selected');
    highlightedIdRef.current = null;

    const targetId = selectedIdRef.current;
    if (!targetId) return;

    const element = (viewer.get('elementRegistry') as any).get(targetId);
    if (!element) return;

    canvas.addMarker(targetId, 'raci-selected');
    highlightedIdRef.current = targetId;

    const bounds = canvas.getAbsoluteBBox(element);
    const viewport = canvas.viewbox();
    if (!bounds || !viewport) return;

    // Focus the inside of an expanded subprocess when it is selected from
    // the hierarchy. For ordinary activities, preserve the current zoom.
    if (element.type === 'bpmn:SubProcess' && element.isExpanded !== false) {
      const padding = 32;
      canvas.viewbox({
        x: bounds.x - padding,
        y: bounds.y - padding,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      });
      return;
    }

    canvas.viewbox({
      x: bounds.x + bounds.width / 2 - viewport.width / 2,
      y: bounds.y + bounds.height / 2 - viewport.height / 2,
      width: viewport.width,
      height: viewport.height,
    });
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
        (viewer.get('canvas') as any).zoom('fit-viewport');
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
