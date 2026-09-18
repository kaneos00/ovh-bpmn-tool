import { is } from 'bpmn-js/lib/util/ModelUtil';

/*
 * ============================================================
 * ANCIENNE VERSION — conservée pour comparaison / retour arrière
 * ============================================================
 *
 * function UrlClickHandler(eventBus: any) {
 *   eventBus.on('element.click', (event: any) => {
 *     const element = event.element;
 *     const url = element?.businessObject?.link;
 *
 *     if (!url) {
 *       return;
 *     }
 *
 *     const normalizedUrl = /^https?:\/\//i.test(url)
 *       ? url
 *       : `https://${url}`;
 *
 *     window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
 *   });
 * }
 *
 * UrlClickHandler.$inject = ['eventBus'];
 *
 * export default {
 *   __init__: ['urlClickHandler'],
 *   urlClickHandler: ['type', UrlClickHandler],
 * };
 *
 * ============================================================
 */


/*
 * Nouvelle version :
 *
 * - uniquement les bpmn:Task
 * - le clic sur le Task reste normal
 * - une petite flèche bleue apparaît si une URL existe
 * - seul le clic sur cette flèche ouvre l'URL
 * - les SubProcess et CallActivity ne sont pas concernés
 */

function UrlClickHandler(
  eventBus: any,
  overlays: any,
) {

  function getUrl(element: any) {
    return element?.businessObject?.link || '';
  }

  function isUrlTask(element: any) {
    return is(element, 'bpmn:Task') && !!getUrl(element);
  }

  function openUrl(url: string) {

    const normalizedUrl = /^https?:\/\//i.test(url)
      ? url
      : `https://${url}`;

    window.open(
      normalizedUrl,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function addOverlay(element: any) {

    if (!isUrlTask(element)) {
      return;
    }

    const url = getUrl(element);

    overlays.add(element, 'url-link', {
      position: {
        top: -8,
        right: -8,
      },

      html: `
        <div
          class="url-link-overlay"
          title="Ouvrir le lien"
          style="
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #1976d2;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            user-select: none;
          "
        >
          ↗
        </div>
      `,
    });

    /*
     * Récupération de l'élément HTML créé par l'overlay.
     *
     * bpmn-js place l'overlay dans le DOM après overlays.add().
     */
    setTimeout(() => {

      const overlayElements = document.querySelectorAll(
        '.url-link-overlay',
      );

      const overlayElement =
        overlayElements[overlayElements.length - 1] as HTMLElement;

      if (!overlayElement) {
        return;
      }

      overlayElement.onclick = (event) => {

        /*
         * Empêche le clic de remonter vers le diagramme BPMN.
         * Le Task reste donc sélectionnable normalement.
         */
        event.stopPropagation();

        openUrl(url);
      };

    }, 0);
  }

  eventBus.on('shape.added', (event: any) => {
    addOverlay(event.element);
  });

  eventBus.on('element.changed', (event: any) => {

    const element = event.element;

    /*
     * Pour l'instant, on ne gère ici que les Tasks.
     * La gestion dynamique des changements d'URL viendra ensuite
     * si nécessaire.
     */
    if (!is(element, 'bpmn:Task')) {
      return;
    }

    /*
     * Suppression de l'ancien overlay avant reconstruction.
     */
    overlays.remove({
      element,
      type: 'url-link',
    });

    addOverlay(element);
  });
}

UrlClickHandler.$inject = [
  'eventBus',
  'overlays',
];

export default {
  __init__: [
    'urlClickHandler',
  ],

  urlClickHandler: [
    'type',
    UrlClickHandler,
  ],
};
```
