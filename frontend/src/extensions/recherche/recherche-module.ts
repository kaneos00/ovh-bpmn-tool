/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import {
  RechercheContext,
  RechercheService,
  RechercheResult,
} from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
  'rechercheService',
];

export default {
  __init__: ['rechercheModule'],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closePanel();
      }
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
];

export default {
  __init__: ['rechercheModule'],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
  rechercheService: RechercheService,
) {
  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
  'rechercheService',
];

export default {
  __init__: ['rechercheModule'],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closePanel();
      }
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
];

export default {
  __init__: ['rechercheModule'],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
) {
  const service = new RechercheService();

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    selection.select(result.element);
    canvas.scrollToElement(result.element);

    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.remove();
    }
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id;
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = result.name
        ? `${result.id} · ${result.type}`
        : result.type;
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const found = await service.search(input.value, elementRegistry);

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  (eventBus as any).on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { RechercheService, RechercheResult } from './recherche-service';

const PANEL_ID = 'bpmn-recherche-panel';

function RechercheModule(
  eventBus: any,
  elementRegistry: any,
  selection: any,
  canvas: any,
  rechercheService: RechercheService,
) {
  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function selectResult(result: RechercheResult) {
    if (result.element) {
      selection.select(result.element);
      canvas.scrollToElement(result.element);
    } else if (result.link) {
      window.open(result.link, '_blank', 'noopener,noreferrer');
    }

    closePanel();
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
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '9px 12px';
      button.style.border = '0';
      button.style.borderBottom = '1px solid #eee';
      button.style.background = '#fff';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';

      const title = document.createElement('div');
      title.textContent = result.name || result.id || result.processName || 'Résultat';
      title.style.fontWeight = '600';

      const details = document.createElement('div');
      details.textContent = [
        result.type,
        result.processName,
        result.role,
        result.raci,
      ]
        .filter(Boolean)
        .join(' · ');
      details.style.fontSize = '11px';
      details.style.color = '#777';
      details.style.marginTop = '2px';

      if (result.documentation) {
        const documentation = document.createElement('div');
        documentation.textContent = result.documentation;
        documentation.style.fontSize = '11px';
        documentation.style.color = '#555';
        documentation.style.marginTop = '4px';
        documentation.style.whiteSpace = 'nowrap';
        documentation.style.overflow = 'hidden';
        documentation.style.textOverflow = 'ellipsis';
        button.appendChild(documentation);
      }

      button.appendChild(title);
      button.appendChild(details);
      button.addEventListener('click', () => selectResult(result));

      container.appendChild(button);
    });
  }

  function openPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      const input = existing.querySelector('input') as HTMLInputElement | null;
      input?.focus();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'absolute';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.zIndex = '100';
    panel.style.background = '#fff';
    panel.style.border = '1px solid #ddd';
    panel.style.borderRadius = '6px';
    panel.style.boxShadow = '0 4px 16px rgba(0,0,0,.18)';
    panel.style.overflow = 'hidden';
    panel.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '10px';
    header.style.borderBottom = '1px solid #ddd';

    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Rechercher dans le processus…';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Recherche dans le processus');
    input.style.flex = '1';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.outline = 'none';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Fermer';
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.fontSize = '20px';
    close.style.cursor = 'pointer';
    close.addEventListener('click', closePanel);

    const results = document.createElement('div');
    results.style.maxHeight = '55vh';
    results.style.overflowY = 'auto';

    header.appendChild(input);
    header.appendChild(close);
    panel.appendChild(header);
    panel.appendChild(results);

    const container = canvas.getContainer();
    container.style.position = container.style.position || 'relative';
    container.appendChild(panel);

    let request = 0;

    input.addEventListener('input', async () => {
      const currentRequest = ++request;
      const selected = selection.get();
      const currentElement = selected?.[0];
      const businessObject = currentElement?.businessObject;

      const context: RechercheContext = {
        currentElementId: currentElement?.id,
        currentElementType: businessObject?.$type,
        processId: businessObject?.processRef?.id,
        processName: businessObject?.processRef?.name,
      };

      const found = await rechercheService.search(
        input.value,
        elementRegistry,
        context,
      );

      if (currentRequest !== request) {
        return;
      }

      renderResults(results, found);
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closePanel();
      }
    });

    input.focus();
  }

  eventBus.on('diagram.init', () => {
    const container = canvas.getContainer();

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Recherche';
    button.title = 'Rechercher dans le processus (Ctrl+K)';
    button.style.position = 'absolute';
    button.style.top = '16px';
    button.style.left = '16px';
    button.style.zIndex = '90';
    button.style.padding = '7px 12px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.background = '#fff';
    button.style.cursor = 'pointer';
    button.addEventListener('click', openPanel);

    container.appendChild(button);
  });

  eventBus.on('keyboard.keydown', (event: any) => {
    if ((event.ctrlKey || event.metaKey) && event.key?.toLowerCase() === 'k') {
      event.preventDefault();
      openPanel();
    }
  });

  eventBus.on('diagram.destroy', closePanel);
}

RechercheModule.$inject = [
  'eventBus',
  'elementRegistry',
  'selection',
  'canvas',
  'rechercheService',
];

export default {
  __init__: ['rechercheModule', 'rechercheService'],
  rechercheService: ['type', RechercheService],
  rechercheModule: ['type', RechercheModule],
};