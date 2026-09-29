import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isHorizontal } from 'bpmn-js/lib/util/DiUtil';

/*
============================================================
FIX VERTICAL PARTICIPANT / LANE HIT ZONES
============================================================

bpmn-js 16.x renders vertical participants and supports their
resize behavior, but the vertical interaction hit zone fix
was added upstream in bpmn-js 17.0.2 (issue #2093).

This local module reproduces only that small interaction fix,
without upgrading bpmn-js and its dependency tree.

============================================================
FIN FIX
============================================================
*/

const LOW_PRIORITY = -1000;
/*
  ANCIENNE CONSTANTE — conservée pour comparaison / retour arrière
  const LABEL_WIDTH = 30;
*/
const LABEL_HEIGHT = 30;

function VerticalInteractionHitFix(eventBus: any, interactionEvents: any) {
  eventBus.on(
    [
      'interactionEvents.createHit',
      'interactionEvents.updateHit',
    ],
    LOW_PRIORITY,
    (context: any) => {
      const element = context.element;
      const gfx = context.gfx;

      if (!is(element, 'bpmn:Participant') && !is(element, 'bpmn:Lane')) {
        return;
      }

      if (isHorizontal(element)) {
        return;
      }

      /*
        ANCIEN COMPORTEMENT — conservé pour comparaison / retour arrière

        bpmn-js 16.x crée pour un participant/lane vertical une zone
        "all" de 30px de large et toute la hauteur.
      */

      interactionEvents.removeHits(gfx);

      interactionEvents.createBoxHit(gfx, 'no-move', {
        width: element.width,
        height: element.height,
      });

      interactionEvents.createBoxHit(gfx, 'click-stroke', {
        width: element.width,
        height: element.height,
      });

      // Pour un élément vertical, l'étiquette est en haut.
      interactionEvents.createBoxHit(gfx, 'all', {
        width: element.width,
        height: LABEL_HEIGHT,
      });

      return true;
    },
  );
}

VerticalInteractionHitFix.$inject = [ 'eventBus', 'interactionEvents' ];

export default {
  __init__: [ 'verticalInteractionHitFix' ],
  verticalInteractionHitFix: [ 'type', VerticalInteractionHitFix ],
};
