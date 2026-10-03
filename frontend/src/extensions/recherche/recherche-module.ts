import './recherche-highlight.css';

import { RechercheService } from './recherche-service';
import type { RechercheProvider } from './recherche-service';

/**
 * Recherche dans le Modeler/Viewer.
 *
 * L'interface de recherche flottante a été supprimée :
 * la recherche globale est gérée hors du diagramme.
 * Ce module conserve la navigation vers un élément depuis une URL
 * et son surlignage visuel indépendant de la sélection native.
 */
function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
  rechercheService: RechercheService,
  rechercheProvider?: RechercheProvider,
) {
  console.log('[Recherche][MODULE] RechercheModule chargé', {
    hasProvider: !!rechercheProvider,
    hasService: !!rechercheService,
    hasCanvas: !!canvas,
  });

  if (rechercheProvider) rechercheService.setProvider(rechercheProvider);

  let highlightedElementId: string | undefined;

  function clearSearchHighlight() {
    if (!highlightedElementId) return;

    const element = elementRegistry.get(highlightedElementId);

    if (element) {
      canvas.removeMarker(element, 'recherche-highlight');
    }

    highlightedElementId = undefined;
  }

  function highlightSearchElement(element: any) {
    if (!element) return;

    if (highlightedElementId && highlightedElementId !== element.id) {
      const previous = elementRegistry.get(highlightedElementId);

      if (previous) {
        canvas.removeMarker(previous, 'recherche-highlight');
      }
    }

    canvas.addMarker(element, 'recherche-highlight');
    highlightedElementId = element.id;
  }

  function focusElementFromUrl() {
    const elementId = new URLSearchParams(window.location.search).get('element');

    console.log('[Recherche][NAVIGATION] focusElementFromUrl', {
      url: window.location.href,
      elementId,
    });

    if (!elementId) return;

    const element = elementRegistry.get(elementId);

    if (!element) {
      console.warn('[Recherche][NAVIGATION] élément introuvable', elementId);
      return;
    }

    console.log('[Recherche][NAVIGATION] élément trouvé', elementId, element);

    highlightSearchElement(element);
    selection.select(element);
    canvas.scrollToElement(element, 80);
  }

  eventBus.on('diagram.init', () => {
    console.log('[Recherche][MODULE] diagram.init');
  });

  eventBus.on('import.done', () => {
    console.log('[Recherche][MODULE] import.done');
    focusElementFromUrl();
  });

  eventBus.on('diagram.destroy', () => {
    console.log('[Recherche][MODULE] diagram.destroy');
    clearSearchHighlight();
  });
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
  'rechercheService',
  'rechercheProvider',
];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};
