import {
  is,
  isAny,
} from 'bpmn-js/lib/util/ModelUtil';

import {
  TextFieldEntry,
  isTextFieldEntryEdited,
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

const LOW_PRIORITY = 500;

function UrlPropertiesProvider(propertiesPanel: any, translate: any) {
  this.getGroups = function(element: any) {
    return function(groups: any[]) {

      if (!isAny(element, [
        'bpmn:BaseElement'
      ])) {
        return groups;
      }

      groups.push({
        id: 'url',
        label: 'URL',
        entries: [
          {
            id: 'url',
            element,
            component: UrlEntry,
            isEdited: isTextFieldEntryEdited
          }
        ]
      });

      return groups;
    };
  };
}

UrlPropertiesProvider.$inject = [
  'propertiesPanel',
  'translate'
];

function UrlEntry(props: any) {
  const { element, id } = props;

  const modeling = useService('modeling');

  const getValue = () => {
    return element.businessObject.get('url:link') || '';
  };

  const setValue = (value: string) => {
    modeling.updateProperties(element, {
      'url:link': value || undefined
    });
  };

  return TextFieldEntry({
    element,
    id,
    label: 'URL',
    getValue,
    setValue
  });
}

export default {
  __init__: [
    'urlPropertiesProvider'
  ],
  urlPropertiesProvider: [
    'type',
    UrlPropertiesProvider
  ]
};
