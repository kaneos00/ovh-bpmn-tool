import { useCallback, useMemo } from 'react';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../api/resources/resources.queries';
import { getRootResource } from '../helpers/resource';
import { resolveFolderHierarchy } from '../helpers/folderHierarchy';
import { ResourceType } from '../types/BpmnResource';

import type { Resource } from '../../Types';

export const useFolders = () => {
  // Share the same resources cache as the explorer tree. A separate folders-only
  // query could temporarily expose a different ancestry snapshot during navigation.
  const { data: resources, isLoading } = useQuery<Resource[]>(resourcesQuery());
  const folders = useMemo(
    () => (resources ?? []).filter(resource => resource.type === ResourceType.Folder),
    [resources],
  );

  const inspectFolderHierarchy = useCallback(
    (folderId: string) => resolveFolderHierarchy(folders, folderId),
    [folders],
  );

  const getFolderHierarchy = useCallback(
    (folderId: string) => {
      const { hierarchy } = inspectFolderHierarchy(folderId);
      return [getRootResource(), ...(hierarchy as Resource[])];
    },
    [inspectFolderHierarchy],
  );

  return {
    folders,
    isLoading,
    getFolderHierarchy,
    inspectFolderHierarchy,
  };
};
