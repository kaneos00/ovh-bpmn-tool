import { useSearchParams } from 'react-router-dom';

/**
 * Reads the URL state shared by both Viewer entry points.
 * Keep route parameters in one place while the legacy ContentViewer and the
 * ProcessDetails shell are migrated incrementally.
 */
export const useViewerRouteState = () => {
  const [searchParams] = useSearchParams();

  return {
    requestedElementId: searchParams.get('elementId'),
    requestedContentId: searchParams.get('contentId'),
    requestedRaciView: searchParams.get('raci') === '1',
  };
};
