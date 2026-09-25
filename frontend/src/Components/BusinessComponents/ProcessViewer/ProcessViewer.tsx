import React from 'react';
import { useProcessViewer } from './hooks/useProcessViewer';
import '../Modeler/Modeler.css';

type ProcessViewerProps = {
  resourceId: string;
  contentId: string;
};

export const ProcessViewer = ({
  resourceId,
  contentId,
}: ProcessViewerProps) => {
  const { viewerRef, viewer } = useProcessViewer(resourceId, contentId);
  const canvas = viewer.get('canvas') as {
    zoom: (level?: number | string, center?: { x: number; y: number }) => number;
  };

  const zoom = (factor: number) => {
    const current = canvas.zoom();
    const rect = viewerRef.current?.getBoundingClientRect();

    canvas.zoom(current * factor, {
      x: (rect?.width ?? 0) / 2,
      y: (rect?.height ?? 0) / 2,
    });
  };

  const resetZoom = () => canvas.zoom(1);
  const fitViewport = () => canvas.zoom('fit-viewport');

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
