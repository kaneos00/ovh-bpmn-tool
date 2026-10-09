import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useModelerInstance } from '../../../../shared/hooks/useModelerInstance';

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

  selectedIdRef.current = selectedElementId;

  const { data: xmlContent } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const viewer = useMemo(() => getViewerInstance(), []);

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

    // Center the selected BPMN element in the current viewport without
    // changing the user's zoom level.
    const bounds = canvas.getAbsoluteBBox(element);
    const viewport = canvas.viewbox();
    if (bounds && viewport) {
      canvas.viewbox({
        x: bounds.x + bounds.width / 2 - viewport.width / 2,
        y: bounds.y + bounds.height / 2 - viewport.height / 2,
        width: viewport.width,
        height: viewport.height,
      });
    }
  };

  const applySelectionRef = useRef(applySelection);
  applySelectionRef.current = applySelection;

  useEffect(() => {
    if (!viewerRef.current || !xmlContent) {
      importedRef.current = false;
      highlightedIdRef.current = null;
      viewer.clear();
      return;
    }

    importedRef.current = false;
    viewer.attachTo(viewerRef.current);

    // Attach the viewer before importing so its interaction and selection
    // services are active when import.done is emitted.
    viewer.importXML(xmlContent).then(() => {
      (viewer.get('canvas') as any).zoom('fit-viewport');
      importedRef.current = true;
      applySelectionRef.current();
    });
  }, [xmlContent, resourceId, contentId, viewer]);

  useEffect(() => {
    applySelectionRef.current();
  }, [selectedElementId]);

  return {
    viewerRef,
    content: xmlContent ?? '',
  };
};
