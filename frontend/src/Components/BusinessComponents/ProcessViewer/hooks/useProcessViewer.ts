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

  const viewer = useMemo(() => {
    const instance = getViewerInstance();

    const getServiceStatus = (name: string) => {
      try {
        return !!instance.get(name);
      } catch {
        return false;
      }
    };

    console.debug('[ProcessViewer][DIAGNOSTIC] Viewer créé', {
      selection: getServiceStatus('selection'),
      interactionEvents: getServiceStatus('interactionEvents'),
      outline: getServiceStatus('outline'),
      canvas: getServiceStatus('canvas'),
      overlays: getServiceStatus('overlays'),
    });

    return instance;
  }, []);

  useEffect(() => {
    if (!viewerRef.current || !xmlContent) {
      viewer.clear();
    } else {
      viewer.importXML(xmlContent).then(() => {
        console.debug('[ProcessViewer][DIAGNOSTIC] importXML terminé', {
          elementCount: viewer.get('elementRegistry').getAll().length,
          selection: viewer.get('selection').get().map((element: any) => element.id),
        });

        viewer.attachTo(viewerRef.current as HTMLDivElement);

        console.debug('[ProcessViewer][DIAGNOSTIC] Viewer attachTo terminé');

        // @ts-ignore
        viewer.get('canvas').zoom('fit-viewport');
      }).catch((error) => {
        console.error('[ProcessViewer][DIAGNOSTIC] importXML échoué', error);
      });
    }
  }, [xmlContent, resourceId, contentId, viewer]);

  return {
    viewerRef,
    content: xmlContent ?? '',
  };
};
