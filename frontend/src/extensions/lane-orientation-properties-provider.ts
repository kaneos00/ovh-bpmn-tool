import { getDi, is } from 'bpmn-js/lib/util/ModelUtil';
import { isHorizontal } from 'bpmn-js/lib/util/DiUtil';

import {
  CheckboxEntry,
  isCheckboxEntryEdited,
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

/*
============================================================
ANCIENNE VERSION
============================================================

Cette extension est nouvelle sur cette branche.
Il n'existe donc pas d'ancienne version de ce fichier.

============================================================
FIN ANCIENNE VERSION
============================================================
*/

class LaneOrientationPropertiesProvider {
  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:Participant')) {
        return groups;
      }

      const generalGroup = groups.find((group: any) => group.id === 'general');

      if (!generalGroup) {
        return groups;
      }

      /*
        ANCIEN CODE — conservé pour comparaison / retour arrière

        generalGroup.entries.push({
          id: 'lane-orientation-horizontal',
          element,
          component: LaneOrientationEntry,
          isEdited: isCheckboxEntryEdited,
        });
      */

      if (
        generalGroup.entries.some(
          (entry: any) => entry.id === 'lane-orientation-horizontal',
        )
      ) {
        return groups;
      }

      generalGroup.entries.push({
        id: 'lane-orientation-horizontal',
        element,
        component: LaneOrientationEntry,
        isEdited: isCheckboxEntryEdited,
      });

      return groups;
    };
  }
}

function LaneOrientationEntry(props: any) {
  const { element, id } = props;
  const modeling = useService('modeling');

  const getValue = () => {
    return isHorizontal(element);
  };

  const setValue = (value: boolean) => {
    /*
      ANCIEN CODE — conservé pour comparaison / retour arrière

      return modeling.updateModdleProperties(
        element,
        getDi(element),
        {
          isHorizontal: value,
        },
      );
    */

    // L'orientation doit être cohérente entre le Participant
    // et toutes ses Lane DI. Sinon les règles de déplacement
    // et de redimensionnement utilisent des axes différents.
    const updateOrientation = (shape: any) => {
      modeling.updateModdleProperties(
        shape,
        getDi(shape),
        {
          isHorizontal: value,
        },
      );

      shape.children?.forEach((child: any) => {
        if (is(child, 'bpmn:Lane')) {
          updateOrientation(child);
        }
      });
    };

    return updateOrientation(element);
  };

  return CheckboxEntry({
    element,
    id,
    label: 'Horizontale',
    getValue,
    setValue,
  });
}

export default LaneOrientationPropertiesProvider;
