import queryClient from '../../queryClient';
import {
  contentsQuery,
  publishContent,
  getContentQuery,
  getXmlContentQuery,
} from '../../api/contents/contents.queries';
import { getResourceQuery } from '../../api/resources/resources.queries';

import type { PublishResourceParams } from '.';

const publishContentAction = async (
  resourceId: string,
  contentId: string,
  pngContent: string,
) => {
  const response = await publishContent(resourceId, contentId, {
    pngContent,
  });

  /*
   * ANCIEN CODE — conservé pour comparaison / retour arrière
   *
   * queryClient.invalidateQueries({
   *   queryKey: getResourceQuery(resourceId).queryKey,
   * });
   * queryClient.invalidateQueries({
   *   queryKey: contentsQuery(resourceId).queryKey,
   * });
   * queryClient.invalidateQueries({
   *   queryKey: getContentQuery(resourceId, contentId).queryKey,
   * });
   * queryClient.invalidateQueries({
   *   queryKey: getXmlContentQuery(resourceId, contentId).queryKey,
   * });
   */

  // Attend la fin des invalidations avant de retourner vers le viewer.
  // Cela évite que le viewer soit monté avec les anciennes données en cache.
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: getResourceQuery(resourceId).queryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: contentsQuery(resourceId).queryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: getContentQuery(resourceId, contentId).queryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: getXmlContentQuery(resourceId, contentId).queryKey,
    }),
  ]);

  return response;
};

export const action = async ({
  params,
  request,
}: {
  params: PublishResourceParams;
  request: Request;
}) => {
  const { resourceId } = params;

  const formData = await request.formData();
  const formAction = formData.get('action');
  const contentId = formData.get('contentId') as string;

  try {
    const response = await publishContentAction(
      resourceId,
      contentId,
      formData.get('pngContent') as string,
    );

    return {
      ...response,
      formAction,
    };
  } catch (error) {
    return {
      formAction,
      error,
    };
  }
};
