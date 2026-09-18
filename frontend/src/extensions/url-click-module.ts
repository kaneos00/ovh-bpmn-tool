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
     * Même structure que le contrôle Drilldown natif de bpmn-js.
     *
     * La flèche est orientée :
     *
     *       ↗
     *      /
     *     /
     *    ↙
     *
     * bas-gauche -> haut-droite
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


    overlays.add(element, 'url-link', {

      /*
       * Position exactement comme le contrôle Drilldown
       * natif de bpmn-js.
       */
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
          ${ARROW_UP_RIGHT_SVG}
        </button>
      `,
    });


    /*
     * Récupération du bouton après création de l'overlay.
     *
     * IMPORTANT :
     * on reste à l'intérieur de addOverlay(), donc element,
     * url et openUrl() sont bien dans leur portée.
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
         * Le clic reste uniquement sur le contrôle URL.
         * Il ne sélectionne donc pas le Task.
         */
        event.preventDefault();
        event.stopPropagation();

        openUrl(url);
      };

    }, 0);
  }
