import { is } from 'bpmn-js/lib/util/ModelUtil';

import {
  TextFieldEntry,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


/*
============================================================
ANCIEN CODE
============================================================

import { is } from 'bpmn-js/lib/util/ModelUtil';

import {
  TextFieldEntry,
  isTextFieldEntryEdited,
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

class UrlPropertiesProvider {

  getGroups(element: any) {

    return (groups: any[]) => {

      if (!is(element, 'bpmn:Task')) {
        return groups;
      }

      groups.push({
        id: 'url',
        label: 'Procédure',
        entries: [
          {
            id: 'procedureUrl',
            element,
            component: UrlField,
            isEdited: isTextFieldEntryEdited
          }
        ]
      });

      return groups;
    };
  }
}


function UrlField(props: any) {

  const { element, id } = props;

  const modeling = useService('modeling');

  const value =
    element.businessObject.get('wiki:procedureUrl') || '';

  const setValue = (value: string) => {

    modeling.updateProperties(element, {
      'wiki:procedureUrl': value
    });

  };

  return (
    <TextFieldEntry
      id={id}
      element={element}
      label="Procedure URL"
      getValue={() => value}
      setValue={setValue}
    />
  );
}


export default UrlPropertiesProvider;

============================================================
FIN ANCIEN CODE
============================================================
*/


class UrlPropertiesProvider {

  getGroups(element: any) {

    return (groups: any[]) => {

      if (!is(element, 'bpmn:Task')) {
        return groups;
      }

      groups.push({
        id: 'url',
        label: 'Procédure',
        entries: [
          {
            id: 'procedureUrl',
            element,
            component: UrlField,
            isEdited: isTextFieldEntryEdited
          }
        ]
      });

      return groups;
    };
  }
}


function UrlField(props: any) {

  const { element, id } = props;

  const modeling = useService('modeling');

  const value =
    element.businessObject.get('wiki:procedureUrl') || '';

  const setValue = (value: string) => {

    modeling.updateProperties(element, {
      'wiki:procedureUrl': value
    });

  };

  return (
    <div>

      <TextFieldEntry
        id={id}
        element={element}
        label="Procedure URL"
        getValue={() => value}
        setValue={setValue}
      />

      {value && (
        <div style={{ marginTop: '8px' }}>

          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              cursor: 'pointer'
            }}
          >
            Ouvrir la procédure ↗
          </a>

        </div>
      )}

    </div>
  );
}


export default UrlPropertiesProvider;
