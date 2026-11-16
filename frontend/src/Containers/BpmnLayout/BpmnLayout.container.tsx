import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Box, Chip, Sheet, Stack } from '@mui/joy';

import { ProcessDetails } from '../../Components/BusinessComponents/ProcessDetails';

import { useBpmnLayout } from './hooks/useBpmnLayout';
import { useBpmnLayoutBreadcrumbs } from './hooks/useBpmnLayoutBreadcrumbs';
import { Header } from '../../Components/GenericComponents/Header/Header';
import { WorkspacePageHeader } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ViewerExplorerPanel } from '../../Components/BusinessComponents/ViewerExplorerPanel/ViewerExplorerPanel';
import { FolderOverview } from './FolderOverview';
import {
  BpmnContentLoading,
  BusinessProcessActions,
  FolderActions,
} from './components';
import { isFolder, isRoot } from '../../shared/helpers/resource';

import type { BpmnLayoutRouteParams } from '.';
import { ResourceType } from '../../shared/types/BpmnResource';
import { useViewerRouteState } from '../../shared/hooks/useViewerRouteState';
import { useViewerSelectionState } from '../../shared/hooks/useViewerSelectionState';
import { useActiveProject } from '../../shared/hooks/useActiveProject';

import './BpmnLayoutContainer.scss';

