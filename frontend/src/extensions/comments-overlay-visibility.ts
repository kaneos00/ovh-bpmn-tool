function CommentsOverlayVisibility(
  eventBus: any,
  overlays: any,
  comments: any,
) {
  function setVisibility(element: any, visible: boolean) {
    const overlay = overlays.get({
      element,
      type: 'comments',
    })[0];

    if (!overlay || !overlay.html) {
      return;
    }

    overlay.html[visible ? 'addClass' : 'removeClass']('with-comments');
  }

  eventBus.on('comments.added', function(event: any) {
    setVisibility(event.element, true);
  });

  eventBus.on('comments.removed', function(event: any) {
    setVisibility(
      event.element,
      comments.getComments(event.element).length > 0,
    );
  });
}

CommentsOverlayVisibility.$inject = [ 'eventBus', 'overlays', 'comments' ];

export default {
  __init__: [ 'commentsOverlayVisibility' ],
  commentsOverlayVisibility: [ 'type', CommentsOverlayVisibility ],
};
