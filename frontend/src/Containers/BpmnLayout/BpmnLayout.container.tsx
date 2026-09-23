import React, { useMemo, useState } from 'react';
import { Await, Outlet, useParams } from 'react-router-dom';
import { Sheet, IconButton } from '@mui/joy';
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

  const { resource, contents, navigationFns, callbacks } = useBpmnLayout();
  const [folderTreeCollapsed, setFolderTreeCollapsed] = useState(false);
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
    <div className="mainContainer">
      <Sheet
        className={`folderTree ${folderTreeCollapsed ? 'collapsed' : ''}`}
        sx={{
          position: 'sticky',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
        >
        <IconButton
          size="sm"
          variant="plain"
          onClick={() => setFolderTreeCollapsed(!folderTreeCollapsed)}
          sx={{ alignSelf: 'flex-end' }}
         >
          {folderTreeCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
        <FolderTree
          selectedId={resourceId}
          onNodeClick={callbacks.folderTree.onFolderTreeItemClick}
        />
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
