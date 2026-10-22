import { BpmnLayoutRouteParams } from '.';
import queryClient from '../../queryClient';
import { getResourceQuery } from '../../api/resources/resources.queries';
import { isRoot } from '../../shared/helpers/resource';
import { redirect } from 'react-router-dom';

export const loader = async ({ params }: { params: BpmnLayoutRouteParams }) => {
  const { resourceId } = params;
  let resourcePromise;

  if (isRoot(resourceId)) {
    throw redirect('/reference/tree');
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
