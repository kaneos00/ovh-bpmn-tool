import React from 'react';
import { Box, Button, Chip, IconButton, Sheet, Stack, Typography } from '@mui/joy';
import { ArrowBack, ArrowForward, ChevronLeft, ChevronRight, FolderOutlined } from '@mui/icons-material';

import { FolderTree } from '../FolderTree';
import { getProjectTrigram } from '../../../shared/helpers/projectTrigram';

import './ViewerPanel.css';

type Props = {
  selectedId: string;
  onNodeClick: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  variant: 'process-details' | 'projects-overview';
  projects?: Array<{ id: string; name: string; color: string; processes: Array<{ resourceId: string }> }>;
  activeProjectId?: string | null;
  onProjectSelect?: (projectId: string) => void;
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
  projects = [],
  activeProjectId = null,
  onProjectSelect,
  showHistory = false,
  onBack,
  onForward,
}: Props) => {
  const isProjectList = variant === 'projects-overview';
  const panelClass = `processExplorerPanel ${collapsed ? 'collapsed' : ''}`;
  const headerClass = 'viewerPanelHeader processExplorerPanelHeader';
  const contentClass = 'processExplorerPanelContent';
  const toggleIcon = collapsed ? <ChevronRight /> : <ChevronLeft />;

  return (
    <Sheet className={panelClass} variant="outlined">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={collapsed ? 'center' : 'space-between'}
        className={headerClass}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={event => {
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
            <Typography level="title-sm">{isProjectList ? 'Projets' : 'Explorateur'}</Typography>
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
          <Box className={contentClass}>
            {isProjectList ? (
              <Stack spacing={0.5} sx={{ p: 1 }}>
                {projects.map(project => (
                  <Button
                    key={project.id}
                    variant={activeProjectId === project.id ? 'soft' : 'plain'}
                    color={activeProjectId === project.id ? 'primary' : 'neutral'}
                    onClick={() => onProjectSelect?.(project.id)}
                    sx={{ minWidth: 0, justifyContent: 'flex-start', gap: 1, px: 1, py: 0.75, textAlign: 'left' }}
                  >
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 24, px: 0.5, borderRadius: '6px', bgcolor: project.color || '#2864d7', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
                      {getProjectTrigram(project.name)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.name}
                    </Box>
                    <Chip size="sm" variant="outlined">{project.processes.length}</Chip>
                  </Button>
                ))}
                {projects.length === 0 && (
                  <Typography level="body-sm" color="neutral" sx={{ px: 1, py: 2 }}>
                    Aucun projet accessible.
                  </Typography>
                )}
              </Stack>
            ) : (
              <FolderTree selectedId={selectedId} onNodeClick={onNodeClick} />
            )}
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
