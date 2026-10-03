import { is } from 'bpmn-js/lib/util/ModelUtil';
import { TextFieldEntry, isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

class RaciPropertiesProvider {
  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:BaseElement')) return groups;
      if (groups.some((group: any) => group.id === 'raci')) return groups;

      const entry = (id: string, property: string, label: string) => ({
        id,
        element,
        component: RaciTextEntry,
        isEdited: isTextFieldEntryEdited,
        label,
        raciProperty: property,
      });

      groups.push({
        id: 'raci',
        label: 'RACI',
        entries: [
          entry('raci-responsible', 'responsible', 'R — Responsable'),
          entry('raci-accountable', 'accountable', 'A — Acteur'),
          entry('raci-consulted', 'consulted', 'C — Consulté'),
          entry('raci-informed', 'informed', 'I — Informé'),
        ],
      });
      return groups;
    };
  }
}

function RaciTextEntry(props: any) {
  const { element, id, label, raciProperty } = props;
  const modeling = useService('modeling');
  const debounce = useService('debounceInput');

  const getValue = () => {
    const businessObject = element.businessObject;

    const value = businessObject?.get
      ? businessObject.get(raciProperty)
      : businessObject?.[raciProperty];

    if (value !== undefined && value !== null) {
      return String(value);
    }

    // Compatibility with BPMN moddle access through the qualified
    // namespace name. The property is still written using the local
    // descriptor name so bpmn-js can serialize it through raci-model.json.
    const qualifiedValue = businessObject?.get
      ? businessObject.get(`raci:${raciProperty}`)
      : businessObject?.[`raci:${raciProperty}`];

    return String(qualifiedValue ?? '');
  };

  const setValue = (value: string) => {
    modeling.updateProperties(element, {
      [raciProperty]: value.trim() || undefined,
    });
  };

  return TextFieldEntry({ element, id, label, getValue, setValue, debounce });
}

export default RaciPropertiesProvider;
