import { BpmnLayoutRouteParams } from '.';
import queryClient from '../../queryClient';
import { getResourceQuery } from '../../api/resources/resources.queries';
import { getRootResource, isRoot } from '../../shared/helpers/resource';

export const loader = async ({ params }: { params: BpmnLayoutRouteParams }) => {
  const { resourceId } = params;
  let resourcePromise;

  if (isRoot(resourceId)) {
    // The V3 shell uses /root as its root-folder route. Do not redirect to
    // /reference/tree, which belongs to the removed legacy route set.
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
