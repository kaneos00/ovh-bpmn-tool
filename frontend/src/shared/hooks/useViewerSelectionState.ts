import { useEffect, useState } from 'react';

/**
 * Keeps BPMN selection synchronized with route changes in both Viewer shells.
 * A process/version change restores the URL selection (or clears stale state),
 * while ordinary canvas selections remain local until the route changes.
 */
export const useViewerSelectionState = (
  resourceId: string,
  contentId: string | null | undefined,
  requestedElementId: string | null,
) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    requestedElementId,
  );

  useEffect(() => {
    setSelectedElementId(requestedElementId);
  }, [resourceId, contentId, requestedElementId]);

  return { selectedElementId, setSelectedElementId };
};
