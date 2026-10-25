import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import queryClient from '../../queryClient';
import { contentsQuery, getXmlContentQuery } from '../../api/contents/contents.queries';
import { getResourceQuery, resourcesQuery } from '../../api/resources/resources.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../Types';
import { ResourceType } from '../types/BpmnResource';
import {
  getProcessLinks,
  resolveProcessTarget,
} from '../../Components/BusinessComponents/FolderTree/processLinks';
import { useSnackbar } from './useSnackbar';

type LinkedElementEvent = {
  element?: any;
  stopPropagation: () => void;
};

type BpmnEventBus = {
  on: (eventName: string, priority: number, callback: (event: any) => void) => void;
  off: (eventName: string, callback: (event: any) => void) => void;
};

type BpmnInstance = {
  get: (serviceName: string) => any;
};

const getLinkedTargetId = (element: any): string => {
  const type = element?.businessObject?.$type ?? element?.type;
  if (type === 'bpmn:CallActivity') {
    return String(element.businessObject?.calledElement ?? '').trim();
  }
  if (type === 'bpmn:SubProcess' || type === 'bpmn:Transaction') {
    return String(element.businessObject?.id ?? element.id ?? '').trim();
  }
  return '';
};

const isLinkedElement = (element: any): boolean => {
  const type = element?.businessObject?.$type ?? element?.type;
  return type === 'bpmn:CallActivity' ||
    type === 'bpmn:SubProcess' ||
    type === 'bpmn:Transaction';
};

