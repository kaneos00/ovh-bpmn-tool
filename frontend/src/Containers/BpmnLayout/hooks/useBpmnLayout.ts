import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import {
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router-dom';

import { useResource } from '../../../shared/hooks/useResource';
import {
  ResourceAction,
  ResourceType,
} from '../../../shared/types/BpmnResource';
import { useSnackbar } from '../../../shared/hooks/useSnackbar';
import { contentsQuery } from '../../../api/contents/contents.queries';

import type { BpmnLayoutLoaderData, BpmnLayoutRouteParams } from '..';
import type { ActionResponse } from '../../../shared/types/ActionResponse';
import { ContentStatusEnum, type Content, type Resource } from '../../../Types';
import { useModelerInstance } from '../../../shared/hooks/useModelerInstance';

export const useBpmnLayout = () => {
  const { resourceId } = useParams() as BpmnLayoutRouteParams;
  const location = useLocation();
  const actionData = useActionData() as Resource & ActionResponse;
  const loaderData = useLoaderData() as BpmnLayoutLoaderData;

  const { getModelerInstance } = useModelerInstance();
  const bpmnModelerInstance = getModelerInstance();

  const navigate = useNavigate();
  const submit = useSubmit();
  const { showAlert } = useSnackbar();
  const handledSearchTargetRef = useRef<string | null>(null);

  const { resource } = useResource(resourceId);
  const {
    data: contents,
    isLoading: contentsLoading,
  } = useQuery({
    ...contentsQuery(resourceId),
    enabled: Boolean(resource && resource.type === ResourceType.Process),
  });

  const getResourceLink = (id: string) => `/${id}`;

  const getResourceActionLink = (id: string, action: ResourceAction) => {
    return `/${resourceId}/${action}?targetResourceId=${id}`;
  };

  const onFolderTreeItemClick = (id: string, type: ResourceType) => {
    if (type === ResourceType.Process) navigate(`/${id}`);
  };

  const onFolderTreeItemDelete = useCallback((id: string) => {
    if (resourceId === id) navigate('/');
  }, [resourceId, navigate]);

  /**
   * Open the Modeler using the same workflow as the normal Modeler button.
   * Recherche may optionally provide the BPMN element to select afterwards.
   */
  const onModelerBtnClick = useCallback(async (targetElementId?: string) => {
    const availableContents = contents || [];
    const lastVersionContent = availableContents.reduce<Content | undefined>(
      (latest, content) =>
        !latest || content.version > latest.version ? content : latest,
      undefined,
    );
    let actionPayload: {
      action: string;
      contentId?: string;
      content?: string;
      targetElementId?: string;
    } = { action: '' };

    if (lastVersionContent) {
      if (lastVersionContent.status === ContentStatusEnum.Draft) {
        const elementQuery = targetElementId
          ? `?element=${encodeURIComponent(targetElementId)}`
          : '';
        return navigate(`./modeler${elementQuery}`);
      }

      if (lastVersionContent.status === ContentStatusEnum.Published) {
        actionPayload = {
          action: 'createContentFromClone',
          contentId: lastVersionContent.id,
          ...(targetElementId ? { targetElementId } : {}),
        };
      }
    } else {
      let xmlContent = '';
      try {
        await bpmnModelerInstance.createDiagram();
        const draftContentXml = await bpmnModelerInstance.saveXML();
        xmlContent = draftContentXml.xml || '';
      } catch {
        xmlContent = '';
      }

      actionPayload = {
        action: 'createContent',
        content: xmlContent,
        ...(targetElementId ? { targetElementId } : {}),
      };
    }

    return submit(actionPayload, { method: 'post' });
  }, [contents, bpmnModelerInstance, navigate, submit]);

  /**
   * Recherche navigation entry point.
   */
  useEffect(() => {
    const targetElementId = new URLSearchParams(location.search).get('element');
    const isModelerRoute = location.pathname.endsWith('/modeler');

    if (!targetElementId || isModelerRoute) return;
    if (handledSearchTargetRef.current === targetElementId) return;
    if (!resource || resource.type !== ResourceType.Process) return;
    if (contentsLoading) return;

    handledSearchTargetRef.current = targetElementId;
    void onModelerBtnClick(targetElementId);
  }, [
    location.pathname,
    location.search,
    resource,
    contentsLoading,
    onModelerBtnClick,
  ]);

  const onCompareClick = useCallback(
    (leftContentId: string, rightContentId: string) => {
      navigate(`/${resourceId}/compare/${leftContentId}/${rightContentId}`);
    },
    [resourceId, navigate],
  );

  const onContentViewerLinkCopy = useCallback(() => {
    if (resource) {
      const baseUrl =
        import.meta.env.MODE === 'development'
          ? `${window.location.protocol}//${window.location.host}`
          : '';

      void navigator.clipboard.writeText(
        `${baseUrl}${import.meta.env.VITE_API_URL as string}/export/${resourceId}.png?authToken=${resource.authToken}`,
      );

      showAlert({
        message: 'Link successfully copied to clipboard!',
        severity: 'success',
      });
    }
  }, [resourceId, resource, showAlert]);

  const onContentUpload = (content: string) => {
    return submit({ action: 'uploadContent', content }, { method: 'post' });
  };

  const onContentPublish = () => navigate(`/${resourceId}/publish`);

  const onContentErase = (contentId: string) => {
    return submit({ action: 'eraseContent', contentId }, { method: 'delete' });
  };

  const onContentClone = (contentId: string) => {
    return submit({ action: 'cloneContent', contentId }, { method: 'post' });
  };

  const processActionMessages: Record<string, string> = {
    uploadContent: 'Content has been successfully uploaded.',
    publishContent: 'Content has been successfully published.',
    eraseContent: 'Content has been successfully erased.',
    cloneContent: 'Content has been successfully cloned.',
  };

  const processActionErrorMessages: Record<string, string> = {
    uploadContent: 'An error occured during content upload.',
    publishContent: 'Content has been successfully published.',
    eraseContent: 'An error occured during content erasure.',
    cloneContent: 'An error occured during content cloning.',
  };

  useEffect(() => {
    if (actionData && !actionData.error && actionData.formAction) {
      showAlert({
        message: processActionMessages[actionData.formAction as string],
        severity: 'success',
      });
    } else if (actionData?.error && actionData?.formAction) {
      const message = processActionErrorMessages[actionData.formAction as string];

      if (message) {
        showAlert({
          message,
          severity: 'danger',
        });
      }
    }
  }, [actionData, showAlert]);

  return {
    resource,
    loaderData,
    contents: contents ?? [],
    navigationFns: {
      getResourceLink,
      getResourceActionLink,
    },
    callbacks: {
      folderTree: {
        onFolderTreeItemClick,
        onFolderTreeItemDelete,
      },
      header: {
        onModelerBtnClick,
      },
      processDetails: {
        onContentViewerLinkCopy,
        onCompareClick,
        onContentUpload,
        onContentPublish,
        onContentErase,
        onContentClone,
      },
    },
  };
};