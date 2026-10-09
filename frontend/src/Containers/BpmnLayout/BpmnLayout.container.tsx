import React, { useMemo, useState } from 'react';
import { Await, Outlet, useParams } from 'react-router-dom';
import { Box, IconButton, Sheet } from '@mui/joy';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

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

import type { BpmnLayoutRouteParams } from '.';
import { ResourceType } from '../../shared/types/BpmnResource';

import './BpmnLayoutContainer.scss';

export const Component = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const [folderOpen, setFolderOpen] = useState(false);

  const { resource, contents, navigationFns, callbacks } = useBpmnLayout();
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
          </Box>
        )}
        {folderOpen && (
          <FolderTree
            selectedId={resourceId}
            onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
          />
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
