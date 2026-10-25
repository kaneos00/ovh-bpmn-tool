import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useFolders } from '../../../shared/hooks/useFolders';
import { useResource } from '../../../shared/hooks/useResource';
import { useFolderTree } from '../../../Components/BusinessComponents/FolderTree/hooks/useFolderTree';
import { isProcess } from '../../../shared/helpers/resource';

import type { BpmnLayoutRouteParams } from '..';

export const useBpmnLayoutBreadcrumbs = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;

  const { getFolderHierarchy } = useFolders();
  const { resource } = useResource(resourceId);
  // Use the same assembled tree as the Explorer so breadcrumbs also represent
  // linked processes nested beneath their caller, not only physical folder parents.
  const { dataTree } = useFolderTree(resourceId);

  const getBreadCrumbs = useCallback(() => {
    if (!resource) return [];

    const findPath = (
      node: { id: string; name: string; type: string; targetId?: string; children?: any[] },
      ancestors: Array<{ id: string; name: string; type: string; targetId?: string }> = [],
    ): Array<{ id: string; name: string; type: string; targetId?: string }> | null => {
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
      return treePath.map(node => ({
        id: node.id,
        label: node.id === 'root' ? 'Référentiel' : node.name,
        to: node.id === 'root' ? '/root' : `/${node.targetId ?? node.id}`,
      }));
    }

    // Fallback for resources not currently represented in the Explorer tree.
    const folderHierarchy = getFolderHierarchy(
      isProcess(resource) ? (resource.parentId ?? 'root') : resourceId,
    ).map(({ id, name }) => ({
      id,
      label: id === 'root' ? 'Référentiel' : name,
      to: id === 'root' ? '/root' : `/${id}`,
    }));

    return [
      ...folderHierarchy,
      ...(isProcess(resource)
        ? [{ id: resource.id, label: resource.name, to: `/${resource.id}` }]
        : []),
    ];
  }, [resourceId, resource, getFolderHierarchy, dataTree]);

  return { getBreadCrumbs };
};
