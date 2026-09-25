import React from 'react';
import { useProcessViewer } from './hooks/useProcessViewer';

type ProcessViewerProps = {
  resourceId: string;
  contentId: string;
};

export const ProcessViewer = ({
  resourceId,
  contentId,
}: ProcessViewerProps) => {
  const { viewerRef, viewer } = useProcessViewer(resourceId, contentId);

  const zoom = (factor: number) => {
    const current = viewer.get('canvas').zoom();
    const rect = viewerRef.current?.getBoundingClientRect();

    viewer.get('canvas').zoom(current * factor, {
      x: (rect?.width ?? 0) / 2,
      y: (rect?.height ?? 0) / 2,
    });
  };

  const resetZoom = () => viewer.get('canvas').zoom(1);
  const fitViewport = () => viewer.get('canvas').zoom('fit-viewport');

  return (
    <div
      ref={viewerRef}
      style={{ height: '100%', position: 'relative' }}
    >
      <div
        className="bpmn-tool-navigation-controls"
        aria-label="Navigation du diagramme"
      >
        <button type="button" className="bpmn-tool-navigation-button" onClick={() => zoom(1.2)} title="Zoom avant">+</button>
        <button type="button" className="bpmn-tool-navigation-button" onClick={() => zoom(1 / 1.2)} title="Zoom arrière">−</button>
        <button type="button" className="bpmn-tool-navigation-button" onClick={resetZoom} title="Réinitialiser le zoom">1:1</button>
        <button type="button" className="bpmn-tool-navigation-button" onClick={fitViewport} title="Ajuster le diagramme à la fenêtre">⛶</button>
      </div>
    </div>
  );
};
