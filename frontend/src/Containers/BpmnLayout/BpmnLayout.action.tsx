import queryClient, { apiClient } from '../../queryClient';
import {
  createContent,
  deleteContent,
  cloneContent,
  contentsQuery,
} from '../../api/contents/contents.queries';

import { BpmnLayoutRouteParams } from '.';
import { redirect } from 'react-router-dom';
import { getResourceQuery } from '../../api/resources/resources.queries';

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
  try {
    const response = await cloneContent(
      resourceId,
      formData.get('contentId') as string,
    );
    queryClient.invalidateQueries({
      queryKey: contentsQuery(resourceId).queryKey,
    });
    return response;
  } catch (error) {
    const apiError = error as {
      response?: { status?: number; data?: { message?: string | string[] } };
      errorResponse?: { message?: string | string[]; statusCode?: number };
      status?: number;
      message?: string;
    };
    const message = apiError.response?.data?.message ?? apiError.errorResponse?.message;
    const status = apiError.response?.status ?? apiError.status ?? apiError.errorResponse?.statusCode;
    const isCommonProcessReadOnly =
      status === 403 &&
      (message === 'Common processes are read-only through resource endpoints' ||
        (Array.isArray(message) && message.includes('Common processes are read-only through resource endpoints')));

    if (!isCommonProcessReadOnly) {
      throw error;
    }

    // A common process cannot receive a draft. Turn this action into an
    // independent resource copy instead, leaving the shared source untouched.
    const resourceQuery = getResourceQuery(resourceId);
    const source = await queryClient.fetchQuery(resourceQuery);
    const clonedResource = await apiClient.post(`/resources/${resourceId}/clone`, {
      name: `${source.name} (copie)`,
    });
    await queryClient.invalidateQueries(['resources']);
    return { clonedResource, clonedAsResource: true };
  }
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
    const cloneResponse = response as {
      clonedAsResource?: boolean;
      clonedResource?: { id: string };
    };
    if (cloneResponse.clonedAsResource && cloneResponse.clonedResource?.id) {
      return redirect(`/${cloneResponse.clonedResource.id}/modeler`);
    }

    return formAction &&
      ['createContent', 'createContentFromClone'].includes(formAction as string)
      ? redirect(`/${resourceId}/modeler`)
      : {
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
