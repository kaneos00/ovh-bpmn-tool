import { BpmnLayoutRouteParams } from '.';
import queryClient from '../../queryClient';
import { getResourceQuery } from '../../api/resources/resources.queries';
import { getRootResource, isRoot } from '../../shared/helpers/resource';
import { resourcesQuery } from '../../api/resources/resources.queries';
import { ResourceType } from '../../shared/types/BpmnResource';
import { redirect } from 'react-router-dom';

export const loader = async ({ params }: { params: BpmnLayoutRouteParams }) => {
  const { resourceId } = params;
  let resourcePromise;

  if (isRoot(resourceId)) {
    const processes = await queryClient.fetchQuery(resourcesQuery({ type: ResourceType.Process }));
    const firstProcess = [...processes].sort((a, b) => a.name.localeCompare(b.name, 'fr'))[0];
    if (firstProcess) throw redirect(`/${firstProcess.id}`);
    resourcePromise = Promise.resolve(getRootResource());
  } else {
    const resourceQuery = getResourceQuery(resourceId);
    resourcePromise =
      queryClient.getQueryData(resourceQuery.queryKey) ??
      queryClient.fetchQuery(resourceQuery);
  }

  return {
    resource: resourcePromise,
  };
};
