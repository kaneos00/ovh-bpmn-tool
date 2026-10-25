import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from 'react-query';

import { foldersQuery } from '../../api/resources/resources.queries';
import { getRootResource } from '../helpers/resource';
import { auditFolderHierarchy } from '../helpers/folderHierarchyAudit';
import { useSnackbar } from './useSnackbar';

import type { Resource } from '../../Types';

export const useFolders = () => {
  const { data: folders, isLoading } = useQuery(foldersQuery());

  const hierarchyIssues = useMemo(
    () => auditFolderHierarchy(folders ?? []),
    [folders],
  );
  const hierarchyWarningShownRef = useRef(false);
  const { showAlert } = useSnackbar();

  useEffect(() => {
    if (hierarchyIssues.length > 0 && !hierarchyWarningShownRef.current) {
      hierarchyWarningShownRef.current = true;
      const issueSummary = hierarchyIssues
        .slice(0, 3)
        .map(issue => `${issue.resourceId} (${issue.type})`)
        .join(', ');
      const remainingCount = hierarchyIssues.length - 3;
      const remainingSummary = remainingCount > 0 ? `, +${remainingCount} autre(s)` : '';
      showAlert({
        message: `Incohérences de hiérarchie du référentiel : ${issueSummary}${remainingSummary}. Aucune donnée n'a été modifiée.`,
        severity: 'warning',
      });
    }
  }, [hierarchyIssues, showAlert]);

  const makeFlatHierarchy = (
    flatTree: Resource[],
    resourceId: string,
    visited = new Set<string>(),
  ): Resource[] => {
    // Malformed parent references can form cycles. Keep each folder once and
    // stop at the first repeated ID instead of recursing forever.
    if (visited.has(resourceId)) {
      return flatTree;
    }
    visited.add(resourceId);

    const folder = (folders as Resource[]).find(({ id }) => id === resourceId);
    if (folder) {
      flatTree.push(folder);
    }

    return folder?.parentId
      ? makeFlatHierarchy(flatTree, folder.parentId, visited)
      : flatTree;
  };

  /**
   * Return a flat hierarchy of folders
   */
  const getFolderHierarchy = useCallback(
    (folderId: string) => {
      if (!folders) {
        return [];
      }

      return [getRootResource(), ...makeFlatHierarchy([], folderId).reverse()];
    },
    [folders],
  );

  return {
    folders: folders ?? [],
    isLoading,
    getFolderHierarchy,
    hierarchyIssues,
  };
};
