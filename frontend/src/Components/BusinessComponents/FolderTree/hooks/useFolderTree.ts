import { useMemo, SyntheticEvent, useState, useEffect } from 'react';
import type { DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { useFolders } from '../../../../shared/hooks/useFolders';
import { resourcesQuery, updateResource } from '../../../../api/resources/resources.queries';

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

export const useFolderTree = (selectedResourceId: string, { onNodeClick }: UseFolderTreeCallbacks) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const { isLoading: foldersLoading, getFolderHierarchy } = useFolders();
  const { resource } = useResource(selectedResourceId);
  const queryClient = useQueryClient();
  const { data: resources = [], isLoading: resourcesLoading } = useQuery(resourcesQuery());

  const moveMutation = useMutation(
    ({ resourceId, parentId }: { resourceId: string; parentId: string | null }) => {
      const movingResource = resources.find(item => item.id === resourceId);
      if (!movingResource) return Promise.reject(new Error('Resource introuvable'));
      return updateResource(resourceId, {
        name: movingResource.name,
        description: movingResource.description,
        parentId,
      });
    },
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries('resources');
      },
    },
  );

  const hasParent = (resourceParentId: string | null | undefined, parentId?: string) =>
    (resourceParentId ?? undefined) === parentId;

  const createDataTree = (parentId?: string): FolderTreeItem[] => resources
    .filter(({ parentId: resourceParentId, type }) => hasParent(resourceParentId, parentId) && type === ResourceType.Folder)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder: Resource): FolderTreeItem => ({
      id: folder.id,
      name: folder.name,
      type: folder.type,
      children: createDataTree(folder.id),
    }));

  const addProcesses = (folder: FolderTreeItem): FolderTreeItem => {
    const processes = resources
      .filter(resource => resource.parentId === folder.id && resource.type === ResourceType.Process)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(resource => ({ id: resource.id, name: resource.name, type: resource.type, children: [] }));
    return { ...folder, children: [...folder.children.map(addProcesses), ...processes] };
  };

  const createProcessNodes = (parentId?: string): FolderTreeItem[] => resources
    .filter(resource => hasParent(resource.parentId, parentId) && resource.type === ResourceType.Process)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(resource => ({ id: resource.id, name: resource.name, type: resource.type, children: [] }));

  const dataTree: RenderTree = useMemo(() => ({
    id: 'root',
    name: 'Root',
    type: ResourceType.Folder,
    children: [...createDataTree(undefined).map(addProcesses), ...createProcessNodes(undefined)],
  }), [resources]);

  const onNodeSelect = (_event: SyntheticEvent, nodeId: string | null) => {
    if (!nodeId) return;
    const node = resources.find(item => item.id === nodeId);
    if (node) onNodeClick(nodeId, node.type);
  };

  const onNodeToggle = (_event: SyntheticEvent, nodeIds: string[]) => {
    setExpandedNodes(nodeIds);
  };

  const onDragStart = (event: DragEvent, nodeId: string) => {
    setDraggedNodeId(nodeId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeId);
  };

  const onDragOver = (event: DragEvent, nodeId: string, type: ResourceType) => {
    if (!draggedNodeId || draggedNodeId === nodeId) return;
    if (nodeId !== 'root' && type !== ResourceType.Folder) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetId(nodeId);
  };

  const onDrop = (event: DragEvent, targetId: string, targetType: ResourceType) => {
    event.preventDefault();
    const sourceId = draggedNodeId ?? event.dataTransfer.getData('text/plain');
    setDropTargetId(null);
    setDraggedNodeId(null);
    if (!sourceId || sourceId === targetId || moveMutation.isLoading) return;

    const parentId = targetId === 'root' ? null : targetType === ResourceType.Folder ? targetId : undefined;
    if (parentId === undefined) return;

    moveMutation.mutate({ resourceId: sourceId, parentId });
    if (parentId && !expandedNodes.includes(parentId)) {
      setExpandedNodes(current => [...current, parentId]);
    }
  };

  const onDragEnd = () => {
    setDraggedNodeId(null);
    setDropTargetId(null);
  };

  useEffect(() => {
    if (resources.length && resource) {
      const hierarchy = getFolderHierarchy(resource.parentId ? resource.parentId : selectedResourceId);
      setExpandedNodes(current => [...current, ...hierarchy.filter(({ id }) => !current.includes(id)).map(({ id }) => id)]);
    }
  }, [selectedResourceId, resources, resource, getFolderHierarchy]);

  return {
    dataTree, onNodeSelect, onNodeToggle, expandedNodes,
    onDragStart, onDragOver, onDrop, onDragEnd, draggedNodeId, dropTargetId,
    isLoading: foldersLoading || resourcesLoading,
  };
};
