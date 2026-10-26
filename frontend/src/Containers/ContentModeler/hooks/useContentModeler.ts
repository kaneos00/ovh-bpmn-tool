import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActionData, useNavigate, useParams, useSubmit } from 'react-router-dom';
import { useQuery } from 'react-query';

import type { ContentModelerRouteParams } from '..';
import {
  contentsQuery,
  getXmlContentQuery,
} from '../../../api/contents/contents.queries';
import { useSnackbar } from '../../../shared/hooks/useSnackbar';
import { ActionResponse } from '../../../shared/types/ActionResponse';

import { ContentStatusEnum, type Content } from '../../../Types';
import { useResource } from '../../../shared/hooks/useResource';
import Modeler from 'camunda-bpmn-js/lib/base/Modeler';
import { paginateBpmnSvg } from '../../../shared/utils/paginatedBpmnSvg';
import { HttpError } from '../../../shared/api/httpError';

export const useContentModeler = (bpmnModelerInstance: Modeler) => {
  const { resourceId } = useParams() as ContentModelerRouteParams;
  const actionData = useActionData() as Content & ActionResponse;
  const navigate = useNavigate();

  const submit = useSubmit();
  const { showAlert } = useSnackbar();

  const [isShortcurtModalOpen, setIsShortcurtModalOpen] = useState(false);

  const { data: contents } = useQuery(contentsQuery(resourceId));
  const { resource } = useResource(resourceId);
  const sourceResourceId = resource?.sourceResourceId ?? undefined;
  const { data: sourceContents } = useQuery({
    ...contentsQuery(sourceResourceId ?? ''),
    enabled: Boolean(sourceResourceId),
  });

  const draftContent = useMemo(() => {
    if (!contents) {
      return undefined;
    }

    return contents.find(
      ({ status }: Content) => status === ContentStatusEnum.Draft,
    );
  }, [contents]);

  const sourceContent = useMemo(() => {
    if (!sourceContents?.length) {
      return undefined;
    }

    return [...sourceContents].sort((left, right) => {
      const rank = (status: ContentStatusEnum) => {
        switch (status) {
          case ContentStatusEnum.Published:
            return 2;
          case ContentStatusEnum.Draft:
            return 1;
          default:
            return 0;
        }
      };
      return rank(right.status) - rank(left.status) ||
        (right.version ?? 0) - (left.version ?? 0);
    })[0];
  }, [sourceContents]);

  const { data: draftXmlContent } = useQuery({
    ...getXmlContentQuery(resourceId, draftContent?.id as string),
    enabled: !!draftContent?.id,
  });

  const onCompareWithSource = useCallback(() => {
    if (!sourceResourceId || !sourceContent?.id || !draftContent?.id) {
      showAlert({
        message: 'La comparaison nécessite un diagramme source et un brouillon du clone.',
        severity: 'warning',
      });
      return;
    }

    navigate(
      `/compare-resources/${sourceResourceId}/${sourceContent.id}/${resourceId}/${draftContent.id}`,
    );
  }, [sourceResourceId, sourceContent?.id, draftContent?.id, resourceId, navigate, showAlert]);

  const onFileUpload = useCallback(
    async (files: FileList) => {
      try {
        const processContent = await files[0].text();
        await bpmnModelerInstance.importXML(processContent);
      } catch {
        showAlert({
          message: 'An error occurs during file upload.',
          severity: 'danger',
        });
      }
    },
    [bpmnModelerInstance, showAlert],
  );

  /**
   * File export action
   */
  const triggerDownload = useCallback(
    (content: string, exportType: 'svg' | 'bpmn', suffix = ''): void => {
      if (resource && draftContent) {
        const hiddenElement = document.createElement('a');
        const mimeType = exportType === 'svg' ? 'image/svg+xml' : 'text/xml';
        const fileContent = new Blob([content], { type: mimeType });
        const fileName = `${resource.name}_v${draftContent.version}${suffix}`;
        const objectUrl = window.URL.createObjectURL(fileContent);
        hiddenElement.setAttribute('download', `${fileName}.${exportType}`);
        hiddenElement.setAttribute('href', objectUrl);
        hiddenElement.style.display = 'none';
        document.body.appendChild(hiddenElement);
        hiddenElement.click();
        document.body.removeChild(hiddenElement);
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      }
    },
    [draftContent, resource],
  );

  const onFileExport = useCallback(
    async (exportType: 'svg' | 'bpmn' | 'svg-a4-portrait' | 'svg-a4-landscape') => {
      try {
        if (exportType === 'bpmn') {
          const file = await bpmnModelerInstance.saveXML({ format: true });
          if (file.xml) triggerDownload(file.xml, 'bpmn');
          return;
        }

        const file = await bpmnModelerInstance.saveSVG();
        if (exportType === 'svg') {
          triggerDownload(file.svg, 'svg');
          return;
        }

        const orientation =
          exportType === 'svg-a4-portrait' ? 'portrait' : 'landscape';
        const pages = paginateBpmnSvg(file.svg, {
          orientation,
          fontFamily: 'Public Sans, Arial, sans-serif',
          fontSizeMm: 3.5,
          title: resource?.name ?? 'Export BPMN',
        });

        pages.forEach((page, index) => {
          triggerDownload(
            page,
            'svg',
            `_A4_${orientation}_p${String(index + 1).padStart(2, '0')}`,
          );
        });
        showAlert({
          message: `Export A4 généré : ${pages.length} page(s) SVG. Si le navigateur bloque les téléchargements multiples, autorisez-les pour ce site.`,
          severity: 'success',
        });
      } catch (error) {
        showAlert({
          message:
            error instanceof Error
              ? `Échec de l'export ${exportType} : ${error.message}`
              : `Échec de l'export ${exportType}.`,
          severity: 'danger',
        });
      }
    },
    [bpmnModelerInstance, resource, triggerDownload, showAlert],
  );

  const saveDiagram = useCallback(
    async (action: string, content: Content) => {
      const contentXml = await bpmnModelerInstance.saveXML({ format: true });
      if (contentXml.xml) {
        submit(
          {
            action,
            contentId: content.id,
            content: contentXml.xml,
          },
          { method: 'put' },
        );
      }
    },
    [bpmnModelerInstance, submit],
  );

  const onDiagramSave = useCallback(async () => {
    if (!draftContent) {
      return;
    }

    try {
      saveDiagram('saveContent', draftContent);
    } catch {
      showAlert({
        message: 'An error occur during saving content.',
        severity: 'danger',
      });
    }
  }, [draftContent, saveDiagram, showAlert]);

  const onDiagramPublish = useCallback(async () => {
    if (!draftContent) {
      return;
    }

    try {
      saveDiagram('saveContentBeforePublish', draftContent);
    } catch {
      showAlert({
        message: 'An error occur during saving content.',
        severity: 'danger',
      });
    }
  }, [draftContent, saveDiagram, showAlert]);

  const processActionMessages: Record<string, string> = {
    saveContent: 'Content has been saved successfully.',
  };

  const getSaveErrorMessage = (error: unknown, formAction: string) => {
    if (error instanceof HttpError && error.status === 403) {
      const apiMessage = String(error.errorResponse?.message ?? '').toLowerCase();

      if (apiMessage.includes('common processes are read-only')) {
        return "Ce processus est partagé comme processus commun et ne peut pas être modifié directement. Pour le modifier, créez d’abord une copie du processus, puis travaillez sur cette copie.";
      }

      if (apiMessage.includes('modeler access') || apiMessage.includes('editing this resource requires')) {
        return "Vous n’avez pas les droits nécessaires pour modifier ce processus. Un rôle de modélisateur ou d’administrateur du projet est requis.";
      }

      return "La modification est refusée : vous n’avez pas les droits nécessaires sur ce processus.";
    }

    if (error instanceof HttpError && error.errorResponse?.message) {
      return Array.isArray(error.errorResponse.message)
        ? error.errorResponse.message.join(', ')
        : error.errorResponse.message;
    }

    return formAction === 'saveContentBeforePublish'
      ? "La publication a échoué : le brouillon n’a pas pu être enregistré."
      : "L’enregistrement du processus a échoué.";
  };

  useEffect(() => {
    if (actionData && !actionData.error) {
      const message = processActionMessages[actionData.formAction as string];

      if (message) {
        showAlert({
          message,
          severity: 'success',
        });
      }
    } else if (actionData && actionData.error) {
      const message = getSaveErrorMessage(
        actionData.error,
        actionData.formAction as string,
      );

      if (message) {
        showAlert({
          message,
          severity: 'danger',
        });
      }
    }
  }, [actionData, showAlert]);

  return {
    resourceId,
    draftXmlContent: draftXmlContent ?? '',
    isShortcurtModalOpen,
    actionData,
    setIsShortcurtModalOpen,
    onFileUpload,
    onFileExport,
    onDiagramSave,
    onDiagramPublish,
    onCompareWithSource: sourceResourceId ? onCompareWithSource : undefined,
  };
};
