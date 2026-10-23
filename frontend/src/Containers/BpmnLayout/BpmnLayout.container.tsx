import React, { useEffect, useMemo, useState } from 'react';
import { Await, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Divider, IconButton, Sheet, Stack, Typography } from '@mui/joy';
import { ArrowBack, ArrowForward, FolderOutlined } from '@mui/icons-material';

import { ProcessDetails } from '../../Components/BusinessComponents/ProcessDetails';

import { useBpmnLayout } from './hooks/useBpmnLayout';
import { useBpmnLayoutBreadcrumbs } from './hooks/useBpmnLayoutBreadcrumbs';
import { Header } from '../../Components/GenericComponents/Header/Header';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ImpersonationBanner } from '../../Components/GenericComponents/ImpersonationBanner/ImpersonationBanner';
import { FolderTree } from '../../Components/BusinessComponents/FolderTree';
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
      className={`mainContainer processViewerActive`}
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
                    <Box className="processViewerWorkspace">
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
                      <Sheet className="processViewerDiagram folderViewerEmptyState" variant="outlined">
                        <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ height: '100%', p: 3, textAlign: 'center' }}>
                          <FolderOutlined sx={{ fontSize: 40, color: 'text.tertiary' }} />
                          <Typography level="title-lg">{resource.name}</Typography>
                          <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                            Sélectionnez un processus dans l’explorateur pour afficher son diagramme.
                          </Typography>
                        </Stack>
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
