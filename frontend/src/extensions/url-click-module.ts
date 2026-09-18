    /*
     * ============================================================
     * ANCIEN RENDU — conservé pour comparaison / retour arrière
     * ============================================================
     *
     * overlays.add(element, 'url-link', {
     *   position: {
     *     bottom: -7,
     *     right: -8,
     *   },
     *
     *   html: `
     *     <button
     *       type="button"
     *       class="bjs-drilldown url-link-overlay"
     *       title="Ouvrir le lien"
     *       style="
     *         color: #1976d2;
     *       "
     *     >
     *       ${ARROW_DOWN_SVG}
     *     </button>
     *   `,
     * });
     *
     * ============================================================
     */


    /*
     * Flèche diagonale :
     *
     * départ  = bas-gauche
     * arrivée = haut-droite
     *
     * Même zone graphique que le contrôle natif bpmn-js.
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
     * Laisser bpmn-js terminer la création de l'overlay,
     * puis rechercher le bouton correspondant au Task.
     *
     * On utilise l'overlay container associé à l'élément
     * plutôt que le dernier bouton trouvé dans tout le document.
     */
    setTimeout(() => {

      const overlayElements = document.querySelectorAll(
        '.url-link-overlay',
      );

      let overlayElement: HTMLElement | null = null;

      for (let i = 0; i < overlayElements.length; i++) {

        const candidate =
          overlayElements[i] as HTMLElement;

        /*
         * Le bouton doit appartenir au même overlay
         * que celui que nous venons de créer.
         */
        const parentOverlay =
          candidate.closest('.djs-overlay');

        if (parentOverlay) {
          overlayElement = candidate;
          break;
        }
      }

      if (!overlayElement) {
        return;
      }


      overlayElement.onclick = (event) => {

        /*
         * Empêche le clic de remonter vers le diagramme BPMN.
         */
        event.preventDefault();
        event.stopPropagation();

        openUrl(url);
      };

    }, 0);
