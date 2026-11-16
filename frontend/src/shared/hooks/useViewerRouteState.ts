import { useSearchParams } from 'react-router-dom';

/**
 * Reads URL state for the canonical process viewer.
 * Legacy content-viewer URLs are redirected here by the route compatibility
 * loader, preserving the same deep-link parameters.
 */
export const useViewerRouteState = () => {
  const [searchParams] = useSearchParams();

  return {
    requestedElementId: searchParams.get('elementId'),
    requestedContentId: searchParams.get('contentId'),
    requestedRaciView: searchParams.get('raci') === '1',
  };
};
