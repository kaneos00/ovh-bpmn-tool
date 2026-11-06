import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useFolders } from '../../../shared/hooks/useFolders';
import { useResource } from '../../../shared/hooks/useResource';
import { useFolderTree } from '../../../Components/BusinessComponents/FolderTree/hooks/useFolderTree';
import type { RenderTree } from '../../../Components/BusinessComponents/FolderTree';
import { isProcess } from '../../../shared/helpers/resource';
import { useActiveProject } from '../../../shared/hooks/useActiveProject';

import type { BpmnLayoutRouteParams } from '..';

export const useBpmnLayoutBreadcrumbs = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;

  const { getFolderHierarchy } = useFolders();
  const { resource } = useResource(resourceId);
  const { activeProject } = useActiveProject();
  // Use the same assembled tree as the Explorer so breadcrumbs also represent
  // linked processes nested beneath their caller, not only physical folder parents.
  const { dataTree } = useFolderTree(resourceId);

  const getBreadCrumbs = useCallback(() => {
    if (!resource) return [{ id: 'home', label: 'Tous les projets', to: '/projects' }];

    const findPath = (
      node: RenderTree,
      ancestors: RenderTree[] = [],
    ): RenderTree[] | null => {
      const current = [...ancestors, node];
      if (node.id === resourceId || node.targetId === resourceId) return current;
      for (const child of node.children ?? []) {
        const found = findPath(child, current);
        if (found) return found;
      }
      return null;
    };

    const treePath = findPath(dataTree);
    if (treePath?.length) {
      return [
        { id: 'home', label: 'Tous les projets', to: '/projects' },
        ...(activeProject ? [{
          id: `project-${activeProject.id}`,
          label: activeProject.name,
          to: '/root',
        }] : []),
        ...treePath.filter(node => node.id !== 'root').map(node => ({
          id: node.id,
          label: node.name,
          to: `/${node.targetId ?? node.id}`,
        })),
      ];
    }

    // Fallback for resources not currently represented in the Explorer tree.
    const folderHierarchy = getFolderHierarchy(
      isProcess(resource) ? (resource.parentId ?? 'root') : resourceId,
    ).filter(({ id }) => id !== 'root').map(({ id, name }) => ({
      id,
      label: name,
      to: `/${id}`,
    }));

    return [
      { id: 'home', label: 'Tous les projets', to: '/projects' },
      ...(activeProject ? [{
        id: `project-${activeProject.id}`,
        label: activeProject.name,
        to: '/root',
      }] : []),
      ...folderHierarchy,
      ...(isProcess(resource)
        ? [{ id: resource.id, label: resource.name, to: `/${resource.id}` }]
        : []),
    ];
  }, [resourceId, resource, getFolderHierarchy, dataTree, activeProject]);

  return { getBreadCrumbs };
};
