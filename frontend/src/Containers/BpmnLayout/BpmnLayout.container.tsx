import React, { useMemo, useState } from 'react';
import { Await, Outlet, useNavigate, useParams } from 'react-router-dom';
import { Box, IconButton, Sheet, Typography } from '@mui/joy';
import { AccountTreeOutlined, ChevronLeft, ChevronRight, FolderOutlined, GroupsOutlined } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { ResourceExplorer } from '../../Components/BusinessComponents/ResourceExplorer';
import { ProcessDetails } from '../../Components/BusinessComponents/ProcessDetails';

import { useBpmnLayout } from './hooks/useBpmnLayout';
import { useBpmnLayoutBreadcrumbs } from './hooks/useBpmnLayoutBreadcrumbs';
import { Header } from '../../Components/GenericComponents/Header/Header';
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
import { ProjectRaciPanel } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciPanel';

import type { BpmnLayoutRouteParams } from '.';
import { ResourceType } from '../../shared/types/BpmnResource';

import './BpmnLayoutContainer.scss';

export const Component = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const navigate = useNavigate();
  const [folderOpen, setFolderOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const { resource, contents, navigationFns, callbacks } = useBpmnLayout();
  const publishedContent = contents.find(({ status }) => status === ContentStatusEnum.Published);
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
            title={folderOpen ? 'Collapse folders' : 'Open folders'}
          >
            {folderOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Box>
        {!folderOpen && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 1 }}>
            <IconButton size="sm" variant="plain" title="Ressources" onClick={() => setFolderOpen(true)}><FolderOutlined /></IconButton>
            {resource?.type === ResourceType.Process && <IconButton size="sm" variant="plain" title="Processus" onClick={() => setFolderOpen(true)}><AccountTreeOutlined /></IconButton>}
            <IconButton size="sm" variant="plain" title="RACI du projet" onClick={() => setFolderOpen(true)}><GroupsOutlined /></IconButton>
          </Box>
        )}
        {folderOpen && (
          <Box sx={{ overflowY: 'auto', minHeight: 0, pb: 2 }}>
            <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderOutlined fontSize="small" />
              <Typography level="title-sm">Ressources</Typography>
            </Box>
            <FolderTree
              selectedId={resourceId}
              onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
            />
            {resource?.type === ResourceType.Process && (
              <>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTreeOutlined fontSize="small" />
                  <Typography level="title-sm">Processus</Typography>
                </Box>
                {processXml ? (
                  <ProcessHierarchyTree
                    xmlContent={processXml}
                    selectedElementId={selectedElementId}
                    onElementClick={setSelectedElementId}
                  />
                ) : (
                  <Typography level="body-xs" sx={{ px: 1.5, py: 1 }} textColor="neutral">
                    {publishedContent ? 'Chargement des processus…' : 'Aucune version publiée.'}
                  </Typography>
                )}
              </>
            )}
            <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupsOutlined fontSize="small" />
              <Typography level="title-sm">RACI du projet</Typography>
            </Box>
            <ProjectRaciPanel
              currentResourceId={resourceId}
              onActivityClick={(targetResourceId, elementId) => {
                setSelectedElementId(elementId);
                if (targetResourceId !== resourceId) navigate(`/${targetResourceId}`);
              }}
            />
          </Box>
        )}
      </Sheet>

      <Sheet className="innerContent">
        <React.Suspense fallback={<BpmnContentLoading />}>
          <Await resolve={resource}>
            {resource && (
              <>
                <Header
                  title={resource.name}
                  description={resource.description}
                  breadcrumbs={getBreadCrumbs()}
                  actions={actions}
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
