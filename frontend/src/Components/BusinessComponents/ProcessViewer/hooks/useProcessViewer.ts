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
      console.log('[ProcessViewer] importXML start');
      viewer.importXML(xmlContent).then(() => {
        console.log('[ProcessViewer] importXML resolved');
        console.log('[ProcessViewer] before attachTo', viewerRef.current);
        viewer.attachTo(viewerRef.current as HTMLDivElement);
        console.log('[ProcessViewer] after attachTo', viewerRef.current);
        // @ts-ignore
        viewer.get('canvas').zoom('fit-viewport');

        // The BPMN module is initialized before the React Viewer is attached
        // to the DOM. Notify modules once the real Viewer container exists.
        // Notify the search UI only after React has attached the Viewer to
        // its real DOM container. This is intentionally a browser event:
        // the bpmn-js event bus is initialized before React mounts the Viewer.
        window.dispatchEvent(
          new CustomEvent('bpmn-viewer-attached', {
            detail: viewer,
          }),
        );
        console.log('[ProcessViewer] bpmn-viewer-attached dispatched');
      }).catch((error) => {
        console.error('[ProcessViewer] importXML failed', error);
      });
      });
    }
  }, [xmlContent, resourceId, contentId, viewer]);

  return {
    viewerRef,
    content: xmlContent ?? '',
  };
};
