import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../queryClient';
import { useSnackbar } from './useSnackbar';

type CallActivityEvent = {
  element?: {
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
    callback: (event: CallActivityEvent) => void,
  ) => void;
  off: (
    eventName: string,
    callback: (event: CallActivityEvent) => void,
  ) => void;
};

type BpmnInstance = {
  get: (serviceName: string) => unknown;
};

/**
 * A Call Activity navigates to another BPMN Tool process when its
 * calledElement attribute contains the target resource ID. Access is always
 * checked through the authenticated resource API before changing routes.
 */
export const useCallActivityNavigation = (bpmnInstance: BpmnInstance) => {
  const navigate = useNavigate();
  const { showAlert } = useSnackbar();

  useEffect(() => {
    const eventBus = bpmnInstance.get('eventBus') as BpmnEventBus;

    const onCallActivityDoubleClick = (event: CallActivityEvent) => {
      const businessObject = event.element?.businessObject;
      if (businessObject?.$type !== 'bpmn:CallActivity') {
        return;
      }

      event.stopPropagation();
      const targetResourceId = String(businessObject.calledElement ?? '').trim();
      if (!targetResourceId) {
        showAlert({
          message:
            'Cette activité d’appel n’est pas liée à un processus BPMN Tool. Renseignez son identifiant de ressource dans « Called element ».',
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

    eventBus.on('element.dblclick', 1500, onCallActivityDoubleClick);
    return () => eventBus.off('element.dblclick', onCallActivityDoubleClick);
  }, [bpmnInstance, navigate, showAlert]);
};
