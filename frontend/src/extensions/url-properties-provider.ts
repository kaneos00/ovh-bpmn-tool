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

  /*
   * ANCIEN CODE
   * ----------
   * La propriété XML était recherchée directement avec son nom
   * préfixé "url:link". Or, dans bpmn-moddle, la propriété JavaScript
   * correspondante est "link".
   *
   * const getValue = () => {
   *   return element.businessObject.$attrs?.['url:link'] || '';
   * };
   *
   * Ancien code de debug :
   *
   * const getValue = () => {
   *   console.log('URL DEBUG', {
   *     element,
   *     businessObject: element.businessObject,
   *     attrs: element.businessObject?.$attrs,
   *     urlLink: element.businessObject?.['url:link'],
   *     type: element.businessObject?.$type,
   *     model: element.businessObject?.$model,
   *   });
   *
   *   return element.businessObject?.['url:link'] || '';
   * };
   *
   * const setValue = (value: string) => {
   *   return modeling.updateProperties(element, {
   *     'url:link': value || undefined,
   *   });
   * };
   */

  /*
   * NOUVEAU CODE
   * ------------
   * En JavaScript, bpmn-moddle expose la propriété sous le nom "link".
   * Le préfixe "url:" est utilisé lors de la sérialisation XML.
   */
  const getValue = () => {
    return element.businessObject?.link || '';
  };

  const setValue = (value: string) => {
    return modeling.updateProperties(element, {
      link: value || undefined,
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
