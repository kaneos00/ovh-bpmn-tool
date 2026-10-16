import React, { useEffect, useMemo, useState } from 'react';
import { Await, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Divider, IconButton, Sheet, Stack, Typography } from '@mui/joy';
import { AccountTreeOutlined, ChevronLeft, ChevronRight, FolderOutlined, GroupsOutlined, WorkspacesOutlined } from '@mui/icons-material';
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
import { ProjectRaciPanel } from '../../Components/BusinessComponents/ProjectRaciPanel/ProjectRaciPanel';

import type { BpmnLayoutRouteParams } from '.';
import { ResourceType } from '../../shared/types/BpmnResource';

import './BpmnLayoutContainer.scss';

export const Component = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedElementId = searchParams.get('elementId');
  const [folderOpen, setFolderOpen] = useState(false);
  const [sidebarSection, setSidebarSection] = useState<'resources' | 'activities' | 'raci'>('resources');
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
            <IconButton size="sm" variant={sidebarSection === 'resources' ? 'soft' : 'plain'} title="Référentiel" aria-label="Ouvrir le référentiel"
              onClick={() => { setSidebarSection('resources'); setFolderOpen(true); }}>
              <FolderOutlined />
            </IconButton>
            <IconButton size="sm" variant={sidebarSection === 'activities' ? 'soft' : 'plain'} title="Processus et activités" aria-label="Ouvrir les processus et activités"
              onClick={() => { setSidebarSection('activities'); setFolderOpen(true); }}>
              <AccountTreeOutlined />
            </IconButton>
            <IconButton size="sm" variant={sidebarSection === 'raci' ? 'soft' : 'plain'} title="RACI" aria-label="Ouvrir le RACI"
              onClick={() => { setSidebarSection('raci'); setFolderOpen(true); }}>
              <GroupsOutlined />
            </IconButton>
            <IconButton size="sm" variant="plain" title="Projets" aria-label="Accéder aux projets" onClick={() => navigate('/projects')}>
              <WorkspacesOutlined />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }}>
            <Stack direction="row" spacing={0.5} sx={{ px: 1, pb: 1 }} useFlexGap flexWrap="wrap">
              <Button size="sm" variant={sidebarSection === 'resources' ? 'soft' : 'plain'}
                color={sidebarSection === 'resources' ? 'primary' : 'neutral'}
                startDecorator={<FolderOutlined />} onClick={() => setSidebarSection('resources')}>
                Référentiel
              </Button>
              <Button size="sm" variant={sidebarSection === 'activities' ? 'soft' : 'plain'}
                color={sidebarSection === 'activities' ? 'primary' : 'neutral'}
                startDecorator={<AccountTreeOutlined />} onClick={() => setSidebarSection('activities')}>
                Processus et activités
              </Button>
              <Button size="sm" variant={sidebarSection === 'raci' ? 'soft' : 'plain'}
                color={sidebarSection === 'raci' ? 'primary' : 'neutral'}
                startDecorator={<GroupsOutlined />} onClick={() => setSidebarSection('raci')}>
                RACI
              </Button>
            </Stack>
            <Divider />
            <Box sx={{ overflowY: 'auto', minHeight: 0, flex: 1, pb: 2 }}>
              {sidebarSection === 'resources' && (
                <>
                  <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderOutlined fontSize="small" />
                    <Typography level="title-sm">Dossiers et processus</Typography>
                  </Box>
                  <FolderTree
                    selectedId={resourceId}
                    onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
                  />
                  <Box sx={{ px: 1.5, py: 1 }}>
                    <Button size="sm" variant="outlined" color="neutral" fullWidth
                      startDecorator={<WorkspacesOutlined />} onClick={() => navigate('/projects')}>
                      Gérer les projets
                    </Button>
                  </Box>
                </>
              )}

              {sidebarSection === 'activities' && (
                <>
                  <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountTreeOutlined fontSize="small" />
                    <Typography level="title-sm">Processus et activités</Typography>
                  </Box>
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
                  {resource?.type !== ResourceType.Process && (
                    <Typography level="body-sm" sx={{ px: 1.5, py: 1 }} textColor="neutral">
                      Ouvrez un processus dans le référentiel pour parcourir ses activités.
                    </Typography>
                  )}
                </>
              )}

              {sidebarSection === 'raci' && (
                <>
                  <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupsOutlined fontSize="small" />
                    <Typography level="title-sm">RACI du projet</Typography>
                  </Box>
                  <ProjectRaciPanel
                    currentResourceId={resourceId}
                    onActivityClick={(targetResourceId, elementId) => {
                      setSelectedElementId(elementId);
                      setSidebarSection('activities');
                      if (targetResourceId !== resourceId) {
                        navigate(`/${targetResourceId}?elementId=${encodeURIComponent(elementId)}`);
                      }
                    }}
                  />
                </>
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
