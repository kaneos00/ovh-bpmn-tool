/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

Voir l'historique Git pour la version précédente.

============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { RechercheContext, RechercheResult, RechercheScope, RechercheService } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

const sourceLabels: Record<string, string> = {
  process: 'Processus',
  bpmn: 'BPMN',
  procedure: 'Procédure',
  role: 'Rôle',
  raci: 'RACI',
  ai: 'IA',
};

const sourceFilters = [
  ['all', 'Tous'],
  ['process', 'Processus'],
  ['bpmn', 'BPMN'],
  ['procedure', 'Procédures'],
  ['role', 'Rôles'],
  ['raci', 'RACI'],
  ['ai', 'IA'],
] as const;

function RechercheModule(eventBus: any, elementRegistry: any, selection: any, canvas: any, rechercheService: RechercheService) {
  function closePanel() { document.getElementById(PANEL_ID)?.remove(); }

  function navigateToResult(result: RechercheResult) {
    if (result.element) {
      selection.select(result.element);
      canvas.scrollToElement(result.element);
      closePanel();
      return;
    }
    if (result.link) window.location.assign(result.link);
  }

  function focusElementFromUrl() {
    const elementId = new URLSearchParams(window.location.search).get('element');
    if (!elementId) return;
    const element = elementRegistry.get(elementId);
    if (!element) return;
    selection.select(element);
    canvas.scrollToElement(element);
  }

  function renderResults(container: HTMLElement, results: RechercheResult[]) {
    container.innerHTML = '';
    if (!results.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Aucun résultat';
      empty.style.padding = '12px';
      empty.style.color = '#666';
      container.appendChild(empty);
      return;
    }

    results.forEach(result => {
      const button = document.createElement('button');
      button.type = 'button';
      Object.assign(button.style, { display: 'block', width: '100%', padding: '9px 12px', border: '0', borderBottom: '1px solid #eee', background: '#fff', textAlign: 'left', cursor: 'pointer' });

      const badge = document.createElement('span');
      badge.textContent = sourceLabels[result.sourceType || 'bpmn'] || result.sourceType || 'BPMN';
      Object.assign(badge.style, { display: 'inline-block', fontSize: '10px', padding: '2px 6px', marginBottom: '4px', border: '1px solid #ddd', borderRadius: '10px', color: '#666' });
      button.appendChild(badge);

      const title = document.createElement('div');
      title.textContent = result.name || result.id || result.processName || 'Résultat';
      title.style.fontWeight = '600';
      button.appendChild(title);

      const details = document.createElement('div');
      details.textContent = [result.type, result.processName, result.resourceName, result.role, result.raci].filter(Boolean).join(' · ');
      Object.assign(details.style, { fontSize: '11px', color: '#777', marginTop: '2px' });
      button.appendChild(details);

      if (result.documentation) {
        const documentation = document.createElement('div');
        documentation.textContent = result.documentation;
        Object.assign(documentation.style, { fontSize: '11px', color: '#555', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
        button.appendChild(documentation);
      }

      button.addEventListener('click', () => navigateToResult(result));
      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) { (existing.querySelector('input') as HTMLInputElement | null)?.focus(); return; }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    Object.assign(panel.style, { position: 'absolute', top: '16px', right: '16px', width: '420px', maxHeight: '70vh', zIndex: '100', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,.18)', overflow: 'hidden', fontFamily: 'Arial, sans-serif' });

    const header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderBottom: '1px solid #ddd' });

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

    const scope = document.createElement('select');
    scope.setAttribute('aria-label', 'Périmètre de recherche');
    scope.title = 'Périmètre de recherche';
    scope.style.padding = '8px 6px';
    [['current-process', 'Ce processus'], ['all-processes', 'Tous les processus']].forEach(([value, label]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = label; scope.appendChild(option);
    });

    const input = document.createElement('input');
    input.type = 'search'; input.placeholder = 'Rechercher…'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Recherche');
    Object.assign(input.style, { flex: '1', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' });

    const close = document.createElement('button');
    close.type = 'button'; close.textContent = '×'; close.title = 'Fermer';
    Object.assign(close.style, { border: '0', background: 'transparent', fontSize: '20px', cursor: 'pointer' });
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh'; results.style.overflowY = 'auto';
    header.appendChild(source); header.appendChild(scope); header.appendChild(input); header.appendChild(close); panel.appendChild(header); panel.appendChild(results);
    const container = canvas.getContainer(); container.style.position = container.style.position || 'relative'; container.appendChild(panel);

    let request = 0;
    const runSearch = async () => {
      const currentRequest = ++request;
      const selected = selection.get();
      const currentElement = selected?.[0];
      const businessObject = currentElement?.businessObject;
      const context: RechercheContext = {
        scope: scope.value as RechercheScope,
        currentElementId: currentElement?.id,
        currentElementType: businessObject?.$type,
        processId: businessObject?.processRef?.id,
        processName: businessObject?.processRef?.name,
      };
      const found = await rechercheService.search(input.value, elementRegistry, context);
      const filtered = source.value === 'all'
        ? found
        : found.filter(result => result.sourceType === source.value);
      if (currentRequest === request) renderResults(results, filtered);
    };

    input.addEventListener('input', runSearch);
    scope.addEventListener('change', runSearch);
    source.addEventListener('change', runSearch);
    input.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = 'Recherche'; button.title = 'Rechercher dans le processus (Ctrl+K)';
    Object.assign(button.style, { position: 'absolute', top: '16px', left: '16px', zIndex: '90', padding: '7px 12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' });
    button.addEventListener('click', openPanel); container.appendChild(button);
  });

  eventBus.on('import.done', focusElementFromUrl);
  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') { event.preventDefault(); openPanel(); }
  });
  eventBus.on('diagram.destroy', closePanel);
}

RechercheModule.$inject = ['eventBus', 'elementRegistry', 'selection', 'canvas', 'rechercheService'];

export default { __init__: ['rechercheModule', 'rechercheService'], rechercheService: ['type', RechercheService], rechercheModule: ['type', RechercheModule] };