import {
  getDi,
  is
} from 'bpmn-js/lib/util/ModelUtil';

import { isHorizontal } from 'bpmn-js/lib/util/DiUtil';

import {
  CheckboxEntry,
  isCheckboxEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

/*
============================================================
ANCIENNE VERSION
============================================================

Cette extension est nouvelle sur test/recherche-v1.
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

      const generalGroup = groups.find(group => group.id === 'general');

      if (!generalGroup) {
        return groups;
      }

      generalGroup.entries.push({
        id: 'lane-orientation-horizontal',
        element,
        component: LaneOrientationEntry,
        isEdited: isCheckboxEntryEdited
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
    return modeling.updateModdleProperties(
      element,
      getDi(element),
      {
        isHorizontal: value
      }
    );
  };

  return CheckboxEntry({
    element,
    id,
    label: 'Horizontale',
    getValue,
    setValue
  });
}

export default LaneOrientationPropertiesProvider;
