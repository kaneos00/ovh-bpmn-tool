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
  selection: any,
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

    const ARROW_UP_RIGHT_SVG = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 16 16"
      >
        <path
          fill="white"
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
            color: white;
            background: #1976d2;
          "
        >
          ${ARROW_UP_RIGHT_SVG}
        </button>
      `,
    });

    /*
     * ANCIEN CODE — conservé pour comparaison / retour arrière
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
     */

    setTimeout(() => {

      const overlayElement = document.querySelector(
        `.url-link-overlay[data-url-task-id="${element.id}"]`,
      ) as HTMLButtonElement | null;

      if (!overlayElement) {
        return;
      }

      overlayElement.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openUrl(url);
      };

    }, 0);
  }

  /*
   * ============================================================
   * ANCIEN COMPORTEMENT DE SÉLECTION
   * ============================================================
   *
   * eventBus.on('selection.changed', (event: any) => {
   *   refreshSelection(event.newSelection || []);
   * });
   *
   * Le problème était que refreshSelection supprimait les
   * overlays de la nouvelle sélection, et non ceux de la
   * sélection précédente.
   * ============================================================
   */

  function removeUrlOverlay(element: any) {
    if (!element) {
      return;
    }

    overlays.remove({
      element,
      type: 'url-link',
    });
  }

  eventBus.on('selection.changed', (event: any) => {

    const oldSelection = event.oldSelection || [];
    const newSelection = event.newSelection || [];

    /*
     * Supprime systématiquement l'overlay de l'ancienne sélection.
     * Ainsi, dès qu'on sélectionne une Lane, un Participant, un
     * Gateway, etc., la flèche de la Task précédente disparaît.
     */
    oldSelection.forEach((element: any) => {
      removeUrlOverlay(element);
    });

    /*
     * Sécurité : supprime également tout overlay éventuellement
     * présent sur les éléments de la nouvelle sélection qui ne
     * sont pas des Tasks.
     */
    newSelection.forEach((element: any) => {
      if (!is(element, 'bpmn:Task')) {
        removeUrlOverlay(element);
      }
    });

    const selected = newSelection[0];

    if (!selected || !isUrlTask(selected)) {
      return;
    }

    addOverlay(selected);
  });

  eventBus.on('element.changed', (event: any) => {

    const element = event.element;

    if (!is(element, 'bpmn:Task')) {
      return;
    }

    /*
     * ANCIEN CODE — conservé pour comparaison / retour arrière
     *
     * const selection = eventBus.get('selection').get();
     * const isSelected = selection?.includes(element);
     */

    const currentSelection = selection.get();
    const isSelected = currentSelection?.includes(element);

    overlays.remove({
      element,
      type: 'url-link',
    });

    if (isSelected) {
      addOverlay(element);
    }
  });

}

UrlClickHandler.$inject = [
  'eventBus',
  'overlays',
  'selection',
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
