import React from 'react';
import { Box, Button, Divider, IconButton, Sheet, Stack, Typography } from '@mui/joy';
import { ArrowBack, ArrowForward, ChevronLeft, ChevronRight, FolderOutlined, Menu as MenuIcon } from '@mui/icons-material';

import { FolderTree } from '../FolderTree';

type Props = {
  selectedId: string;
  onNodeClick: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  variant: 'process-details' | 'content-viewer';
  showHistory?: boolean;
  onBack?: () => void;
  onForward?: () => void;
};

export const ViewerExplorerPanel = ({
  selectedId,
  onNodeClick,
  collapsed,
  onToggle,
  variant,
  showHistory = false,
  onBack,
  onForward,
}: Props) => {
  const isContentViewer = variant === 'content-viewer';
  const panelClass = isContentViewer
    ? `processTaskPanel viewerFolderPanel ${collapsed ? 'collapsed' : 'open'}`
    : `processExplorerPanel ${collapsed ? 'collapsed' : ''}`;
  const headerClass = isContentViewer ? 'viewerFolderHeader' : 'processExplorerPanelHeader';
  const contentClass = isContentViewer ? 'viewerFolderTree' : 'processExplorerPanelContent';
  const toggleIcon = collapsed
    ? (isContentViewer ? <MenuIcon /> : <ChevronRight />)
    : <ChevronLeft />;

  return (
    <Sheet className={panelClass} variant="outlined">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={collapsed ? 'center' : 'space-between'}
        className={headerClass}
        onClick={isContentViewer ? undefined : onToggle}
        role={isContentViewer ? undefined : 'button'}
        tabIndex={isContentViewer ? undefined : 0}
        onKeyDown={isContentViewer ? undefined : event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        {!collapsed && (
          <Stack direction="row" spacing={1} alignItems="center">
            <FolderOutlined fontSize="small" />
            <Typography level={isContentViewer ? 'title-md' : 'title-sm'}>Explorateur</Typography>
          </Stack>
        )}
        <IconButton
          size="sm"
          variant="plain"
          color="neutral"
          onClick={event => {
            event.stopPropagation();
            onToggle();
          }}
          aria-label={collapsed ? 'Développer le panneau de navigation' : 'Replier le panneau de navigation'}
          title={collapsed ? 'Développer la navigation' : 'Réduire la navigation'}
        >
          {toggleIcon}
        </IconButton>
      </Stack>
      {!collapsed && (
        <>
          {isContentViewer && <Divider />}
          <Box className={contentClass}>
            <FolderTree selectedId={selectedId} onNodeClick={onNodeClick} />
          </Box>
          {showHistory && (
            <Stack direction="row" spacing={0.75} className="processExplorerHistory" alignItems="stretch">
              <Button
                size="sm"
                fullWidth
                variant="outlined"
                color="neutral"
                title="Retour"
                aria-label="Retour"
                onClick={() => (onBack ?? (() => window.history.back()))()}
                startDecorator={<ArrowBack />}
                sx={{ flex: 1, minWidth: 0 }}
              >
                Retour
              </Button>
              <Button
                size="sm"
                fullWidth
                variant="outlined"
                color="neutral"
                title="Suivant"
                aria-label="Suivant"
                onClick={() => (onForward ?? (() => window.history.forward()))()}
                startDecorator={<ArrowForward />}
                sx={{ flex: 1, minWidth: 0 }}
              >
                Suivant
              </Button>
            </Stack>
          )}
        </>
      )}
    </Sheet>
  );
};
