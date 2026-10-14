import React from 'react';
import { Alert, Box } from '@mui/joy';
import { useProcessViewer } from './hooks/useProcessViewer';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import '../Modeler/Modeler.css';

type ProcessViewerProps = {
  resourceId: string;
  contentId: string;
  selectedElementId?: string | null;
  onElementSelect?: (elementId: string) => void;
};

export const ProcessViewer = ({
  resourceId,
  contentId,
  selectedElementId,
  onElementSelect,
}: ProcessViewerProps) => {
  const { viewerRef, importError } = useProcessViewer(
    resourceId,
    contentId,
    selectedElementId,
    onElementSelect,
  );

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {importError && (
        <Alert color="danger" variant="soft" sx={{ m: 1 }}>
          {importError}
        </Alert>
      )}
      <Box ref={viewerRef} sx={{ flex: 1, minHeight: 0 }} />
    </Box>
  );
};
