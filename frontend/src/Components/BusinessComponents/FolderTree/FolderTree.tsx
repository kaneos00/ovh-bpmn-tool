import React from 'react';
import {
  IconButton, List, ListItem, ListItemContent, ListSubheader, Skeleton,
} from '@mui/joy';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ChevronRight, DeleteOutline, ExpandMore } from '@mui/icons-material';

import { useFolderTree } from './hooks/useFolderTree';
import { FolderTreeItem } from './components/FolderTreeItem';
import type { RenderTree } from '.';
import { ResourceType } from '../../../shared/types/BpmnResource';

type FolderTreeProps = {
  selectedId: string;
  onNodeClick: (nodeId: string, type: ResourceType) => void;
  onNodeDelete: (nodeId: string) => void;
};

export const FolderTree = ({ selectedId, onNodeClick, onNodeDelete }: FolderTreeProps) => {
  const {
    dataTree, expandedNodes, isLoading, onNodeSelect, onNodeToggle,
    onDelete, onDragStart, onDragOver, onDrop, onDragEnd, draggedNodeId, dropTargetId,
  } = useFolderTree(selectedId, { onNodeClick, onNodeDelete });

  const renderTree = (node: RenderTree) => {
    const isFolder = node.type === ResourceType.Folder;
    const isRoot = node.id === 'root';
    const isDropTarget = dropTargetId === node.id;

    const label = (
      <div
        title={node.name}
        aria-label={node.name}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          minWidth: 0,
          padding: '8px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
          {`${isFolder ? '📁' : '📄'} ${node.name}`}
        </span>
        {node.type === ResourceType.Process && (
          <IconButton
            title={`Supprimer « ${node.name} »`}
            aria-label={`Supprimer « ${node.name} »`}
            size="sm"
            variant="plain"
            color="danger"
            onClick={event => {
              event.stopPropagation();
              onDelete(node.id);
            }}
            sx={{ flex: '0 0 auto', ml: 0.5 }}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        )}
      </div>
    );

    return (
      <FolderTreeItem
        key={node.id}
        itemId={node.id}
        label={label}
        draggable={!isRoot}
        onDragStart={event => {
          if (!isRoot) onDragStart(event, node.id);
        }}
        onDragOver={event => onDragOver(event, node.id, node.type)}
        onDrop={event => onDrop(event, node.id, node.type)}
        onDragEnd={onDragEnd}
        sx={{
          '& > .MuiTreeItem-content': {
            cursor: isRoot
              ? draggedNodeId ? 'copy' : 'default'
              : draggedNodeId === node.id ? 'grabbing' : 'grab',
            opacity: draggedNodeId === node.id ? 0.45 : 1,
            outline: isDropTarget ? '2px solid #1976d2' : 'none',
            background: isDropTarget ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            borderRadius: 4,
          },
        }}
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
        <ListItem key={String(index)}><ListItemContent><Skeleton animation="wave" sx={{ width: '90%' }} height={24} /></ListItemContent></ListItem>
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
