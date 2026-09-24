function CommentsOverlayVisibility(eventBus, overlays, comments) {
  function setVisibility(element, visible) {
    const overlay = overlays.get({
      element,
      type: 'comments'
    })[0];

    if (!overlay || !overlay.html) {
      return;
    }

    overlay.html[visible ? 'addClass' : 'removeClass']('with-comments');
  }

  eventBus.on('comments.added', function(event) {
    setVisibility(event.element, true);
  });

  eventBus.on('comments.removed', function(event) {
    setVisibility(
      event.element,
      comments.getComments(event.element).length > 0
    );
  });
}

CommentsOverlayVisibility.$inject = [ 'eventBus', 'overlays', 'comments' ];

export default {
  __init__: [ 'commentsOverlayVisibility' ],
  commentsOverlayVisibility: [ 'type', CommentsOverlayVisibility ]
};
