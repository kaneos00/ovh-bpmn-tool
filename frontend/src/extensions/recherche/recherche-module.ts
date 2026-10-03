import './recherche-highlight.css';

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

La version précédente ouvrait la recherche dans un panneau après
clic sur le bouton « Recherche ». Elle est conservée dans l'historique Git.

============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { RechercheService } from './recherche-service';
import type { RechercheContext, RechercheProvider, RechercheResult, RechercheScope } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';
const BAR_ID = 'bpmn-recherche-bar';

const sourceLabels: Record<string, string> = {
  process: 'Processus', subprocess: 'Sous-processus', bpmn: 'BPMN', procedure: 'Procédure', role: 'Rôle', raci: 'RACI', ai: 'IA',
};

const sourceFilters = [
  ['all', 'Tous'], ['process', 'Processus'], ['subprocess', 'Sous-processus'], ['bpmn', 'BPMN'], ['procedure', 'Procédures'],
  ['role', 'Rôles'], ['raci', 'RACI'], ['ai', 'IA'],
] as const;

function RechercheModule(
  eventBus: any, elementRegistry: any, selection: any, canvas: any,
  rechercheService: RechercheService, rechercheProvider?: RechercheProvider,
) {
  console.log('[Recherche][MODULE] RechercheModule chargé', {
    hasProvider: !!rechercheProvider,
    hasService: !!rechercheService,
    hasCanvas: !!canvas,
  });

  if (rechercheProvider) rechercheService.setProvider(rechercheProvider);
  let inputElement: HTMLInputElement | undefined;
  let highlightedElementId: string | undefined;

  function clearSearchHighlight() {
    if (!highlightedElementId) return;
    const element = elementRegistry.get(highlightedElementId);
    if (element) canvas.removeMarker(element, 'recherche-highlight');
    highlightedElementId = undefined;
  }

  function highlightSearchElement(element: any) {
    if (!element) return;
    if (highlightedElementId && highlightedElementId !== element.id) {
      const previous = elementRegistry.get(highlightedElementId);
      if (previous) canvas.removeMarker(previous, 'recherche-highlight');
    }
    canvas.addMarker(element, 'recherche-highlight');
    highlightedElementId = element.id;
  }

  function closePanel() { document.getElementById(PANEL_ID)?.remove(); }

  function navigateToResult(result: RechercheResult) {
    if (result.element) {
      highlightSearchElement(result.element);
      selection.select(result.element);
      canvas.scrollToElement(result.element);
      return;
    }
    if (result.link) window.location.assign(result.link);
  }

  function focusElementFromUrl() {
    const elementId = new URLSearchParams(window.location.search).get('element');

    console.log('[Recherche][NAVIGATION] focusElementFromUrl', {
      url: window.location.href,
      elementId,
    });

    if (!elementId) {
      return;
    }

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

  function renderResults(container: HTMLElement, results: RechercheResult[]) {
    container.innerHTML = '';
    if (!results.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Aucun résultat';
      Object.assign(empty.style, { padding: '12px', color: '#666' });
      container.appendChild(empty); return;
    }
    results.forEach(result => {
      const button = document.createElement('button');
      button.type = 'button';
      Object.assign(button.style, { display: 'block', width: '100%', padding: '9px 12px', border: '0', borderBottom: '1px solid #eee', background: '#fff', textAlign: 'left', cursor: 'pointer' });
      const badge = document.createElement('span');
      const sourceType = result.sourceType || 'bpmn';
      const badgeColors: Record<string, { background: string; border: string; color: string }> = {
        process: { background: '#e8f1fb', border: '#bfd5ec', color: '#315f8c' }, subprocess: { background: '#edf1fb', border: '#c9d2ea', color: '#4b5f8c' }, bpmn: { background: '#fff0df', border: '#efd0a8', color: '#8a5a22' },
        procedure: { background: '#eaf6ee', border: '#c5e3ce', color: '#3d704b' }, role: { background: '#f1ebf8', border: '#d8c9e8', color: '#69507f' },
        raci: { background: '#fdf1e8', border: '#efd5c1', color: '#875f42' }, ai: { background: '#e9f5f5', border: '#c5dfdf', color: '#3f7070' },
      };
      badge.textContent = [sourceLabels[sourceType] || sourceType || 'BPMN', result.processName || result.resourceName].filter(Boolean).join(' · ');
      const badgeColor = badgeColors[sourceType] || badgeColors.bpmn;
      Object.assign(badge.style, { display: 'inline-block', fontSize: '10px', fontWeight: '600', padding: '2px 7px', marginBottom: '4px', border: `1px solid ${badgeColor.border}`, borderRadius: '10px', background: badgeColor.background, color: badgeColor.color });
      button.appendChild(badge);
      const title = document.createElement('div'); title.textContent = result.name || result.id || result.processName || 'Résultat'; title.style.fontWeight = '600'; button.appendChild(title);
      const details = document.createElement('div'); details.textContent = [result.type, result.processName, result.resourceName, result.role, result.raci].filter(Boolean).join(' · ');
      Object.assign(details.style, { fontSize: '11px', color: '#777', marginTop: '2px' }); button.appendChild(details);
      if (result.documentation) {
        const documentation = document.createElement('div'); documentation.textContent = result.documentation;
        Object.assign(documentation.style, { fontSize: '11px', color: '#555', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }); button.appendChild(documentation);
      }
      button.addEventListener('click', () => { navigateToResult(result); closePanel(); });
      container.appendChild(button);
    });
  }

  function createSearchBar() {
    const existing = document.getElementById(BAR_ID);
    if (existing) {
      inputElement = existing.querySelector('input') as HTMLInputElement | undefined;
      inputElement?.focus();
      return existing;
    }

    const bar = document.createElement('div');
    bar.id = BAR_ID;
    Object.assign(bar.style, {
      position: 'fixed',
      // Keep the floating search bar below the Modeler action bar.
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(900px, calc(100vw - 32px))',
      height: '54px',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      boxSizing: 'border-box',
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '6px',
      boxShadow: '0 3px 12px rgba(0,0,0,.18)',
      fontFamily: 'Arial, sans-serif',
    });

    const source = document.createElement('select');
    source.setAttribute('aria-label', 'Type de résultat');
    source.title = 'Type de résultat';
    source.style.padding = '8px 6px';
    sourceFilters.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      source.appendChild(option);
    });
    source.value = 'all';

    const scope = document.createElement('select');
    scope.setAttribute('aria-label', 'Périmètre de recherche');
    scope.title = 'Périmètre de recherche';
    scope.style.padding = '8px 6px';
    [['current-process', 'Ce processus'], ['all-processes', 'Tous les processus']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      scope.appendChild(option);
    });
    scope.value = 'all-processes';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans tous les processus…';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Recherche dans tous les processus');
    Object.assign(input.style, {
      flex: '1',
      minWidth: '120px',
      padding: '9px 12px',
      border: '1px solid #bbb',
      borderRadius: '4px',
      outline: 'none',
      fontSize: '14px',
    });

    const hint = document.createElement('span');
    hint.textContent = 'Ctrl+K';
    Object.assign(hint.style, { fontSize: '11px', color: '#777', whiteSpace: 'nowrap' });

    bar.appendChild(source);
    bar.appendChild(scope);
    bar.appendChild(input);
    bar.appendChild(hint);
    document.body.appendChild(bar);

    const resultsPanel = document.createElement('div');
    resultsPanel.id = PANEL_ID;
    Object.assign(resultsPanel.style, {
      position: 'fixed',
      // 80px search-bar offset + 54px bar height + 10px gap.
      top: '144px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(900px, calc(100vw - 32px))',
      maxHeight: '60vh',
      zIndex: '9999',
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '0 0 6px 6px',
      boxShadow: '0 4px 12px rgba(0,0,0,.15)',
      overflowY: 'auto',
      fontFamily: 'Arial, sans-serif',
      display: 'none',
    });
    document.body.appendChild(resultsPanel);

    let request = 0;
    const runSearch = async () => {
      const query = input.value.trim();
      const currentRequest = ++request;
      if (!query) {
        resultsPanel.style.display = 'none';
        resultsPanel.innerHTML = '';
        return;
      }

      resultsPanel.style.display = 'block';
      const selected = selection.get();
      const currentElement = selected?.[0];
      const businessObject = currentElement?.businessObject;
      const baseContext = rechercheService.getContext();
      const context: RechercheContext = {
        ...baseContext,
        scope: scope.value as RechercheScope,
        currentElementId: currentElement?.id,
        currentElementType: businessObject?.$type,
        processId: baseContext.processId ?? baseContext.resourceId ?? businessObject?.processRef?.id,
        processName: baseContext.processName ?? baseContext.resourceName ?? businessObject?.processRef?.name,
      };
      const found = await rechercheService.search(query, elementRegistry, context);
      const filtered = source.value === 'all'
        ? found
        : found.filter(result => result.sourceType === source.value);
      if (currentRequest === request) renderResults(resultsPanel, filtered);
    };

    input.addEventListener('input', runSearch);
    scope.addEventListener('change', runSearch);
    source.addEventListener('change', runSearch);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        input.value = '';
        ++request;
        resultsPanel.style.display = 'none';
        resultsPanel.innerHTML = '';
      }
    });

    inputElement = input;
    return bar;
  }

  eventBus.on('diagram.init', () => {
    console.log('[Recherche][MODULE] diagram.init');
    createSearchBar();
  });

  eventBus.on('import.done', () => {
    console.log('[Recherche][MODULE] import.done');
    focusElementFromUrl();
  });

  eventBus.on('keyboard.keydown', (event: any) => { if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') { event.preventDefault(); createSearchBar(); inputElement?.focus(); inputElement?.select(); } });
  eventBus.on('diagram.destroy', () => {
    console.log('[Recherche][MODULE] diagram.destroy');
    closePanel();
    clearSearchHighlight();
    // The search UI is owned by this BPMN instance. Always remove it when
    // that instance is destroyed; do not depend on another viewer existing.
    document.getElementById(BAR_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    inputElement = undefined;
  });
}

RechercheModule.$inject = ['eventBus', 'elementRegistry', 'selection', 'canvas', 'rechercheService', 'rechercheProvider'];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};
