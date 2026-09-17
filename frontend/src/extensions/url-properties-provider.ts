import { is } from 'bpmn-js/lib/util/ModelUtil';

import {
  TextFieldEntry,
  isTextFieldEntryEdited,
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


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
            isEdited: isTextFieldEntryEdited
          }
        ]
      });

      return groups;
    };
  }

}


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


export default UrlPropertiesProvider;
