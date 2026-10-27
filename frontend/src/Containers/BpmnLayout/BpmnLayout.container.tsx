import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Await, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Sheet, Stack, Typography } from '@mui/joy';
import { ArrowBack, ArrowForward, FolderOutlined } from '@mui/icons-material';

import { ProcessDetails } from '../../Components/BusinessComponents/ProcessDetails';

import { useBpmnLayout } from './hooks/useBpmnLayout';
import { useBpmnLayoutBreadcrumbs } from './hooks/useBpmnLayoutBreadcrumbs';
import { Header } from '../../Components/GenericComponents/Header/Header';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ImpersonationBanner } from '../../Components/GenericComponents/ImpersonationBanner/ImpersonationBanner';
import { FolderTree } from '../../Components/BusinessComponents/FolderTree';
import { FolderOverview } from './FolderOverview';
import {
  BpmnContentLoading,
  BusinessProcessActions,
  FolderActions,
} from './components';
import { isFolder, isRoot } from '../../shared/helpers/resource';

import type { BpmnLayoutRouteParams } from '.';
import { ResourceType } from '../../shared/types/BpmnResource';

import './BpmnLayoutContainer.scss';

export const Component = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const [searchParams] = useSearchParams();
  const requestedElementId = searchParams.get('elementId');
  const navigate = useNavigate();
  const [folderExplorerWidth, setFolderExplorerWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('bpmn-viewer-explorer-width'));
    return Number.isFinite(saved) && saved >= 180 && saved <= 480 ? saved : 248;
  });
  const folderResizeCleanupRef = useRef<(() => void) | null>(null);

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

  const [selectedElementId, setSelectedElementId] = useState<string | null>(requestedElementId);
  useEffect(() => {
    setSelectedElementId(requestedElementId);
  }, [resourceId, requestedElementId]);

  const { resource, contents, callbacks } = useBpmnLayout();
  const { getBreadCrumbs } = useBpmnLayoutBreadcrumbs();

  const actions = useMemo(() => {
    const isRootFolder = isRoot(resourceId);

    if (isRootFolder) {
      return <FolderActions />;
    }

    if (!resource) {
      return <></>;
    }

    return resource.type === ResourceType.Folder ? (
      <FolderActions />
    ) : (
      <BusinessProcessActions
        onModelerBtnClick={callbacks.header.onModelerBtnClick}
      />
    );
  }, [resourceId, resource, contents]);

  return (
    <div
      className="mainContainer processViewerActive"
    >
      <Sheet className="innerContent">
        <React.Suspense fallback={<BpmnContentLoading />}>
          <Await resolve={resource}>
            {resource && (
              <>
                <ImpersonationBanner />
                <WorkspaceNavigation />
                <Header
                  title={resource.name}
                  description={resource.description}
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
                      <Sheet className="processExplorerPanel" variant="outlined">
                        <Stack direction="row" alignItems="center" spacing={1} className="processExplorerPanelHeader">
                          <FolderOutlined fontSize="small" />
                          <Typography level="title-sm">Explorateur</Typography>
                        </Stack>
                        <Box className="processExplorerPanelContent">
                          <FolderTree
                            selectedId={resourceId}
                            onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
                          />
                        </Box>
                        <Stack direction="row" spacing={0.75} className="processExplorerHistory" alignItems="stretch">
                          <Button size="sm" fullWidth variant="outlined" color="neutral" title="Retour" aria-label="Retour" onClick={() => navigate(-1)} startDecorator={<ArrowBack />} sx={{ flex: 1, minWidth: 0 }}>Retour</Button>
                          <Button size="sm" fullWidth variant="outlined" color="neutral" title="Suivant" aria-label="Suivant" onClick={() => navigate(1)} startDecorator={<ArrowForward />} sx={{ flex: 1, minWidth: 0 }}>Suivant</Button>
                        </Stack>
                      </Sheet>
                      <Box
                        className="processViewerResizeHandle"
                        role="separator"
                        aria-label="Redimensionner le panneau explorateur"
                        title="Glisser pour régler la largeur de l’explorateur"
                        onMouseDown={startFolderExplorerResize}
                      />
                      <Sheet className="processViewerDiagram folderViewerEmptyState" variant="outlined">
                        <FolderOverview resourceId={resourceId} />
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
                    onCompareClick={callbacks.processDetails.onCompareClick}
                    selectedElementId={selectedElementId}
                    onElementSelect={setSelectedElementId}
                  />
                )}
                <Outlet />
              </>
            )}
          </Await>
        </React.Suspense>
      </Sheet>
    </div>
  );
};

Component.displayName = 'BpmnLayoutContainer';
