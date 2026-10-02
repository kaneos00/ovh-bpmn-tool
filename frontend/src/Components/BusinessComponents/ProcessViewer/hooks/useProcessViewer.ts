import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from 'react-query';

import { getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { useModelerInstance } from '../../../../shared/hooks/useModelerInstance';

export const useProcessViewer = (resourceId: string, contentId: string) => {
  const { getViewerInstance } = useModelerInstance();
  const viewerRef = useRef<HTMLDivElement>(null);

  const { data: xmlContent } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const viewer = useMemo(() => getViewerInstance(), []);

  useEffect(() => {
    if (!viewerRef.current || !xmlContent) {
      viewer.clear();
    } else {
      // Le Viewer doit être attaché avant l'import afin que les services
      // d'interaction et de sélection soient actifs lorsque import.done est
      // émis. La recherche peut ainsi sélectionner immédiatement sa cible.
      viewer.attachTo(viewerRef.current as HTMLDivElement);

      viewer.importXML(xmlContent).then(() => {
        // @ts-ignore
        viewer.get('canvas').zoom('fit-viewport');
      });
    }
  }, [xmlContent, resourceId, contentId, viewer]);

  return {
    viewerRef,
    content: xmlContent ?? '',
  };
};
