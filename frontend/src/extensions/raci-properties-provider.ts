import { is } from 'bpmn-js/lib/util/ModelUtil';
import { TextFieldEntry, isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

class RaciPropertiesProvider {
  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:BaseElement')) return groups;
      if (groups.some((group: any) => group.id === 'raci')) return groups;
      const entry = (id: string, property: string, label: string) => ({
        id, element, component: RaciTextEntry, isEdited: isTextFieldEntryEdited, label, raciProperty: property,
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
  const getValue = () => String(element.businessObject?.get?.('raci:' + raciProperty) ?? '');
  const setValue = (value: string) => modeling.updateProperties(element, { ['raci:' + raciProperty]: value || undefined });
  return TextFieldEntry({ element, id, label, getValue, setValue, debounce });
}

export default RaciPropertiesProvider;