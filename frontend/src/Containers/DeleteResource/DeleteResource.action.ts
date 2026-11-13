import {
  deleteResource,
  QUERY_KEY as resourceQueryKey,
} from '../../api/resources/resources.queries';
import queryClient from '../../queryClient';
import { ResourceType } from '../../shared/types/BpmnResource';

export const action = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const targetResourceId = url.searchParams.get('targetResourceId');

  if (!targetResourceId) {
    return { error: new Error('Identifiant du processus à supprimer manquant.') };
  }

  const formData = await request.formData();
  const deletedResourceType = formData.get('resourceType') as ResourceType;

  try {
    await deleteResource(targetResourceId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [resourceQueryKey] }),
      queryClient.invalidateQueries({ queryKey: [resourceQueryKey, 'explorer'] }),
      queryClient.invalidateQueries({ queryKey: ['my-workspace'] }),
    ]);
    // Refetch active navigation data before returning to the workspace so a
    // deleted process cannot remain as a stale clickable explorer entry.
    await Promise.all([
      queryClient.refetchQueries({ queryKey: [resourceQueryKey, 'explorer'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['my-workspace'], type: 'active' }),
    ]);

    return {
      deletedResourceType,
    };
  } catch (error) {
    return {
      deletedResourceType,
      error,
    };
  }
};
