import { useMemo, SyntheticEvent, useState, useEffect } from 'react';
import { treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { useQueries, useQuery } from 'react-query';

import { resourcesQuery } from '../../../../api/resources/resources.queries';
import { contentsQuery, getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../../../Types';
import { useFolders } from '../../../../shared/hooks/useFolders';
import { useResource } from '../../../../shared/hooks/useResource';
import { ResourceType } from '../../../../shared/types/BpmnResource';
import { getProcessLinks, resolveLinkedChildren } from '../processLinks';

import type { RenderTree } from '..';

type UseFolderTreeCallbacks = {
  onNodeClick: (nodeId: string) => void;
};

const getPublishedContent = (contents: Content[] | undefined) =>
  (contents ?? [])
    .filter(content => content.status === ContentStatusEnum.Published)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];



export const useFolderTree = (
  selectedResourceId: string,
  { onNodeClick }: UseFolderTreeCallbacks,
) => {
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const { getFolderHierarchy } = useFolders();
  const { resource } = useResource(selectedResourceId);
  const { data: resources, isLoading } = useQuery<Resource[]>(resourcesQuery());

  const processResources = useMemo(
    () => (resources ?? []).filter(item => item.type === ResourceType.Process),
    [resources],
  );
  const contentQueries = useQueries(processResources.map(process => contentsQuery(process.id)));
  const publishedContents = processResources.map((_, index) =>
    getPublishedContent(contentQueries[index]?.data as Content[] | undefined),
  );
  const xmlQueries = useQueries(processResources.map((process, index) => ({
    ...getXmlContentQuery(process.id, publishedContents[index]?.id ?? ''),
    enabled: Boolean(publishedContents[index]?.id),
  })));

  const linkedChildrenByResource = useMemo(() => {
    const processInfo = processResources.map((process, index) => {
      const xml = (xmlQueries[index]?.data as string | undefined) ?? '';
      return { resource: process, ...getProcessLinks(xml) };
    });
    return resolveLinkedChildren(processInfo);
  }, [processResources, xmlQueries]);

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

  const findNode = (node: RenderTree, id: string): RenderTree | undefined => {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const match = findNode(child, id);
      if (match) return match;
    }
    return undefined;
  };

  const isLabelClick = (event: SyntheticEvent) =>
    Boolean((event.target as HTMLElement).closest(`.${treeItemClasses.label}`));

  const onNodeSelect = (event: SyntheticEvent, nodeId: string | null) => {
    if (!nodeId || !isLabelClick(event)) return;
    const node = findNode(dataTree, nodeId);
    onNodeClick(node?.targetId ?? nodeId);
    if (node?.children?.length && !expandedNodes.includes(nodeId)) {
      setExpandedNodes(current => current.includes(nodeId) ? current : [...current, nodeId]);
    }
  };

  const onNodeToggle = (event: SyntheticEvent, nodeIds: string[]) => {
    if (!isLabelClick(event)) setExpandedNodes(nodeIds);
  };

  useEffect(() => {
    if (resources?.length && resource) {
      // When the selected resource is a folder, include that folder itself so
      // its immediate children are visible after navigation/remount as well.
      // For a process, expand only its parent-folder chain.
      const hierarchyResourceId = resource.type === ResourceType.Folder
        ? resource.id
        : resource.parentId ?? selectedResourceId;
      const ancestors = getFolderHierarchy(hierarchyResourceId).map(({ id }) => id);
      setExpandedNodes(current => Array.from(new Set([...current, ...ancestors])));
    }
  }, [selectedResourceId, resources, resource, getFolderHierarchy]);

  return { dataTree, onNodeSelect, onNodeToggle, expandedNodes, setExpandedNodes, isLoading };
};
