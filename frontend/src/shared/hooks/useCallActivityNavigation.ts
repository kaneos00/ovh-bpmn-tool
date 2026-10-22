import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../queryClient';
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
    const overlayIds: Array<string | number> = [];

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

      void apiClient
        .get(`/resources/${encodeURIComponent(targetResourceId)}`)
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
      overlayIds.forEach(id => overlays?.remove?.(id));
      overlayIds.length = 0;
      (registry?.getAll?.() ?? []).forEach((element: any) => {
        canvas?.removeMarker?.(element.id, 'bpmn-call-activity-navigable');
      });
    };

    const decorateCallActivities = () => {
      if (!enableSingleClick) return;
      removeIndicators();

      const registry = bpmnInstance.get('elementRegistry');
      const canvas = bpmnInstance.get('canvas');
      const overlays = bpmnInstance.get('overlays');
      const elements = registry?.getAll?.() ?? [];

      elements.forEach((element: any) => {
        const businessObject = element.businessObject;
        if (
          businessObject?.$type !== 'bpmn:CallActivity' ||
          !String(businessObject.calledElement ?? '').trim()
        ) {
          return;
        }

        canvas?.addMarker?.(element.id, 'bpmn-call-activity-navigable');

        const indicator = document.createElement('span');
        indicator.className = 'bpmn-call-activity-link-indicator';
        indicator.textContent = '↗';
        indicator.setAttribute('aria-hidden', 'true');

        const overlayId = overlays?.add?.(element, {
          position: { top: -10, right: -10 },
          html: indicator,
        });
        if (overlayId !== undefined && overlayId !== null) {
          overlayIds.push(overlayId);
        }
      });
    };

    eventBus.on('element.dblclick', 1500, navigateToCalledProcess);

    if (enableSingleClick) {
      eventBus.on('import.done', 1000, decorateCallActivities);
      // Some viewer instances are already imported when the hook is mounted.
      decorateCallActivities();
    }

    return () => {
      eventBus.off('element.dblclick', navigateToCalledProcess);
      if (enableSingleClick) {
        eventBus.off('import.done', decorateCallActivities);
        removeIndicators();
      }
    };
  }, [bpmnInstance, enableSingleClick, navigate, showAlert]);
};
