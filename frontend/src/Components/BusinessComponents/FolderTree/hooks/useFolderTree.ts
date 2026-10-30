import { useMemo, useState, useEffect } from 'react';
import { useQuery } from 'react-query';

import { explorerQuery } from '../../../../api/resources/resources.queries';
import { type Resource } from '../../../../Types';
import { useFolders } from '../../../../shared/hooks/useFolders';
import { useResource } from '../../../../shared/hooks/useResource';
import { ResourceType } from '../../../../shared/types/BpmnResource';
import { getProcessLinks, resolveLinkedChildren } from '../processLinks';

import type { RenderTree } from '..';

const EXPANDED_NODES_KEY = 'bpmn-tool:explorer-expanded-nodes';

const readExpandedNodes = (): string[] => {
  try {
    const value = window.localStorage.getItem(EXPANDED_NODES_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const useFolderTree = (selectedResourceId: string) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>(readExpandedNodes);
  useEffect(() => {
    try {
      window.localStorage.setItem(EXPANDED_NODES_KEY, JSON.stringify(expandedNodes));
    } catch {
      // Expansion state is best-effort when browser storage is disabled.
    }
  }, [expandedNodes]);

  const { getFolderHierarchy } = useFolders();
  const { resource } = useResource(selectedResourceId);
  const { data: explorerData, isLoading } = useQuery(explorerQuery());
  const resources = explorerData?.resources;

  const processResources = useMemo(
    () => (resources ?? []).filter(item => item.type === ResourceType.Process),
    [resources],
  );
  const linkedChildrenByResource = useMemo(() => {
    const linksByResource = new Map(
      (explorerData?.links ?? []).map(link => [link.resourceId, link]),
    );
    const processInfo = processResources.map(process => {
      const links = linksByResource.get(process.id);
      return {
        resource: process,
        processIds: links?.processIds ?? [],
        targets: links?.targets ?? [],
      };
    });
    return resolveLinkedChildren(processInfo);
  }, [processResources, explorerData?.links]);

  const linkedTargetIds = useMemo(
    () => new Set(Array.from(linkedChildrenByResource.values()).flat().map(target => target.id)),
    [linkedChildrenByResource],
  );

  const dataTree: RenderTree = useMemo(() => {
    const rootResources = resources ?? [];

    const createNode = (
      item: Resource,
      ancestry: string[],
      treeId = item.id,
      targetId?: string,
    ): RenderTree => {
      const nextAncestry = ancestry.includes(item.id) ? ancestry : [...ancestry, item.id];
      let children: RenderTree[] = [];

      if (item.type === ResourceType.Folder) {
        children = rootResources
          .filter(child => (child.parentId ?? 'root') === item.id && !(child.type === ResourceType.Process && linkedTargetIds.has(child.id)))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === ResourceType.Folder ? -1 : 1;
            return a.name.localeCompare(b.name, 'fr');
          })
          .map(child => createNode(child, nextAncestry));
      } else if (item.type === ResourceType.Process) {
        children = (linkedChildrenByResource.get(item.id) ?? [])
          .filter(target => !nextAncestry.includes(target.id))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          .map(target => createNode(
            target,
            nextAncestry,
            `linked-process:${item.id}:${target.id}`,
            target.id,
          ));
      }

      let nodeType = 'process';
      if (item.type === ResourceType.Folder) {
        nodeType = 'folder';
      } else if (targetId) {
        nodeType = 'linked-process';
      }

      return {
        id: treeId,
        name: item.name,
        type: nodeType,
        targetId,
        children,
      } as RenderTree;
    };

    const createChildren = (parentId: string, ancestry: string[] = []): RenderTree[] =>
      rootResources
        .filter(item => (item.parentId ?? 'root') === parentId && !(item.type === ResourceType.Process && linkedTargetIds.has(item.id)))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === ResourceType.Folder ? -1 : 1;
          return a.name.localeCompare(b.name, 'fr');
        })
        .map(item => createNode(item, ancestry));

    return {
      id: 'root',
      name: 'Root',
      type: 'folder',
      children: createChildren('root'),
    };
  }, [resources, linkedChildrenByResource, linkedTargetIds]);

  useEffect(() => {
    if (!resources?.length || !resource) return;

    // Keep the normal folder ancestry open, and also expand the actual tree path.
    // This second path is important for linked processes: their tree IDs differ
    // from resource IDs and they may live below a Call Activity/SubProcess node.
    const hierarchyResourceId = resource.type === ResourceType.Folder
      ? resource.id
      : resource.parentId ?? selectedResourceId;
    const folderAncestors = getFolderHierarchy(hierarchyResourceId).map(({ id }) => id);

    const findPath = (node: RenderTree, path: RenderTree[] = []): RenderTree[] | null => {
      const currentPath = [...path, node];
      if (node.id === selectedResourceId || node.targetId === selectedResourceId) return currentPath;
      for (const child of node.children ?? []) {
        const found = findPath(child, currentPath);
        if (found) return found;
      }
      return null;
    };
    const selectedPath = findPath(dataTree) ?? [];
    const treeAncestors = selectedPath
      .slice(0, resource.type === ResourceType.Folder ? selectedPath.length : -1)
      .map(node => node.id)
      .filter(id => id !== 'root');

    setExpandedNodes(current => Array.from(new Set([...current, ...folderAncestors, ...treeAncestors])));
  }, [selectedResourceId, resources, resource, getFolderHierarchy, dataTree]);

  return { dataTree, expandedNodes, setExpandedNodes, isLoading };
};
