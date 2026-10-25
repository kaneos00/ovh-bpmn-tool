import { is } from 'bpmn-js/lib/util/ModelUtil';

function UrlClickHandler(
  eventBus: any,
  overlays: any,
  selection: any,
) {
  const getUrl = (element: any): string =>
    String(element?.businessObject?.link ?? '').trim();

  const isUrlElement = (element: any) =>
    (
      is(element, 'bpmn:Task') ||
      is(element, 'bpmn:DataStoreReference') ||
      is(element, 'bpmn:DataObjectReference')
    ) && Boolean(getUrl(element));

  const isSubProcess = (element: any) =>
    is(element, 'bpmn:SubProcess') || is(element, 'bpmn:Transaction');

  const openUrl = (url: string) => {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  };

  const addUrlOverlay = (element: any) => {
    const url = getUrl(element);
    if (!url || !isUrlElement(element)) return;

    const arrow = document.createElement('button');
    arrow.type = 'button';
    arrow.className = 'url-link-overlay bpmn-url-link-indicator';
    arrow.dataset.urlTaskId = element.id;
    arrow.title = 'Ouvrir le lien';
    arrow.setAttribute('aria-label', 'Ouvrir le lien');
    arrow.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M3.5 12.5 12 4v4h1.5V1.5H7V3h4l-8.5 8.5z" /></svg>';
    arrow.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openUrl(url);
    });

    overlays.add(element, 'url-link', {
      position: { bottom: -7, right: -8 },
      html: arrow,
    });
  };

  const addSubProcessOverlay = (element: any) => {
    if (!isSubProcess(element) || element?.businessObject?.isExpanded !== false) return;

    const arrow = document.createElement('button');
    arrow.type = 'button';
    arrow.className = 'bpmn-selection-arrow';
    arrow.title = 'Ouvrir le processus appelé';
    arrow.setAttribute('aria-label', 'Ouvrir le processus appelé');
    arrow.textContent = '↙';
    arrow.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      eventBus.fire('element.dblclick', {
        element,
        stopPropagation: () => undefined,
      });
    });

    overlays.add(element, 'bpmn-subprocess-link', {
      position: { bottom: -7, right: -8 },
      html: arrow,
    });
  };

  const removeOverlays = (element: any) => {
    if (!element) return;
    overlays.remove({ element, type: 'url-link' });
    overlays.remove({ element, type: 'bpmn-subprocess-link' });
  };

  eventBus.on('selection.changed', (event: any) => {
    const oldSelection = event.oldSelection || [];
    const newSelection = event.newSelection || [];

    oldSelection.forEach(removeOverlays);
    newSelection.forEach(removeOverlays);

    const selected = newSelection[0];
    if (!selected) return;

    if (isUrlElement(selected)) {
      addUrlOverlay(selected);
    } else if (isSubProcess(selected)) {
      addSubProcessOverlay(selected);
    }
  });

  eventBus.on('element.changed', (event: any) => {
    const element = event.element;
    if (
      !is(element, 'bpmn:Task') &&
      !is(element, 'bpmn:DataStoreReference') &&
      !is(element, 'bpmn:DataObjectReference') &&
      !isSubProcess(element)
    ) {
      return;
    }

    const currentSelection = selection.get();
    const isSelected = currentSelection?.includes(element);
    removeOverlays(element);

    if (isSelected && isUrlElement(element)) {
      addUrlOverlay(element);
    } else if (isSelected && isSubProcess(element)) {
      addSubProcessOverlay(element);
    }
  });
}

UrlClickHandler.$inject = ['eventBus', 'overlays', 'selection'];

export default {
  __init__: ['urlClickHandler'],
  urlClickHandler: ['type', UrlClickHandler],
};
