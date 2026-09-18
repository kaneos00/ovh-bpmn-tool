function UrlClickHandler(eventBus: any) {
  eventBus.on('element.click', (event: any) => {
    const element = event.element;
    const url = element?.businessObject?.link;

    if (!url) {
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(url)
      ? url
      : `https://${url}`;

    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  });
}

UrlClickHandler.$inject = ['eventBus'];

export default {
  __init__: ['urlClickHandler'],
  urlClickHandler: ['type', UrlClickHandler],
};
