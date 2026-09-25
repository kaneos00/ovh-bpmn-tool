import { useMemo, SyntheticEvent, useState, useEffect } from 'react';
import { treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { useQuery } from 'react-query';

import { useFolders } from '../../../../shared/hooks/useFolders';
import { resourcesQuery } from '../../../../api/resources/resources.queries';

import type { RenderTree } from '..';
import type { Resource } from '../../../../Types';
import { ResourceType } from '../../../../shared/types/BpmnResource';
import { useResource } from '../../../../shared/hooks/useResource';

type UseFolderTreeCallbacks = {
  onNodeClick: (nodeId: string, type: ResourceType) => void;
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
  const { isLoading: foldersLoading, getFolderHierarchy } = useFolders();
  const { resource } = useResource(selectedResourceId);
  const { data: resources = [], isLoading: resourcesLoading } = useQuery(
    resourcesQuery(),
  );

  const hasParent = (resourceParentId: string | null | undefined, parentId?: string) =>
    (resourceParentId ?? undefined) === parentId;

  const createDataTree = (parentId?: string): FolderTreeItem[] => {
    return resources
      .filter(
        ({ parentId: resourceParentId, type }) =>
          hasParent(resourceParentId, parentId) && type === ResourceType.Folder,
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder: Resource): FolderTreeItem => ({
        id: folder.id,
        name: folder.name,
        type: folder.type,
        children: createDataTree(folder.id),
      }));
  };

  const addProcesses = (
    folder: FolderTreeItem,
  ): FolderTreeItem => {
    const processes = resources
      .filter(
        resource =>
          resource.parentId === folder.id &&
          resource.type === ResourceType.Process,
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(resource => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        children: [],
      }));

    const children = folder.children.map(addProcesses);

    return {
      ...folder,
      children: [...children, ...processes],
    };
  };

  const createProcessNodes = (parentId?: string): FolderTreeItem[] => {
    return resources
      .filter(
        resource =>
          hasParent(resource.parentId, parentId) &&
          resource.type === ResourceType.Process,
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(resource => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        children: [],
      }));
  };

  const dataTree: RenderTree = useMemo(() => {
    const rootFolders = createDataTree(undefined).map(addProcesses);
    const rootProcesses = createProcessNodes(undefined);

    return {
      id: 'root',
      name: 'Root',
      type: ResourceType.Folder,
      children: [...rootFolders, ...rootProcesses],
    };
  }, [resources]);

  const isLabelClick = (event: SyntheticEvent) => {
    return (event.target as HTMLElement).classList.contains(
      treeItemClasses.label,
    );
  };

  const onNodeSelect = (event: SyntheticEvent, nodeId: string | null) => {
    if (!nodeId || !isLabelClick(event)) {
      return;
    }

    const node = resources.find(resource => resource.id === nodeId);

    if (node) {
      onNodeClick(nodeId, node.type);
    }

    if (node?.type === ResourceType.Folder && !expandedNodes.includes(nodeId)) {
      setExpandedNodes([...expandedNodes, nodeId]);
    }
  };

  const onNodeToggle = (event: SyntheticEvent, nodeIds: string[]) => {
    if (!isLabelClick(event)) {
      setExpandedNodes(nodeIds);
    }
  };

  useEffect(() => {
    if (resources.length && resource) {
      const hierarchy = getFolderHierarchy(
        resource.parentId ? resource.parentId : selectedResourceId,
      );

      setExpandedNodes(current => [
        ...current,
        ...hierarchy
          .filter(({ id }) => !current.includes(id))
          .map(({ id }) => id),
      ]);
    }
  }, [selectedResourceId, resources, resource, getFolderHierarchy]);

  return {
    dataTree,
    onNodeSelect,
    onNodeToggle,
    expandedNodes,
    isLoading: foldersLoading || resourcesLoading,
  };
};
