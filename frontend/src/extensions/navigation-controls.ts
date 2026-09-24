function NavigationControls(eventBus: any, canvas: any) {
  let controls: HTMLDivElement | null = null;
  let panning = false;
  let lastX = 0;
  let lastY = 0;

  const zoomStep = 1.2;

  function zoom(factor: number) {
    const current = canvas.zoom();
    const container = canvas.getContainer();
    const rect = container.getBoundingClientRect();

    canvas.zoom(current * factor, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
  }

  function fitViewport() {
    canvas.zoom('fit-viewport');
  }

  function resetZoom() {
    canvas.zoom(1);
  }

  function createButton(
    label: string,
    title: string,
    action: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'bpmn-tool-navigation-button';
    button.textContent = label;
    button.title = title;

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      action();
    });

    return button;
  }

  function createControls() {
    if (controls) {
      return;
    }

    const container = document.body;

    controls = document.createElement('div');
    controls.className = 'bpmn-tool-navigation-controls';
    controls.setAttribute('aria-label', 'Navigation du diagramme');

    controls.appendChild(createButton('+', 'Zoom avant', () => zoom(zoomStep)));
    controls.appendChild(createButton('−', 'Zoom arrière', () => zoom(1 / zoomStep)));
    controls.appendChild(createButton('1:1', 'Réinitialiser le zoom', resetZoom));
    controls.appendChild(createButton('⛶', 'Ajuster le diagramme à la fenêtre', fitViewport));

    container.appendChild(controls);
  }

  function startPan(event: MouseEvent) {
    if (event.button !== 0 && event.button !== 2) {
      return;
    }

    // Left click pans only when the user starts on an empty canvas.
    if (event.button === 0) {
      const target = event.target as HTMLElement;

      if (target.closest('.djs-visual, .djs-element, .djs-connection, .bpmn-tool-navigation-controls')) {
        return;
      }
    }

    panning = true;
    lastX = event.clientX;
    lastY = event.clientY;
    event.preventDefault();
  }

  function movePan(event: MouseEvent) {
    if (!panning) {
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    canvas.scroll({ dx, dy });
    event.preventDefault();
  }

  function stopPan() {
    panning = false;
  }

  // Create the controls immediately: the module can be initialized before canvas.init.
  createControls();

  eventBus.on('canvas.init', () => {

    const container = canvas.getContainer();

    container.addEventListener('mousedown', startPan);
    container.addEventListener('mousemove', movePan);
    container.addEventListener('mouseup', stopPan);
    container.addEventListener('mouseleave', stopPan);
    container.addEventListener('contextmenu', (event: MouseEvent) => event.preventDefault());
  });

  eventBus.on('destroy', () => {
    controls?.remove();
    controls = null;
    panning = false;
  });
}

NavigationControls.$inject = [ 'eventBus', 'canvas' ];

export default {
  __init__: [ 'navigationControls' ],
  navigationControls: [ 'type', NavigationControls ],
};
