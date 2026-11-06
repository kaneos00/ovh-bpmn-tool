import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/joy';
import { useProcessViewer } from './hooks/useProcessViewer';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import '../Modeler/Modeler.css';

type ProcessViewerProps = {
  resourceId: string;
  contentId: string;
  selectedElementId?: string | null;
  onElementSelect?: (elementId: string) => void;
  onToggleInfoPanel?: () => void;
  infoPanelOpen?: boolean;
  toolbarExtra?: ReactNode;
  fullscreenTargetRef?: React.RefObject<HTMLElement>;
};

export const ProcessViewer = ({
  resourceId,
  contentId,
  selectedElementId,
  onElementSelect,
  onToggleInfoPanel,
  infoPanelOpen = false,
  toolbarExtra,
  fullscreenTargetRef,
}: ProcessViewerProps) => {
  const viewerShellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => {
      const target = fullscreenTargetRef?.current ?? viewerShellRef.current;
      const active = document.fullscreenElement === target;
      setIsFullscreen(active);
      if (active) window.requestAnimationFrame(resizeDiagram);
    };
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, [fullscreenTargetRef, resizeDiagram]);

  const toggleFullscreen = async () => {
    const target = fullscreenTargetRef?.current ?? viewerShellRef.current;
    if (!target) return;
    if (document.fullscreenElement === target) {
      await document.exitFullscreen();
    } else {
      await target.requestFullscreen();
    }
  };

  const {
    viewerRef,
    importError,
    isLoading,
    minimapVisible,
    setMinimapVisible,
    zoomIn,
    zoomOut,
    resetZoom,
    fitDiagram,
    resizeDiagram,
  } = useProcessViewer(
    resourceId,
    contentId,
    selectedElementId,
    onElementSelect,
  );

  return (
    <Box className={`process-viewer-shell${isFullscreen ? ' is-fullscreen' : ''}`} ref={viewerShellRef}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        className="process-viewer-toolbar"
        aria-label="Contrôles du diagramme BPMN"
      >
        <Typography level="body-xs" textColor="neutral">
          Navigation du diagramme
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {onToggleInfoPanel && (
            <Button size="sm" variant={infoPanelOpen ? 'soft' : 'outlined'} color="neutral" onClick={onToggleInfoPanel} aria-label={infoPanelOpen ? 'Masquer les informations' : 'Afficher les informations'} title={infoPanelOpen ? 'Masquer les informations' : 'Afficher les informations'}>Infos</Button>
          )}
          <Button size="sm" variant="outlined" color="neutral" onClick={zoomOut} aria-label="Zoom arrière" title="Zoom arrière">−</Button>
          <Button size="sm" variant="outlined" color="neutral" onClick={zoomIn} aria-label="Zoom avant" title="Zoom avant">+</Button>
          <Button size="sm" variant="soft" color="neutral" onClick={resetZoom} aria-label="Zoom 1:1" title="Afficher à l’échelle 1:1">1:1</Button>
          <Button size="sm" variant={minimapVisible ? 'soft' : 'plain'} color="neutral" onClick={() => setMinimapVisible(!minimapVisible)} aria-label={minimapVisible ? 'Masquer la mini-carte' : 'Afficher la mini-carte'} title={minimapVisible ? 'Masquer la mini-carte' : 'Afficher la mini-carte'}>Mini-carte</Button>
          <Button size="sm" variant="plain" color="neutral" onClick={fitDiagram} aria-label="Ajuster à la fenêtre" title="Ajuster le diagramme à la fenêtre">Ajuster</Button>
          <Button size="sm" variant={isFullscreen ? 'soft' : 'outlined'} color="neutral" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Quitter le plein écran' : 'Afficher le BPMN en plein écran'} title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Afficher le BPMN en plein écran'}>{isFullscreen ? 'Quitter plein écran' : 'Plein écran'}</Button>
          {toolbarExtra}
        </Stack>
      </Stack>
      <Box className="processViewerDiagramContent">
        {importError && (
          <Alert color="danger" variant="soft" sx={{ m: 1 }}>
            {importError}
          </Alert>
        )}
        <Box
          className={`process-viewer-canvas ${minimapVisible ? 'has-minimap' : 'minimap-not-needed'}`}
          ref={viewerRef}
        />
        {isLoading && !importError && (
          <Box className="process-viewer-loading" role="status" aria-live="polite">
            Chargement du diagramme…
          </Box>
        )}
      </Box>
    </Box>
  );
};
