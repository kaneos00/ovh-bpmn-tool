import React from 'react';
import {
  List, ListItem, ListItemContent, ListSubheader, Skeleton,
} from '@mui/joy';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ChevronRight, ExpandMore } from '@mui/icons-material';

import { useFolderTree } from './hooks/useFolderTree';
import { FolderTreeItem } from './components/FolderTreeItem';
import type { RenderTree } from '.';
import { ResourceType } from '../../../shared/types/BpmnResource';

type FolderTreeProps = {
  selectedId: string;
  onNodeClick: (nodeId: string, type: ResourceType) => void;
};

export const FolderTree = ({ selectedId, onNodeClick }: FolderTreeProps) => {
  const {
    dataTree, expandedNodes, isLoading, onNodeSelect, onNodeToggle,
    onDragStart, onDragOver, onDrop, onDragEnd, draggedNodeId, dropTargetId,
  } = useFolderTree(selectedId, { onNodeClick });

  const renderTree = (node: RenderTree) => {
    const isFolder = node.type === ResourceType.Folder;
    const isRoot = node.id === 'root';
    const isDropTarget = dropTargetId === node.id;

    const label = (
      <div
        draggable={!isRoot}
        onDragStart={event => { if (!isRoot) onDragStart(event, node.id); }}
        onDragOver={event => onDragOver(event, node.id, node.type)}
        onDrop={event => onDrop(event, node.id, node.type)}
        onDragEnd={onDragEnd}
        title={node.name}
        style={{
          padding: '8px',
          paddingLeft: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: isRoot ? 'default' : 'grab',
          opacity: draggedNodeId === node.id ? 0.45 : 1,
          borderRadius: 4,
          outline: isDropTarget ? '2px solid #1976d2' : 'none',
          background: isDropTarget ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
        }}
      >
        {`${isFolder ? '📁' : '📄'} ${node.name}`}
      </div>
    );

    return (
      <FolderTreeItem
        key={node.id}
        itemId={node.id}
        label={label}

      >
        {Array.isArray(node.children) ? node.children.map(childNode => renderTree(childNode)) : null}
      </FolderTreeItem>
    );
  };

  return (
    <List sx={{ '--ListItem-radius': '8px', '--ListItem-minHeight': '32px', '--List-gap': '4px' }}>
      <ListSubheader role="presentation" sx={{ color: 'text.primary' }}>
        Processus
      </ListSubheader>
      {isLoading ? new Array(10).fill('').map((_, index) => (
        <ListItem key={`skel-${index}`}><ListItemContent><Skeleton animation="wave" sx={{ width: '90%' }} height={24} /></ListItemContent></ListItem>
      )) : (
        <ListItem>
          <ListItemContent>
            <SimpleTreeView
              selectedItems={selectedId}
              expandedItems={expandedNodes}
              disabledItemsFocusable
              slots={{ collapseIcon: ExpandMore, expandIcon: ChevronRight }}
              onSelectedItemsChange={onNodeSelect}
              onExpandedItemsChange={onNodeToggle}
            >
              {renderTree(dataTree)}
            </SimpleTreeView>
          </ListItemContent>
        </ListItem>
      )}
    </List>
  );
};
