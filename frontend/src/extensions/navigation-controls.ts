function NavigationControls(eventBus: any, canvas: any) {
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  let contextMenuHandler: ((event: MouseEvent) => void) | null = null;

  function startPan(event: MouseEvent) {
    if (event.button !== 2 && event.button !== 1) return;
    if (event.button === 1 && !event.shiftKey && !event.ctrlKey && !event.metaKey) return;
    panning = true;
    lastX = event.clientX;
    lastY = event.clientY;
    event.preventDefault();
  }

  function movePan(event: MouseEvent) {
    if (!panning) return;
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
    contextMenuHandler = (event: MouseEvent) => event.preventDefault();
    container.addEventListener('contextmenu', contextMenuHandler);
  });

  eventBus.on('destroy', () => {
    const container = canvas.getContainer();
    container.removeEventListener('mousedown', startPan);
    container.removeEventListener('mousemove', movePan);
    container.removeEventListener('mouseup', stopPan);
    container.removeEventListener('mouseleave', stopPan);
    if (contextMenuHandler) container.removeEventListener('contextmenu', contextMenuHandler);
    contextMenuHandler = null;
    panning = false;
  });
}

NavigationControls.$inject = [ 'eventBus', 'canvas' ];

export default {
  __init__: [ 'navigationControls' ],
  navigationControls: [ 'type', NavigationControls ],
};
