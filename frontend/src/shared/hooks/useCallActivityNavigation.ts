import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import queryClient from '../../queryClient';
import { getResourceQuery, resourcesQuery } from '../../api/resources/resources.queries';
import { contentsQuery, getXmlContentQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../Types';
import { ResourceType } from '../types/BpmnResource';
import { getProcessLinks } from '../../Components/BusinessComponents/FolderTree/processLinks';
import { useSnackbar } from './useSnackbar';

type CallActivityEvent = {
  element?: {
    id?: string;
    type?: string;
    businessObject?: {
      $type?: string;
      id?: string;
      calledElement?: string;
      isExpanded?: boolean;
    };
  };
  stopPropagation: () => void;
};

type BpmnEventBus = {
  on: (
    eventName: string,
    priority: number,
    callback: (event: any) => void,
  ) => void;
  off: (
    eventName: string,
    callback: (event: any) => void,
  ) => void;
  fire: (eventName: string, event: any) => void;
};

type BpmnInstance = {
  get: (serviceName: string) => any;
};

/**
 * Linked Call Activities open their target process on double-click. A single
 * click remains available to select the activity and show its details.
 */
export const useCallActivityNavigation = (
  bpmnInstance: BpmnInstance,
  enableSingleClick = false,
  currentResourceId?: string,
) => {
  const navigate = useNavigate();
  const { showAlert } = useSnackbar();

  useEffect(() => {
    const eventBus = bpmnInstance.get('eventBus') as BpmnEventBus;
    let indicatorOverlayId: string | number | undefined;

    const resolveTargetResourceId = async (reference: string): Promise<string | undefined> => {
      // Resource IDs take precedence. Some collapsed SubProcesses refer to a
      // BPMN process ID instead, so fall back to an unambiguous XML lookup.
      try {
        const directResource = await queryClient.fetchQuery(getResourceQuery(reference));
        if (directResource?.id && directResource.id !== currentResourceId) {
          return directResource.id;
        }
      } catch {
        // The reference may be a BPMN process ID rather than a resource ID.
      }

      const resources = await queryClient.fetchQuery(
        resourcesQuery({ type: ResourceType.Process }),
      );
      const candidates = await Promise.all(resources
        .filter((resource: Resource) => resource.id !== currentResourceId)
        .map(async (resource: Resource) => {
          const contents = await queryClient.fetchQuery(contentsQuery(resource.id)).catch(() => [] as Content[]);
          const publishedContent = contents
            .filter((content: Content) => content.status === ContentStatusEnum.Published)
            .sort((a: Content, b: Content) => (b.version ?? 0) - (a.version ?? 0))[0];
          if (!publishedContent) return null;

          const xml = await queryClient
            .fetchQuery(getXmlContentQuery(resource.id, publishedContent.id))
            .catch(() => '');
          return { id: resource.id, processIds: getProcessLinks(xml).processIds };
        }));

      const matches = candidates.filter(
        (candidate): candidate is { id: string; processIds: string[] } =>
          Boolean(candidate?.processIds.includes(reference)),
      );
      return matches.length === 1 ? matches[0].id : undefined;
    };

    const navigateToCalledProcess = (event: CallActivityEvent) => {
      const businessObject = event.element?.businessObject;
      const isCallActivity = businessObject?.$type === 'bpmn:CallActivity';
      const isLinkedSubProcess = enableSingleClick &&
        (businessObject?.$type === 'bpmn:SubProcess' || businessObject?.$type === 'bpmn:Transaction') &&
        businessObject?.isExpanded === false;

      if (!isCallActivity && !isLinkedSubProcess) {
        return;
      }

      event.stopPropagation();
      const reference = String(
        isCallActivity ? businessObject?.calledElement ?? '' : businessObject?.id ?? '',
      ).trim();
      if (!reference) {
        showAlert({
          message: isCallActivity
            ? 'Cette activité d’appel n’est pas liée à un processus BPMN Tool. Sélectionnez un processus cible dans les propriétés de l’activité.'
            : 'Ce sous-processus ne référence aucun processus cible identifiable.',
          severity: 'warning',
        });
        return;
      }

      void resolveTargetResourceId(reference)
        .then(async targetResourceId => {
          if (!targetResourceId) {
            showAlert({
              message: 'Le processus cible est introuvable ou sa référence BPMN est ambiguë.',
              severity: 'warning',
            });
            return;
          }
          // Populate the same cache used by the route loader before navigating.
          await queryClient.fetchQuery(getResourceQuery(targetResourceId));
          navigate(`/${targetResourceId}`);
        })
        .catch(() =>
          showAlert({
            message:
              'Accès au processus impossible : vous ne disposez pas des droits nécessaires ou le processus n’est plus disponible.',
            severity: 'danger',
          }),
        );
    };

    const removeIndicators = () => {
      const overlays = bpmnInstance.get('overlays');
      const canvas = bpmnInstance.get('canvas');
      const registry = bpmnInstance.get('elementRegistry');
      if (indicatorOverlayId !== undefined) overlays?.remove?.(indicatorOverlayId);
      indicatorOverlayId = undefined;
      (registry?.getAll?.() ?? []).forEach((element: any) => {
        canvas?.removeMarker?.(element.id, 'bpmn-call-activity-navigable');
      });
    };

    // Mark linked activities only with a pointer cursor. The blue link badge
    // itself is created only after the user clicks a specific activity.
    const decorateCallActivities = () => {
      if (!enableSingleClick) return;
      const registry = bpmnInstance.get('elementRegistry');
      const canvas = bpmnInstance.get('canvas');
      const elements = registry?.getAll?.() ?? [];

      elements.forEach((element: any) => {
        const businessObject = element.businessObject;
        if (businessObject?.$type === 'bpmn:CallActivity') {
          canvas?.addMarker?.(element.id, 'bpmn-call-activity');
          if (String(businessObject.calledElement ?? '').trim()) {
            canvas?.addMarker?.(element.id, 'bpmn-call-activity-navigable');
          }
        }
      });
    };

    const showIndicatorForSelectedCallActivity = (event: any) => {
      if (!enableSingleClick) return;
      if (indicatorOverlayId !== undefined) {
        bpmnInstance.get('overlays')?.remove?.(indicatorOverlayId);
        indicatorOverlayId = undefined;
      }

      const element = (event.newSelection ?? [])[0];
      if (
        !element?.id ||
        element.businessObject?.$type !== 'bpmn:CallActivity' ||
        !String(element.businessObject.calledElement ?? '').trim()
      ) {
        return;
      }

      const indicator = document.createElement('button');
      indicator.type = 'button';
      indicator.className = 'bpmn-call-activity-link-indicator bpmn-selection-arrow-inward';
      indicator.textContent = '↙';
      indicator.title = 'Ouvrir le processus appelé';
      indicator.setAttribute('aria-label', 'Ouvrir le processus appelé');
      indicator.style.pointerEvents = 'auto';
      indicator.style.cursor = 'pointer';
      indicator.addEventListener('click', clickEvent => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        eventBus.fire('element.dblclick', {
          element,
          stopPropagation: () => undefined,
        });
      });
      indicatorOverlayId = bpmnInstance.get('overlays')?.add?.(element, {
        position: { bottom: -7, right: -8 },
        html: indicator,
      });
    };

    eventBus.on('element.dblclick', 1500, navigateToCalledProcess);

    if (enableSingleClick) {
      eventBus.on('selection.changed', 1000, showIndicatorForSelectedCallActivity);
      eventBus.on('import.done', 1000, decorateCallActivities);
      // Some viewer instances are already imported when the hook is mounted.
      decorateCallActivities();
    }

    return () => {
      eventBus.off('element.dblclick', navigateToCalledProcess);
      if (enableSingleClick) {
        eventBus.off('import.done', decorateCallActivities);
        eventBus.off('selection.changed', showIndicatorForSelectedCallActivity);
        removeIndicators();
      }
    };
  }, [bpmnInstance, enableSingleClick, navigate, showAlert]);
};
