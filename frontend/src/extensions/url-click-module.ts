```ts
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
 * - une petite flèche apparaît en bas à droite si une URL existe
 * - le rendu reprend le contrôle Drilldown natif de bpmn-js
 * - seul le clic sur cette flèche ouvre l'URL
 * - les SubProcess et CallActivity ne sont pas concernés
 */

function UrlClickHandler(
  eventBus: any,
  overlays: any,
) {

  /*
   * SVG utilisé par bpmn-js pour son contrôle Drilldown.
   *
   * Source :
   * bpmn-js/lib/features/drilldown/DrilldownOverlayBehavior
   *
   * Nous conservons exactement la même géométrie.
   */
  const ARROW_DOWN_SVG = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 16 16"
    >
      <path
        fill-rule="evenodd"
        d="M4.81801948,3.50735931
           L10.4996894,9.1896894
           L10.5,4
           L12,4
           L12,12
           L4,12
           L4,10.5
           L9.6896894,10.4996894
           L3.75735931,4.56801948
           C3.46446609,4.27512627
           3.46446609,3.80025253
           3.75735931,3.50735931
           C4.05025253,3.21446609
           4.52512627,3.21446609
           4.81801948,3.50735931
           Z"
      />
    </svg>
  `;


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


    /*
     * ============================================================
     * ANCIEN RENDU — conservé pour comparaison / retour arrière
     * ============================================================
     *
     * overlays.add(element, 'url-link', {
     *   position: {
     *     bottom: -7,
     *     left: '50%',
     *   },
     *
     *   html: `
     *     <div
     *       class="url-link-overlay"
     *       title="Ouvrir le lien"
     *       style="
     *         width: 14px;
     *         height: 14px;
     *         border-radius: 2px;
     *         background: #1976d2;
     *         color: white;
     *         display: flex;
     *         align-items: center;
     *         justify-content: center;
     *         cursor: pointer;
     *         font-size: 10px;
     *         font-weight: bold;
     *         box-shadow: 0 1px 3px rgba(0,0,0,0.3);
     *         user-select: none;
     *         transform: translateX(-50%);
     *       "
     *     >
     *       ↗
     *     </div>
     *   `,
     * });
     *
     * ============================================================
     */


    /*
     * Rendu basé directement sur le contrôle Drilldown
     * natif de bpmn-js.
     *
     * Position identique au contrôle natif :
     *
     *   bottom: -7
     *   right:  -8
     */
    overlays.add(element, 'url-link', {

      position: {
        bottom: -7,
        right: -8,
      },

      html: `
        <button
          type="button"
          class="bjs-drilldown url-link-overlay"
          title="Ouvrir le lien"
          style="
            color: #1976d2;
          "
        >
          ${ARROW_DOWN_SVG}
        </button>
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
