import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Box, Sheet, Stack } from '@mui/joy';

import { ProcessDetails } from '../../Components/BusinessComponents/ProcessDetails';

import { useBpmnLayout } from './hooks/useBpmnLayout';
import { useBpmnLayoutBreadcrumbs } from './hooks/useBpmnLayoutBreadcrumbs';
import { Header } from '../../Components/GenericComponents/Header/Header';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
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

  const { resource, contents, callbacks } = useBpmnLayout();
  const { projects, activeProjectId, setActiveProject, isLoading: projectsLoading } = useActiveProject();

  useEffect(() => {
    if (activeProjectId || projectsLoading || !resourceId) return;
    const matchingProjects = projects.filter(project =>
      project.processes.some(process => process.resourceId === resourceId),
    );
    if (matchingProjects.length === 1) setActiveProject(matchingProjects[0].id);
  }, [activeProjectId, projectsLoading, projects, resourceId, setActiveProject]);
  const { getBreadCrumbs } = useBpmnLayoutBreadcrumbs();

  const actions = useMemo(() => {
    const isRootFolder = isRoot(resourceId);

    if (isRootFolder) {
      return <FolderActions />;
    }

    if (!resource) {
      return <></>;
    }

    if (resource.type === ResourceType.Folder) {
      return <FolderActions />;
    }

    // The modeler entry point is reserved for authenticated editing roles.
    return sessionRole === 'admin' || sessionRole === 'modeler' ? (
      <BusinessProcessActions
        onModelerBtnClick={callbacks.header.onModelerBtnClick}
      />
    ) : <></>;
  }, [resourceId, resource, contents, sessionRole]);

  return (
    <div
      className="mainContainer processViewerActive"
    >
      <Sheet className="innerContent">
        {resource ? (
          <>
            <WorkspaceNavigation />
                          <Header
                            title={isRoot(resourceId) && activeProject ? activeProject.name : resource.name}
                            description={isRoot(resourceId) && activeProject ? (activeProject.description ?? '') : resource.description}
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
