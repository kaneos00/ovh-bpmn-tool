import { useMemo, useState, useEffect } from 'react';
import { useQuery } from 'react-query';

import { explorerQuery } from '../../../../api/resources/resources.queries';
import { type Resource } from '../../../../Types';
import { useFolders } from '../../../../shared/hooks/useFolders';
import { useResource } from '../../../../shared/hooks/useResource';
import { ResourceType } from '../../../../shared/types/BpmnResource';
import { resolveLinkedChildren } from '../processLinks';
import { useActiveProject } from '../../../../shared/hooks/useActiveProject';

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
  const { data: explorerData, isLoading: isExplorerLoading } = useQuery(explorerQuery());
  const resources = explorerData?.resources;
  const {
    projects,
    activeProject,
    activeProjectId,
    projectProcessIds,
    isLoading: areProjectsLoading,
  } = useActiveProject();

  // A process can be reached directly from a project even when the active
  // project has not yet been restored from local storage. Infer it only when
  // the current resource belongs to exactly one project; never guess when it
  // is shared by several projects.
  const projectForTree = useMemo(() => {
    if (activeProject) return activeProject;
    const matchingProjects = projects.filter(project =>
      project.processes.some(process => process.resourceId === selectedResourceId),
    );
    return matchingProjects.length === 1 ? matchingProjects[0] : null;
  }, [activeProject, projects, selectedResourceId]);

  const effectiveProjectId = activeProjectId ?? projectForTree?.id ?? null;
  const effectiveProcessIds = useMemo(
    () => new Set(projectForTree?.processes.map(process => process.resourceId) ?? projectProcessIds),
    [projectForTree, projectProcessIds],
  );

  const scopedResources = useMemo(() => {
    if (!effectiveProjectId) return [];

    // The workspace endpoint is the authoritative list of processes attached
    // to a project. The explorer endpoint supplies their folder hierarchy and
    // BPMN call-activity links, but may omit resources for which the current
    // account has only project-scoped navigation rights. Add those missing
    // project processes as root entries so they remain reachable.
    const byId = new Map((resources ?? []).map(item => [item.id, item]));
    const workspaceProcesses = projectForTree?.processes ?? [];
    workspaceProcesses.forEach(process => {
      if (!byId.has(process.resourceId)) {
        byId.set(process.resourceId, {
          id: process.resourceId,
          name: process.name,
          depth: 0,
          description: '',
          type: ResourceType.Process,
          sourceResourceId: process.sourceResourceId,
        } as Resource);
      }
    });

    const allResources = Array.from(byId.values());
    const allowedIds = new Set(effectiveProcessIds);
    effectiveProcessIds.forEach(id => {
      let current = byId.get(id);
      while (current?.parentId) {
        allowedIds.add(current.parentId);
        current = byId.get(current.parentId);
      }
    });
    return allResources.filter(item => allowedIds.has(item.id));
  }, [resources, effectiveProjectId, effectiveProcessIds, projectForTree]);

  const processResources = useMemo(
    () => scopedResources.filter(item => item.type === ResourceType.Process),
    [scopedResources],
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
    const rootResources = scopedResources;

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
  }, [scopedResources, linkedChildrenByResource, linkedTargetIds]);

  useEffect(() => {
    if (!scopedResources.length || !resource || !scopedResources.some(item => item.id === resource.id)) return;

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
  }, [selectedResourceId, scopedResources, resource, getFolderHierarchy, dataTree]);

  return {
    dataTree,
    expandedNodes,
    setExpandedNodes,
    isLoading: isExplorerLoading || areProjectsLoading,
    activeProjectId: effectiveProjectId,
  };
};
