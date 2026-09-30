import { useMemo, SyntheticEvent, useState, useEffect } from 'react';
import { treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../../../api/resources/resources.queries';
import { useFolders } from '../../../../shared/hooks/useFolders';
import { useResource } from '../../../../shared/hooks/useResource';
import { ResourceType } from '../../../../shared/types/BpmnResource';

import type { RenderTree } from '..';
import type { Resource } from '../../../../Types';

type UseFolderTreeCallbacks = {
  onNodeClick: (nodeId: string) => void;
};

type FolderTreeItem = {
  id: string;
  name: string;
  type: ResourceType;
  children: FolderTreeItem[];
};

export const useFolderTree = (
  selectedResourceId: string,
  { onNodeClick }: UseFolderTreeCallbacks,
) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const { getFolderHierarchy } = useFolders();
  const { resource } = useResource(selectedResourceId);
  const { data: resources, isLoading } = useQuery(resourcesQuery());

  const createDataTree = (
    parentId: string,
    rootResources: Resource[],
  ): FolderTreeItem[] => {
    return rootResources
      .filter(item => (item.parentId ?? 'root') === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === ResourceType.Folder ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        children:
          item.type === ResourceType.Folder
            ? createDataTree(item.id, rootResources)
            : [],
      }));
  };

  const dataTree: RenderTree = useMemo(
    () => ({
      id: 'root',
      name: 'Root',
      type: ResourceType.Folder,
      children: createDataTree('root', resources ?? []),
    }),
    [resources],
  );

  const isLabelClick = (event: SyntheticEvent) => {
    return (event.target as HTMLElement).classList.contains(
      treeItemClasses.label,
    );
  };

  const onNodeSelect = (event: SyntheticEvent, nodeId: string | null) => {
    if (nodeId && isLabelClick(event)) {
      onNodeClick(nodeId);
      if (!expandedNodes.includes(nodeId)) {
        setExpandedNodes([...[...expandedNodes, nodeId]]);
      }
    }
  };

  const onNodeToggle = (event: SyntheticEvent, nodeIds: string[]) => {
    if (!isLabelClick(event)) {
      setExpandedNodes(nodeIds);
    }
  };

  useEffect(() => {
    if (resources?.length && resource) {
      setExpandedNodes([
        ...expandedNodes,
        ...getFolderHierarchy(
          resource.parentId ? resource.parentId : selectedResourceId,
        )
          .filter(({ id }) => !expandedNodes.includes(id))
          .map(({ id }) => id),
      ]);
    }
  }, [selectedResourceId, resources, resource]);

  return { dataTree, onNodeSelect, onNodeToggle, expandedNodes, isLoading };
};
