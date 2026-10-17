import React, { useEffect, useMemo, useState } from 'react';
import { Await, Outlet, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Divider, IconButton, Sheet, Stack, Typography } from '@mui/joy';
import { AccountTreeOutlined, ChevronLeft, ChevronRight, FolderOutlined } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { ResourceExplorer } from '../../Components/BusinessComponents/ResourceExplorer';
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
import { getXmlContentQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum } from '../../Types';
import { ProcessHierarchyTree } from '../../Components/BusinessComponents/ProcessHierarchyTree/ProcessHierarchyTree';

import type { BpmnLayoutRouteParams } from '.';
import { ResourceType } from '../../shared/types/BpmnResource';

import './BpmnLayoutContainer.scss';

export const Component = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const [searchParams] = useSearchParams();
  const requestedElementId = searchParams.get('elementId');
  const [folderOpen, setFolderOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(requestedElementId);
  useEffect(() => {
    setSelectedElementId(requestedElementId);
  }, [resourceId, requestedElementId]);

  const { resource, contents, navigationFns, callbacks } = useBpmnLayout();
  const publishedContent = useMemo(
    () =>
      contents
        .filter(({ status }) => status === ContentStatusEnum.Published)
        .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0],
    [contents],
  );
  const xmlQuery = getXmlContentQuery(resourceId, publishedContent?.id ?? '');
  const { data: processXml } = useQuery(xmlQuery.queryKey, xmlQuery.queryFn, {
    enabled: Boolean(publishedContent?.id && resource?.type === ResourceType.Process),
  });
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
      className={`mainContainer ${folderOpen ? 'folderOpen' : 'folderCollapsed'}`}
    >
      <Sheet
        className="folderTree"
        sx={{
          position: 'sticky',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: folderOpen ? 'flex-end' : 'center',
            padding: '8px',
            minHeight: '48px',
          }}
        >
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setFolderOpen(value => !value)}
            title={folderOpen ? 'Replier le panneau du référentiel' : 'Développer le panneau du référentiel'}
            aria-label={folderOpen ? 'Replier le panneau du référentiel' : 'Développer le panneau du référentiel'}
          >
            {folderOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Box>

        {!folderOpen ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 1 }}>
            <IconButton
              size="sm"
              variant="plain"
              title="Explorateur"
              aria-label="Ouvrir l’explorateur"
              onClick={() => setFolderOpen(true)}
            >
              <FolderOutlined />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderOutlined fontSize="small" />
              <Typography level="title-sm">Explorateur</Typography>
            </Box>
            <Divider />
            <Box sx={{ overflowY: 'auto', minHeight: 0, flex: 1, pb: 2 }}>
              <FolderTree
                selectedId={resourceId}
                onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
              />
              {resource?.type === ResourceType.Process && processXml && (
                <ProcessHierarchyTree
                  xmlContent={processXml}
                  selectedElementId={selectedElementId}
                  onElementClick={setSelectedElementId}
                />
              )}
              {resource?.type === ResourceType.Process && !processXml && (
                <Typography level="body-xs" sx={{ px: 1.5, py: 1 }} textColor="neutral">
                  {publishedContent ? 'Chargement du diagramme…' : 'Aucune version publiée.'}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Sheet>

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
                      <Button
                        size="sm"
                        variant={folderOpen ? 'soft' : 'outlined'}
                        color="neutral"
                        startDecorator={<AccountTreeOutlined />}
                        onClick={() => setFolderOpen(value => !value)}
                        aria-expanded={folderOpen}
                        aria-label={folderOpen ? 'Masquer l’arborescence' : 'Ouvrir l’arborescence'}
                      >
                        {folderOpen ? 'Masquer l’arborescence' : 'Arborescence'}
                      </Button>
                    </Stack>
                  }
                />
                {isFolder(resource) ? (
                  <ResourceExplorer
                    parentId={resourceId}
                    getActionLink={navigationFns.getResourceActionLink}
                    getResourceLink={navigationFns.getResourceLink}
                  />
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
