import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import queryClient from '../../queryClient';
import { getResourceQuery } from '../../api/resources/resources.queries';
import { useSnackbar } from './useSnackbar';

type CallActivityEvent = {
  element?: {
    id?: string;
    type?: string;
    businessObject?: {
      $type?: string;
      calledElement?: string;
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
) => {
  const navigate = useNavigate();
  const { showAlert } = useSnackbar();

  useEffect(() => {
    const eventBus = bpmnInstance.get('eventBus') as BpmnEventBus;
    let indicatorOverlayId: string | number | undefined;
    let indicatedElementId: string | null = null;

    const navigateToCalledProcess = (event: CallActivityEvent) => {
      const businessObject = event.element?.businessObject;
      if (businessObject?.$type !== 'bpmn:CallActivity') {
        return;
      }

      event.stopPropagation();
      const targetResourceId = String(businessObject.calledElement ?? '').trim();
      if (!targetResourceId) {
        showAlert({
          message:
            'Cette activité d’appel n’est pas liée à un processus BPMN Tool. Sélectionnez un processus cible dans les propriétés de l’activité.',
          severity: 'warning',
        });
        return;
      }

      // Populate the same React Query cache used by the route loader. This
      // avoids a second resource request during navigation, reducing the blank
      // interval before the target process renders while retaining access checks.
      void queryClient
        .fetchQuery(getResourceQuery(targetResourceId))
        .then(() => navigate(`/${targetResourceId}`))
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
      indicatedElementId = null;
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

    const showIndicatorForSelectedElement = (event: CallActivityEvent) => {
      if (!enableSingleClick) return;
      const element = event.element;
      if (indicatorOverlayId !== undefined) {
        bpmnInstance.get('overlays')?.remove?.(indicatorOverlayId);
        indicatorOverlayId = undefined;
      }
      if (element?.id && indicatedElementId === element.id) {
        indicatedElementId = null;
        return;
      }
      indicatedElementId = null;
      if (!element?.id) return;

      const businessObject = element.businessObject as any;
      const type = businessObject?.$type ?? element.type ?? '';
      const isCallActivity = type === 'bpmn:CallActivity';
      const isSubProcess = type === 'bpmn:SubProcess' || type === 'bpmn:Transaction';
      const attrs = businessObject?.$attrs ?? {};
      const hasUrl = [
        businessObject?.url, businessObject?.href, businessObject?.link,
        attrs.url, attrs.href, attrs.link,
      ].some((value) => typeof value === 'string' && value.trim().length > 0);
      const isTask = type === 'bpmn:Task' || type.endsWith(':Task') || type.endsWith('Task');
      const isLinkedTask = isTask && hasUrl;
      if (!isLinkedTask && !isSubProcess && !isCallActivity) return;

      const indicator = document.createElement('span');
      indicator.className = 'bpmn-call-activity-link-indicator';
      indicator.textContent = isLinkedTask ? '↗' : '↙';
      indicator.setAttribute('aria-hidden', 'true');
      indicatorOverlayId = bpmnInstance.get('overlays')?.add?.(element, {
        position: isLinkedTask ? { top: -10, right: -10 } : { top: 4, right: 4 },
        html: indicator,
      });
      indicatedElementId = element.id;
    };

    eventBus.on('element.dblclick', 1500, navigateToCalledProcess);

    if (enableSingleClick) {
      eventBus.on('element.click', 1000, showIndicatorForSelectedElement);
      eventBus.on('import.done', 1000, decorateCallActivities);
      // Some viewer instances are already imported when the hook is mounted.
      decorateCallActivities();
    }

    return () => {
      eventBus.off('element.dblclick', navigateToCalledProcess);
      if (enableSingleClick) {
        eventBus.off('import.done', decorateCallActivities);
        eventBus.off('element.click', showIndicatorForClickedCallActivity);
        removeIndicators();
      }
    };
  }, [bpmnInstance, enableSingleClick, navigate, showAlert]);
};
