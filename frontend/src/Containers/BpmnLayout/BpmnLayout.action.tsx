import queryClient from '../../queryClient';
import {
  createContent,
  deleteContent,
  cloneContent,
  contentsQuery,
} from '../../api/contents/contents.queries';

import { BpmnLayoutRouteParams } from '.';
import { redirect } from 'react-router-dom';

const createContentAction = async (resourceId: string, formData: FormData) => {
  const contentData = {
    content: formData.get('content') as string,
  };

  const response = await createContent(resourceId, contentData);
  queryClient.invalidateQueries({
    queryKey: contentsQuery(resourceId).queryKey,
  });
  return response;
};

const eraseContentAction = async (resourceId: string, formData: FormData) => {
  const response = await deleteContent(
    resourceId,
    formData.get('contentId') as string,
  );
  queryClient.invalidateQueries({
    queryKey: contentsQuery(resourceId).queryKey,
  });
  return response;
};

const cloneContentAction = async (resourceId: string, formData: FormData) => {
  const response = await cloneContent(
    resourceId,
    formData.get('contentId') as string,
  );
  queryClient.invalidateQueries({
    queryKey: contentsQuery(resourceId).queryKey,
  });
  return response;
};

export const action = async ({
  params,
  request,
}: {
  params: BpmnLayoutRouteParams;
  request: Request;
}) => {
  const { resourceId } = params;

  const formData = await request.formData();
  const formAction = formData.get('action');
  const targetElementId = formData.get('targetElementId') as string | null;
  let actionPromise;

  try {
    switch (formAction) {
      case 'createContent':
      case 'uploadContent':
        actionPromise = createContentAction(resourceId, formData);
        break;
      case 'eraseContent':
        actionPromise = eraseContentAction(resourceId, formData);
        break;
      case 'cloneContent':
      case 'createContentFromClone':
        actionPromise = cloneContentAction(resourceId, formData);
        break;
      default:
        break;
    }

    const response = await actionPromise;

    /*
    ANCIEN REDIRECT — conservé pour comparaison / retour arrière
    return formAction &&
      ['createContent', 'createContentFromClone'].includes(formAction as string)
      ? redirect(`/${resourceId}/modeler`)
      : {
          ...response,
          formAction,
        };
    */

    if (
      formAction &&
      ['createContent', 'createContentFromClone'].includes(formAction as string)
    ) {
      /*
      ANCIEN REDIRECT — conservé pour comparaison / retour arrière
      const elementQuery = targetElementId
        ? `?element=${encodeURIComponent(targetElementId)}`
        : '';
      return redirect(`/${resourceId}/modeler${elementQuery}`);
      */

      // Le clone/création vient de produire le Draft. On transmet son ID au
      // Modeler afin qu'il charge exactement ce contenu, sans dépendre du
      // cache React Query encore en cours d'invalidation.
      const contentId = response?.id as string | undefined;
      const params = new URLSearchParams();
      if (contentId) params.set('contentId', contentId);
      if (targetElementId) params.set('element', targetElementId);
      const query = params.toString();
      return redirect(`/${resourceId}/modeler${query ? `?${query}` : ''}`);
    }

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
