import React from 'react';
import { alpha, styled } from '@mui/material';
import {
  TreeItem,
  TreeItemProps,
  treeItemClasses,
} from '@mui/x-tree-view/TreeItem';

export const FolderTreeItem = styled((props: TreeItemProps) => (
  // @ts-ignore
  <TreeItem {...props} />
))(({ theme }) => {
  return {
    [`& .${treeItemClasses.iconContainer}`]: {
      paddingTop: 11,
      paddingBottom: 11,
      paddingLeft: 8,
      paddingRight: 8,
      margin: 0,

      '& .close': {
        opacity: 0.3,
      },
      '&:hover:not(:empty)': {
        background: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
    [`& .${treeItemClasses.content}`]: {
      padding: 0,
      width: 'auto',
      minHeight: 34,
      borderRadius: 7,
      color: '#44536a',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 12,
      '&:hover': {
        backgroundColor: '#f4f7fb',
      },
      '&.Mui-selected': {
        backgroundColor: '#eaf1ff',
        color: '#204fae',
        fontWeight: 700,
      },
      '&.Mui-selected:hover': {
        backgroundColor: '#eaf1ff',
      },
    },
    [`& .${treeItemClasses.label}`]: {
      padding: '8px 7px 8px 0',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      fontSize: 12,
      lineHeight: 1.4,
    },
  };
});

export const FolderTreeItemLoading = styled((props: TreeItemProps) => (
  // @ts-ignore
  <TreeItem {...props} />
))(() => {
  return {
    [`& .${treeItemClasses.content}`]: {
      padding: 8,
      width: 'auto',
    },
  };
});
