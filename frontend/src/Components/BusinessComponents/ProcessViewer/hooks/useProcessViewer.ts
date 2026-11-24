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
    let active = true;

    if (!viewerRef.current || !xmlContent) {
      viewer.clear();
      return () => {
        active = false;
      };
    }

    viewer
      .importXML(xmlContent)
      .then(() => {
        if (!active || !viewerRef.current) {
          return;
        }

        viewer.attachTo(viewerRef.current);
        // @ts-ignore
        viewer.get('canvas').zoom('fit-viewport');
      })
      .catch(() => {
        // Import failures are handled by the surrounding page; avoid an
        // unhandled rejection when the viewer unmounts or content changes.
      });

    return () => {
      active = false;
    };
  }, [xmlContent, resourceId, contentId, viewer]);

  useEffect(() => {
    return () => {
      viewer.destroy();
    };
  }, [viewer]);

  return {
    viewerRef,
    content: xmlContent ?? '',
  };
};
