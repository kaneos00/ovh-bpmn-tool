import { is } from 'bpmn-js/lib/util/ModelUtil';

/*
============================================================
DIAGNOSTIC INTERACTION EVENTS
============================================================

Module temporaire pour diagnostiquer les déplacements de
Participant / Lane / Task, notamment en orientation verticale.

Ce module ne modifie aucun comportement : il journalise
uniquement les événements d'interaction et de command stack.

============================================================
FIN DIAGNOSTIC
============================================================
*/

const LOW_PRIORITY = -1000;

function InteractionDiagnostic(eventBus: any) {
  const events = [
    'drag.start',
    'drag.move',
    'drag.end',
    'drag.cleanup',
    'shape.move.start',
    'shape.move.move',
    'shape.move.end',
    'commandStack.shape.move.preExecute',
    'commandStack.shape.move.execute',
    'commandStack.shape.move.postExecute',
    'commandStack.shape.move.revert',
    'commandStack.shape.move.postRevert',
    'commandStack.shape.move.cancel',
    'element.changed',
  ];

  events.forEach((eventName) => {
    eventBus.on(eventName, LOW_PRIORITY, (event: any) => {
      const context = event.context || {};
      const shape = context.shape || context.element;

      if (shape && !is(shape, 'bpmn:Participant') &&
          !is(shape, 'bpmn:Lane') &&
          !is(shape, 'bpmn:Task')) {
        return;
      }

      console.log('[BPMN-INTERACTION]', eventName, {
        id: shape?.id,
        type: shape?.$type,
        x: shape?.x,
        y: shape?.y,
        width: shape?.width,
        height: shape?.height,
        context,
      });
    });
  });
}

InteractionDiagnostic.$inject = [ 'eventBus' ];

export default {
  __init__: [ 'interactionDiagnostic' ],
  interactionDiagnostic: [ 'type', InteractionDiagnostic ],
};
