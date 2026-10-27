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

const isCollapsedLinkedSubProcess = (element: any): boolean => {
  const type = element?.businessObject?.$type ?? element?.type;
  if (type !== 'bpmn:SubProcess' && type !== 'bpmn:Transaction') return false;

  // Only collapsed subprocesses can represent links to separately modelled
  // processes. Intercepting an expanded subprocess prevents normal BPMN drilldown.
  const expandedState = element?.businessObject?.di?.isExpanded ??
    element?.di?.isExpanded ??
    element?.isExpanded ??
    element?.businessObject?.isExpanded;
  return expandedState === false || expandedState === 'false';
};

const getLinkedTargetId = (element: any): string => {
  const type = element?.businessObject?.$type ?? element?.type;
  if (type === 'bpmn:CallActivity') {
    return String(element.businessObject?.calledElement ?? '').trim();
  }
  if (isCollapsedLinkedSubProcess(element)) {
    return String(element.businessObject?.id ?? element.id ?? '').trim();
  }
  return '';
};

const isLinkedElement = (element: any): boolean => {
  const type = element?.businessObject?.$type ?? element?.type;
  return type === 'bpmn:CallActivity' || isCollapsedLinkedSubProcess(element);
};

const getExternalTaskUrl = (element: any): string => {
  const type = element?.businessObject?.$type ?? element?.type;
  const isTask = (type === 'bpmn:Task' || String(type ?? '').endsWith('Task')) &&
    type !== 'bpmn:CallActivity';
  return isTask ? String(element?.businessObject?.link ?? '').trim() : '';
};

const openExternalUrl = (url: string) => {
  const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
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
          const resources = cachedResources ?? await queryClient.fetchQuery(resourceQuery) ?? [];
          const processResources = resources.filter(resource => resource.type === ResourceType.Process);

          const results: Array<{ resource: Resource; processIds: string[] }> = [];

          // Read one XML at a time. A parallel scan can hold many large BPMN
          // documents in memory simultaneously, although only their process IDs
          // are needed for target resolution.
          for (const resource of processResources) {
            try {
              const resourceContentsQuery = contentsQuery(resource.id);
              const cachedContents = queryClient.getQueryData(resourceContentsQuery.queryKey) as Content[] | undefined;
              const contents = cachedContents ?? await queryClient.fetchQuery(resourceContentsQuery) ?? [];
              const publishedContent = contents
                .filter(content => content.status === ContentStatusEnum.Published)
                .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];

              if (!publishedContent) {
                results.push({ resource, processIds: [] });
                continue;
              }

              const xmlQuery = getXmlContentQuery(resource.id, publishedContent.id);
              const cachedXml = queryClient.getQueryData(xmlQuery.queryKey) as string | undefined;
              // Scan-only XML must not be retained for the global default cache
              // lifetime. Active/previously cached query data is left untouched.
              const xml = cachedXml ?? await queryClient.fetchQuery(
                xmlQuery.queryKey,
                xmlQuery.queryFn,
                { cacheTime: 0, staleTime: 0 },
              ) ?? '';
              results.push({ resource, processIds: getProcessLinks(xml).processIds });
            } catch {
              // Keep the failed resource visible to diagnostics instead of treating
              // a partial scan as proof that the target does not exist.
              processInfoFailures.add(resource.id);
              results.push({ resource, processIds: [] });
            }
          }

          return results;
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
      if (isLinkedElement(event.element)) {
        // Navigation is handled only at the double-click boundary. Do not
        // intercept element.click for SubProcesses: the Viewer must be able
        // to complete its normal single-click selection first.
        event.stopPropagation();
        void openLinkedProcess(event.element);
        return;
      }

      // Handle task URLs at the same high-priority BPMN event boundary as
      // process links, so the Viewer selection handler cannot swallow them.
      const url = getExternalTaskUrl(event.element);
      if (!url) return;
      event.stopPropagation();
      openExternalUrl(url);
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
        // Reuse the URL-link arrow styling and explicitly exempt this
        // controlled overlay from the native BPMN drilldown-arrow suppression.
        indicator.className = 'bjs-drilldown url-link-overlay bpmn-call-activity-link-indicator';
        indicator.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path fill="white" fill-rule="evenodd" d="M3.5 12.5 12 4v4h1.5V1.5H7V3h4L2.5 11.5z"/></svg>';
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
