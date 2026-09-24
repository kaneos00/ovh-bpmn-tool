function NavigationControls(eventBus: any, canvas: any) {
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

  eventBus.on('canvas.init', () => {

    const container = canvas.getContainer();

    container.addEventListener('mousedown', startPan);
    container.addEventListener('mousemove', movePan);
    container.addEventListener('mouseup', stopPan);
    container.addEventListener('mouseleave', stopPan);
    container.addEventListener('contextmenu', (event: MouseEvent) => event.preventDefault());
  });

  eventBus.on('destroy', () => {
    panning = false;
  });
}

NavigationControls.$inject = [ 'eventBus', 'canvas' ];

export default {
  __init__: [ 'navigationControls' ],
  navigationControls: [ 'type', NavigationControls ],
};
