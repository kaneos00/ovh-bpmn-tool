import React from 'react';
import { useProcessViewer } from './hooks/useProcessViewer';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import '../Modeler/Modeler.css';

type ProcessViewerProps = {
  resourceId: string;
  contentId: string;
  selectedElementId?: string | null;
};

export const ProcessViewer = ({
  resourceId,
  contentId,
  selectedElementId,
}: ProcessViewerProps) => {
  const { viewerRef } = useProcessViewer(resourceId, contentId, selectedElementId);

  return <div ref={viewerRef} style={{ height: '100%' }} />;
};