/**
 * Call Activities and collapsed SubProcesses navigate only when a target can
 * be resolved to one accessible process resource. Single click still selects.
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
    let indicatorGeneration = 0;
    let processInfoPromise: Promise<Array<{ resource: Resource; processIds: string[] }>> | null = null;
    const processInfoFailures = new Set<string>();

    const getProcessInfo = () => {
      if (!processInfoPromise) {
        processInfoPromise = (async () => {
          const resourceQuery = resourcesQuery();
          const cachedResources = queryClient.getQueryData(resourceQuery.queryKey) as Resource[] | undefined;
          const resources = cachedResources ?? await queryClient.fetchQuery(resourceQuery);
          const processResources = resources.filter(resource => resource.type === ResourceType.Process);

          return Promise.all(processResources.map(async resource => {
            try {
              const resourceContentsQuery = contentsQuery(resource.id);
              const cachedContents = queryClient.getQueryData(resourceContentsQuery.queryKey) as Content[] | undefined;
              const contents = cachedContents ?? await queryClient.fetchQuery(resourceContentsQuery);
              const publishedContent = contents
                .filter(content => content.status === ContentStatusEnum.Published)
                .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];

              if (!publishedContent) return { resource, processIds: [] as string[] };

              const xmlQuery = getXmlContentQuery(resource.id, publishedContent.id);
              const cachedXml = queryClient.getQueryData(xmlQuery.queryKey) as string | undefined;
              const xml = cachedXml ?? await queryClient.fetchQuery(xmlQuery);
              return { resource, processIds: getProcessLinks(xml).processIds };
            } catch {
              // Keep the failed resource visible to diagnostics instead of treating
              // a partial scan as proof that the target does not exist.
              processInfoFailures.add(resource.id);
              return { resource, processIds: [] as string[] };
            }
          }));
        })().catch(error => {
          processInfoPromise = null;
          throw error;
        });
      }
      return processInfoPromise;
    };

    const resolveTargetResourceId = async (targetId: string): Promise<string | undefined> => {
      const processInfo = await getProcessInfo();
      return resolveProcessTarget(targetId, processInfo)?.id;
    };

    const openLinkedProcess = async (element: any) => {
      const targetId = getLinkedTargetId(element);
      if (!targetId) {
        showAlert({
          message: 'Aucune cible n’est définie pour cet élément BPMN.',
          severity: 'warning',
        });
        return;
      }

      try {
        const targetResourceId = await resolveTargetResourceId(targetId);
        if (!targetResourceId) {
          const hasResolutionFailures = processInfoFailures.size > 0;
          showAlert({
            message: hasResolutionFailures
              ? `Impossible de vérifier la cible : lecture de ${processInfoFailures.size} processus en échec.`
              : 'Le processus cible est absent ou son identifiant BPMN est ambigu.',
            severity: hasResolutionFailures ? 'danger' : 'warning',
          });
          return;
        }

        // Reuse the route loader cache and keep the API access check before navigation.
        await queryClient.fetchQuery(getResourceQuery(targetResourceId));
        navigate(`/${targetResourceId}`);
      } catch {
        showAlert({
          message: 'Accès au processus impossible : vous ne disposez pas des droits nécessaires ou le processus n’est plus disponible.',
          severity: 'danger',
        });
      }
    };

    const navigateToLinkedProcess = (event: LinkedElementEvent) => {
      if (!isLinkedElement(event.element)) return;
      event.stopPropagation();
      void openLinkedProcess(event.element);
    };

    const clearIndicator = () => {
      if (indicatorOverlayId !== undefined) {
        bpmnInstance.get('overlays')?.remove?.(indicatorOverlayId);
        indicatorOverlayId = undefined;
      }
    };

    const removeIndicators = () => {
      clearIndicator();
      const canvas = bpmnInstance.get('canvas');
      const registry = bpmnInstance.get('elementRegistry');
      (registry?.getAll?.() ?? []).forEach((element: any) => {
        canvas?.removeMarker?.(element.id, 'bpmn-call-activity-navigable');
      });
    };

    const decorateCallActivities = () => {
      if (!enableSingleClick) return;
      const registry = bpmnInstance.get('elementRegistry');
      const canvas = bpmnInstance.get('canvas');
      (registry?.getAll?.() ?? []).forEach((element: any) => {
        const businessObject = element.businessObject;
        if (businessObject?.$type === 'bpmn:CallActivity') {
          canvas?.addMarker?.(element.id, 'bpmn-call-activity');
          if (String(businessObject.calledElement ?? '').trim()) {
            canvas?.addMarker?.(element.id, 'bpmn-call-activity-navigable');
          }
        }
      });
    };

    const showIndicatorForSelectedLinkedElement = (event: any) => {
      if (!enableSingleClick) return;
      clearIndicator();
      const generation = ++indicatorGeneration;
      const element = (event.newSelection ?? [])[0];
      if (!isLinkedElement(element) || !getLinkedTargetId(element)) return;

      void resolveTargetResourceId(getLinkedTargetId(element)).then(targetResourceId => {
        if (!targetResourceId || generation !== indicatorGeneration) return;
        const selection = bpmnInstance.get('selection')?.get?.() ?? [];
        if (!selection.some((selected: any) => selected.id === element.id)) return;

        const indicator = document.createElement('button');
        indicator.type = 'button';
        indicator.className = 'bpmn-call-activity-link-indicator';
        indicator.textContent = '↗';
        indicator.title = 'Ouvrir le processus lié';
        indicator.setAttribute('aria-label', 'Ouvrir le processus lié');
        indicator.addEventListener('click', clickEvent => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          void openLinkedProcess(element);
        });

        indicatorOverlayId = bpmnInstance.get('overlays')?.add?.(element, {
          position: { bottom: -7, right: -8 },
          html: indicator,
        });
      }).catch(() => {
        // Do not show a navigational indicator when target resolution failed.
      });
    };

    eventBus.on('element.dblclick', 1500, navigateToLinkedProcess);

    if (enableSingleClick) {
      eventBus.on('selection.changed', 1000, showIndicatorForSelectedLinkedElement);
      eventBus.on('import.done', 1000, decorateCallActivities);
      decorateCallActivities();
    }

    return () => {
      eventBus.off('element.dblclick', navigateToLinkedProcess);
      indicatorGeneration += 1;
      if (enableSingleClick) {
        eventBus.off('import.done', decorateCallActivities);
        eventBus.off('selection.changed', showIndicatorForSelectedLinkedElement);
        removeIndicators();
      }
    };
  }, [bpmnInstance, enableSingleClick, navigate, showAlert]);
};
