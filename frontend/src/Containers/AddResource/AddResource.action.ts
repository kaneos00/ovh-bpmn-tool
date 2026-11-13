import queryClient, { apiClient } from '../../queryClient';
import { isRoot } from '../../shared/helpers/resource';
import {
  createResource,
  deleteResource,
  QUERY_KEY as resourceQueryKey,
} from '../../api/resources/resources.queries';
import { ResourceType } from '../../shared/types/BpmnResource';

import { AddResourceParams } from '.';

export const action = async ({
  request,
  params,
}: {
  request: Request;
  params: AddResourceParams;
}) => {
  const url = new URL(request.url);
  const resourceType = url.searchParams.get('type');
  const projectId = url.searchParams.get('projectId');
  const { resourceId } = params;

  if (resourceType === ResourceType.Process && !projectId) {
    return { error: new Error('Sélectionnez un projet avant de créer un processus.') };
  }

  const formData = await request.formData();
  const resourceData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    parentId: !isRoot(resourceId) ? resourceId : undefined,
    type: resourceType,
  };

  let createdResourceId: string | undefined;
  try {
    const response = await createResource(resourceData) as { id?: string };
    createdResourceId = response.id;

    // A process resource must also be attached to the active project. Keep
    // this second authorization check server-side; if it fails, remove the
    // just-created orphan resource rather than leaving it outside the project.
    if (resourceType === ResourceType.Process && projectId) {
      if (!createdResourceId) {
        throw new Error('Le serveur n’a pas retourné l’identifiant du processus créé.');
      }
      try {
        await apiClient.post(`/projects/${projectId}/processes`, {
          resourceId: createdResourceId,
          usage: 'project-specific',
        });
      } catch (linkError) {
        try {
          await deleteResource(createdResourceId);
        } catch {
          // Preserve the original project-link error; cleanup is best-effort.
        }
        throw linkError;
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [resourceQueryKey] }),
      queryClient.invalidateQueries({ queryKey: [resourceQueryKey, 'explorer'] }),
      queryClient.invalidateQueries({ queryKey: ['my-workspace'] }),
    ]);
    // Ensure the explorer is refreshed before the action returns; otherwise
    // React Router can navigate back while the cached tree still shows the
    // previous resource hierarchy.
    await Promise.all([
      queryClient.refetchQueries({ queryKey: [resourceQueryKey, 'explorer'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['my-workspace'], type: 'active' }),
    ]);
    return response;
  } catch (error) {
    return { error };
  }
};
