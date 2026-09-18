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
 * ============================================================
 * NOUVELLE VERSION
 * ============================================================
 *
 * - uniquement les bpmn:Task
 * - le clic sur le Task reste normal
 * - une petite flèche bleue apparaît si une URL existe
 * - seul le clic sur cette flèche ouvre l'URL
 * - les SubProcess et CallActivity ne sont pas concernés
 * - position identique au contrôle Drilldown natif de bpmn-js
 *
 * ============================================================
 */

function UrlClickHandler(
  eventBus: any,
  overlays: any,
) {

  /*
   * ============================================================
   * Récupération de l'URL
   * ============================================================
   */

  function getUrl(element: any) {
    return element?.businessObject?.link || '';
  }


  /*
   * ============================================================
   * Vérifie que l'élément est une Task avec une URL
   *
   * IMPORTANT :
   * is(element, 'bpmn:Task') permet de ne pas afficher
   * le bouton sur les SubProcess / CallActivity.
   * ============================================================
   */

  function isUrlTask(element: any) {
    return is(element, 'bpmn:Task') && !!getUrl(element);
  }


  /*
   * ============================================================
   * Ouverture de l'URL
   * ============================================================
   */

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


  /*
   * ============================================================
   * Création du bouton URL
   * ============================================================
   */

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
     * ============================================================
     * ANCIENNE VERSION DU RENDU NATIF
     * ============================================================
     *
     * C'était la flèche native de bpmn-js :
     *
     * var ARROW_DOWN_SVG =
     * '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">' +
     * '<path fill-rule="evenodd" d="M4.81801948,3.50735931 L10.4996894,9.1896894 L10.5,4 L12,4 L12,12 L4,12 L4,10.5 L9.6896894,10.4996894 L3.75735931,4.56801948 C3.46446609,4.27512627 3.46446609,3.80025253 3.75735931,3.50735931 C4.05025253,3.21446609 4.52512627,3.21446609 4.81801948,3.50735931 Z"/>' +
     * '</svg>';
     *
     * ============================================================
     */


    /*
     * ============================================================
     * NOUVELLE FLÈCHE
     *
     * Flèche orientée :
     *
     *          ↗
     *         /
     *        /
     *       /
     *
     * de bas-gauche vers haut-droite.
     *
     * On conserve la taille SVG native 20 x 20.
     * ============================================================
     */

    const ARROW_UP_RIGHT_SVG = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 16 16"
      >
        <path
          fill-rule="evenodd"
          d="
            M3.5,12.5
            L12,4
            L12,8
            L13.5,8
            L13.5,1.5
            L7,1.5
            L7,3
            L11,3
            L2.5,11.5
            Z
          "
        />
      </svg>
    `;


    /*
     * ============================================================
     * CRÉATION DE L'OVERLAY
     *
     * Même position que le Drilldown natif de bpmn-js.
     * ============================================================
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
          data-url-task-id="${element.id}"
          title="Ouvrir le lien"
          style="
            color: #1976d2;
          "
        >
          ${ARROW_UP_RIGHT_SVG}
        </button>
      `,
    });


    /*
     * ============================================================
     * ANCIEN CODE DE RÉCUPÉRATION DU BOUTON
     * ============================================================
     *
     * setTimeout(() => {
     *
     *   const overlayElements = document.querySelectorAll(
     *     '.url-link-overlay',
     *   );
     *
     *   const overlayElement =
     *     overlayElements[overlayElements.length - 1] as HTMLElement;
     *
     *   if (!overlayElement) {
     *     return;
     *   }
     *
     *   overlayElement.onclick = (event) => {
     *     event.preventDefault();
     *     event.stopPropagation();
     *     openUrl(url);
     *   };
     *
     * }, 0);
     *
     * ============================================================
     *
     * PROBLÈME :
     *
     * Cette méthode prenait le dernier bouton trouvé dans le DOM.
     * Avec plusieurs Tasks ayant une URL, elle pouvait donc
     * associer le mauvais lien au mauvais bouton.
     *
     * ============================================================
     */


    /*
     * ============================================================
     * NOUVEAU CODE
     *
     * On identifie précisément le bouton correspondant au Task.
     * ============================================================
     */

    setTimeout(() => {

      const overlayElement = document.querySelector(
        `.url-link-overlay[data-url-task-id="${element.id}"]`,
      ) as HTMLButtonElement | null;


      if (!overlayElement) {
        return;
      }


      overlayElement.onclick = (event) => {

        /*
         * Empêche le clic sur la flèche de sélectionner
         * ou de propager l'événement au Task.
         */

        event.preventDefault();
        event.stopPropagation();

        openUrl(url);
      };

    }, 0);
  }


  /*
   * ============================================================
   * CRÉATION DE L'OVERLAY LORSQU'UNE FORME EST AJOUTÉE
   * ============================================================
   */

  eventBus.on('shape.added', (event: any) => {

    addOverlay(event.element);

  });


  /*
   * ============================================================
   * MISE À JOUR DE L'OVERLAY
   *
   * Nécessaire lorsque la propriété "link" est modifiée.
   * ============================================================
   */

  eventBus.on('element.changed', (event: any) => {

    const element = event.element;


    /*
     * Seules les Tasks sont concernées.
     */

    if (!is(element, 'bpmn:Task')) {
      return;
    }


    /*
     * Suppression de l'ancien overlay.
     */

    overlays.remove({
      element,
      type: 'url-link',
    });


    /*
     * Recréation si une URL existe toujours.
     */

    addOverlay(element);

  });
}


/*
 * ============================================================
 * INJECTION DES DÉPENDANCES
 * ============================================================
 */

UrlClickHandler.$inject = [
  'eventBus',
  'overlays',
];


/*
 * ============================================================
 * MODULE BPMN-JS
 * ============================================================
 */

export default {
  __init__: [
    'urlClickHandler',
  ],

  urlClickHandler: [
    'type',
    UrlClickHandler,
  ],
};
