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
    /*
      ANCIENNE CONFIGURATION — conservée pour comparaison / retour arrière
      if (!viewerRef.current || !xmlContent) {
        viewer.clear();
      } else {
        viewer.importXML(xmlContent).then(() => {
          viewer.attachTo(viewerRef.current as HTMLDivElement);
          // @ts-ignore
          viewer.get('canvas').zoom('fit-viewport');
        });
      }
    */

    if (!viewerRef.current || !xmlContent) {
      viewer.clear();
      return;
    }

    viewer.importXML(xmlContent).then(() => {
      viewer.attachTo(viewerRef.current as HTMLDivElement);

      // Force l'ouverture de la minimap après l'attachement du viewer.
      try {
        // @ts-ignore
        viewer.get('minimap').open();
      } catch {
        // La minimap peut ne pas être disponible selon la configuration du viewer.
      }

      // @ts-ignore
      viewer.get('canvas').zoom('fit-viewport');
    });

    return () => {
      viewer.destroy();
    };
  }, [xmlContent, resourceId, contentId, viewer]);

  return {
    viewerRef,
    content: xmlContent ?? '',
  };
};
