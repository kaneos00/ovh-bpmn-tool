import { is } from 'bpmn-js/lib/util/ModelUtil';

import {
  TextFieldEntry,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


/*
============================================================
ANCIEN CODE - VERSION QUI FONCTIONNAIT
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
            id: 'link',
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
    element.businessObject.get('url:link') || '';

  const setValue = (value: string) => {

    modeling.updateProperties(element, {
      'url:link': value
    });

  };

  return (
    <TextFieldEntry
      id={id}
      element={element}
      label="URL"
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
            id: 'link',
            element,
            component: UrlField,
            isEdited: isTextFieldEntryEdited
          }
        ]
      });

      return groups;
    };
  };
}


function UrlField(props: any) {

  const { element, id } = props;

  const modeling = useService('modeling');

  const value =
    element.businessObject.get('url:link') || '';

  const setValue = (value: string) => {

    modeling.updateProperties(element, {
      'url:link': value
    });

  };

  /*
   * On conserve exactement le TextFieldEntry
   * qui fonctionnait auparavant.
   *
   * Le lien est ajouté dans la description du champ.
   */

  return TextFieldEntry({
    id,
    element,
    label: 'URL',
    getValue: () => value,
    setValue,

    description: value
      ? `Ouvrir la procédure : ${value}`
      : undefined
  } as any);
}


export default UrlPropertiesProvider;
