import { useMemo, SyntheticEvent, useState, useEffect } from 'react';
import { treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { useQueries, useQuery } from 'react-query';

import { resourcesQuery } from '../../../../api/resources/resources.queries';
import { contentsQuery, getXmlContentQuery } from '../../../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../../../Types';
import { useFolders } from '../../../../shared/hooks/useFolders';
import { useResource } from '../../../../shared/hooks/useResource';
import { ResourceType } from '../../../../shared/types/BpmnResource';

import type { RenderTree } from '..';

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

type UseFolderTreeCallbacks = {
  onNodeClick: (nodeId: string) => void;
};

const getPublishedContent = (contents: Content[] | undefined) =>
  (contents ?? [])
    .filter(content => content.status === ContentStatusEnum.Published)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];

const getProcessLinks = (xml: string) => {
  if (!xml || typeof DOMParser === 'undefined') return { processIds: [] as string[], targets: [] as string[] };
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return { processIds: [] as string[], targets: [] as string[] };

  return {
    processIds: Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'process'))
      .map(element => element.getAttribute('id')?.trim() || '')
      .filter(Boolean),
    targets: Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity'))
      .map(element => element.getAttribute('calledElement')?.trim() || '')
      .filter(Boolean),
  };
};

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
    const processInfo: { resource: Resource; processIds: string[]; targets: string[] }[] =
      processResources.map((process, index) => {
        const xml = (xmlQueries[index]?.data as string | undefined) ?? '';
        return { resource: process, ...getProcessLinks(xml) };
      });

    // Resource IDs are unambiguous and always take precedence. BPMN process
    // IDs can be duplicated across imported models, so resolve them only when
    // exactly one resource declares that ID; guessing would create false links.
    const byIdentifier = new Map<string, Resource>();
    processInfo.forEach(info => byIdentifier.set(info.resource.id, info.resource));

    const resourcesByProcessId = new Map<string, Resource[]>();
    processInfo.forEach(info => {
      info.processIds.forEach(id => {
        const matches = resourcesByProcessId.get(id) ?? [];
        if (!matches.some(candidateResource => candidateResource.id === info.resource.id)) {
          matches.push(info.resource);
        }
        resourcesByProcessId.set(id, matches);
      });
    });
    resourcesByProcessId.forEach((matches, processId) => {
      if (matches.length === 1 && !byIdentifier.has(processId)) {
        byIdentifier.set(processId, matches[0]);
      }
    });

    const resolvedTargets = new Map<string, Resource[]>();
    processInfo.forEach(info => {
      const targets = Array.from(new Set(info.targets))
        .map(targetId => byIdentifier.get(targetId))
        .filter((target): target is Resource => target !== undefined && target.id !== info.resource.id)
        .filter((target, index, all) => all.findIndex(candidate => candidate.id === target.id) === index);
      resolvedTargets.set(info.resource.id, targets);
    });

    // Keep each called process under one caller only. Reject edges that would
    // create a cycle, so linked processes remain reachable from the tree root.
    const reaches = (fromId: string, soughtId: string, visited = new Set<string>()): boolean => {
      if (fromId === soughtId) return true;
      if (visited.has(fromId)) return false;
      visited.add(fromId);
      return (resolvedTargets.get(fromId) ?? []).some(target => reaches(target.id, soughtId, visited));
    };
    const parentByTarget = new Map<string, string>();
    processInfo.forEach(info => {
      (resolvedTargets.get(info.resource.id) ?? []).forEach(target => {
        if (!parentByTarget.has(target.id) && !reaches(target.id, info.resource.id)) {
          parentByTarget.set(target.id, info.resource.id);
        }
      });
    });

    const linked = new Map<string, Resource[]>();
    processInfo.forEach(info => {
      linked.set(
        info.resource.id,
        (resolvedTargets.get(info.resource.id) ?? []).filter(
          target => parentByTarget.get(target.id) === info.resource.id,
        ),
      );
    });
    return linked;
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
      const parentId = resource.parentId ? resource.parentId : selectedResourceId;
      const ancestors = getFolderHierarchy(parentId).map(({ id }) => id);
      setExpandedNodes(current => Array.from(new Set([...current, ...ancestors])));
    }
  }, [selectedResourceId, resources, resource, getFolderHierarchy]);

  return { dataTree, onNodeSelect, onNodeToggle, expandedNodes, setExpandedNodes, isLoading };
};