export const Component = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const { requestedElementId, requestedContentId, requestedRaciView } = useViewerRouteState();
  const navigate = useNavigate();
  const [sessionRole, setSessionRole] = useState<'admin' | 'modeler' | 'viewer' | null>(null);

  useEffect(() => {
    let mounted = true;
    const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    fetch(`${apiBase}/auth/session`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then(async response => response.ok ? response.json() as Promise<{ role?: 'admin' | 'modeler' | 'viewer' }> : null)
      .then(session => { if (mounted) setSessionRole(session?.role ?? null); })
      .catch(() => { if (mounted) setSessionRole(null); });
    return () => { mounted = false; };
  }, []);
  const [folderExplorerWidth, setFolderExplorerWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('bpmn-viewer-explorer-width'));
    return Number.isFinite(saved) && saved >= 180 && saved <= 480 ? saved : 248;
  });
  const folderResizeCleanupRef = useRef<(() => void) | null>(null);
  const [folderExplorerCollapsed, setFolderExplorerCollapsed] = useState(false);

  useEffect(() => {
    window.localStorage.setItem('bpmn-viewer-explorer-width', String(folderExplorerWidth));
  }, [folderExplorerWidth]);

  useEffect(() => () => folderResizeCleanupRef.current?.(), []);

  const startFolderExplorerResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    folderResizeCleanupRef.current?.();
    const startX = event.clientX;
    const startWidth = folderExplorerWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      setFolderExplorerWidth(Math.min(480, Math.max(180, startWidth + moveEvent.clientX - startX)));
    };
    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', cleanup);
      folderResizeCleanupRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', cleanup);
    folderResizeCleanupRef.current = cleanup;
  };

  const { selectedElementId, setSelectedElementId } = useViewerSelectionState(
    resourceId,
    requestedContentId,
    requestedElementId,
  );

  const { resource, callbacks } = useBpmnLayout();
  const { projects, activeProject, activeProjectId, setActiveProject, isLoading: projectsLoading } = useActiveProject();
  const activeProcess = activeProject?.processes.find(process => process.resourceId === resourceId);
  let processUsageLabel: string | undefined;
  switch (activeProcess?.usage) {
    case 'common':
      processUsageLabel = 'Commun';
      break;
    case 'variant':
      processUsageLabel = 'Variante';
      break;
    case 'project-specific':
      processUsageLabel = 'Spécifique';
      break;
    default:
      processUsageLabel = undefined;
  }

  useEffect(() => {
    if (projectsLoading || !resourceId || isRoot(resourceId)) return;
    const matchingProjects = projects.filter(project =>
      project.processes.some(process => process.resourceId === resourceId),
    );

    // Keep the explorer context aligned with the process currently opened,
    // including when navigation crosses from one project to another.
    if (matchingProjects.length === 1) {
      if (matchingProjects[0].id !== activeProjectId) {
        setActiveProject(matchingProjects[0].id);
      }
      return;
    }

    // A process shared by several projects needs an explicit project context.
    // Do not keep showing an unrelated project's tree after cross-project navigation.
    if (
      matchingProjects.length > 1 &&
      activeProjectId &&
      !matchingProjects.some(project => project.id === activeProjectId)
    ) {
      setActiveProject(null);
    }
  }, [activeProjectId, projectsLoading, projects, resourceId, setActiveProject]);
  const { getBreadCrumbs } = useBpmnLayoutBreadcrumbs();

  let headerDescription: string | null | undefined;
  if (resource?.type === ResourceType.Process) {
    headerDescription = undefined;
  } else if (isRoot(resourceId)) {
    headerDescription = activeProject?.description ?? 'Sélectionnez un projet pour afficher son espace de travail.';
  } else {
    headerDescription = resource?.description;
  }

  const canCreateFolder = Boolean(
    activeProjectId && (sessionRole === 'admin' || sessionRole === 'modeler'),
  );
  const canCreateProcess = Boolean(
    activeProjectId &&
    (
      sessionRole === 'admin' ||
      (sessionRole === 'modeler' && (
        activeProject?.role === 'admin' || activeProject?.role === 'modeler'
      ))
    ),
  );

  const actions = useMemo(() => {
    const isRootFolder = isRoot(resourceId);

    if (isRootFolder || resource?.type === ResourceType.Folder) {
      return (
        <FolderActions
          projectId={activeProjectId}
          canCreateFolder={canCreateFolder}
          canCreateProcess={canCreateProcess}
        />
      );
    }

    if (!resource) {
      return <></>;
    }

    // The modeler entry point is reserved for authenticated editing roles.
    return sessionRole === 'admin' || sessionRole === 'modeler' ? (
      <BusinessProcessActions
        onModelerBtnClick={callbacks.header.onModelerBtnClick}
      />
    ) : <></>;
  }, [
    resourceId,
    resource,
    sessionRole,
    activeProjectId,
    canCreateFolder,
    canCreateProcess,
    callbacks.header.onModelerBtnClick,
  ]);

  return (
    <div
      className="mainContainer processViewerActive"
    >
      <Sheet className="innerContent">
        {resource ? (
          <>
            <WorkspacePageHeader />
                          <Header
                            title={isRoot(resourceId) ? (activeProject?.name ?? 'Référentiel') : resource.name}
                            description={headerDescription}
                            titleAdornment={resource.type === ResourceType.Process ? (
                              <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                                <Chip size="sm" variant="soft" color="primary">Opérationnel</Chip>
                                {processUsageLabel && <Chip size="sm" variant="soft" color="neutral">{processUsageLabel}</Chip>}
                              </Stack>
                            ) : undefined}
                            breadcrumbs={getBreadCrumbs()}
                            actions={
                              <Stack direction="row" spacing={1} alignItems="center">
                                {actions}
                              </Stack>
                            }
                          />
                          {isFolder(resource) ? (
                            <Box className="processViewerLayout" aria-label="Espace du dossier">
                              <Box className="processViewerWorkspace" style={{ "--explorer-width": `${folderExplorerWidth}px` } as React.CSSProperties}>
                                <ViewerExplorerPanel
                                  variant="process-details"
                                  selectedId={resourceId}
                                  onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
                                  collapsed={folderExplorerCollapsed}
                                  onToggle={() => setFolderExplorerCollapsed(value => !value)}
                                  showHistory
                                  onBack={() => navigate(-1)}
                                  onForward={() => navigate(1)}
                                />
                                {!folderExplorerCollapsed && (
                                  <Box
                                    className="processViewerResizeHandle"
                                    role="separator"
                                    aria-label="Redimensionner le panneau explorateur"
                                    title="Glisser pour régler la largeur de l’explorateur"
                                    onMouseDown={startFolderExplorerResize}
                                  />
                                )}
                                <Sheet className="processViewerDiagram folderViewerEmptyState" variant="outlined">
                                  <FolderOverview resource={resource} />
                                </Sheet>
                              </Box>
                            </Box>
                          ) : (
                            <ProcessDetails
                              key={resourceId}
                              resourceId={resourceId}
                              onContentUpload={callbacks.processDetails.onContentUpload}
                              onContentPublish={callbacks.processDetails.onContentPublish}
                              onContentErase={callbacks.processDetails.onContentErase}
                              onContentClone={callbacks.processDetails.onContentClone}
                              onContentViewerLinkCopy={
                                callbacks.processDetails.onContentViewerLinkCopy
                              }
                              onModelerClick={callbacks.header.onModelerBtnClick}
                              onCompareClick={callbacks.processDetails.onCompareClick}
                              selectedElementId={selectedElementId}
                              onElementSelect={setSelectedElementId}
                              selectedContentId={requestedContentId}
                              requestedRaciView={requestedRaciView}
                              readOnlyShell
                            />
                          )}
            <Outlet />
          </>
        ) : (
          <BpmnContentLoading />
        )}
      </Sheet>
    </div>
  );
};

Component.displayName = 'BpmnLayoutContainer';
