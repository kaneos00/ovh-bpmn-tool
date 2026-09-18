import { is } from 'bpmn-js/lib/util/ModelUtil';

import {
  TextFieldEntry,
  isTextFieldEntryEdited,
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


/*
============================================================
ANCIEN CODE / VERSION FONCTIONNELLE RETROUVÉE
============================================================

Cette version correspond au commit cb67a8d
et affichait correctement la propriété URL.

============================================================
*/


class UrlPropertiesProvider {

  getGroups(element: any) {

    return (groups: any[]) => {

      if (!is(element, 'bpmn:BaseElement')) {
        return groups;
      }

      groups.push({

        id: 'url',

        label: 'URL',

        entries: [

          {
            id: 'url-link',

            element,

            component: UrlEntry,

            isEdited: isTextFieldEntryEdited,

          },

        ],

      });

      return groups;

    };

  }

}


function UrlEntry(props: any) {

  const { element, id } = props;

  const modeling = useService('modeling');

  const debounce = useService('debounceInput');


  const getValue = () => {

    return element.businessObject['url:link'] || '';

  };


  const setValue = (value: string) => {

    return modeling.updateProperties(element, {

      'url:link': value || undefined,

    });

  };


  return TextFieldEntry({

    element,

    id,

    label: 'URL',

    getValue,

    setValue,

    debounce,

  });

}


export default UrlPropertiesProvider;
