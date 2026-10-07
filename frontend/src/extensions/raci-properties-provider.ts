import { is } from 'bpmn-js/lib/util/ModelUtil';
// @ts-expect-error SelectEntry is available at runtime in @bpmn-io/properties-panel 3.44.1 but is missing from its declaration surface.
import { SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

import { getConfiguredRaciActors, inferRaciActors } from './raci-engine';

const RACICODES = [
  { property: 'responsible', label: 'R — Responsable' },
  { property: 'accountable', label: 'A — Acteur' },
  { property: 'consulted', label: 'C — Consulté' },
  { property: 'informed', label: 'I — Informé' },
] as const;

const getProcess = (element: any): any | undefined => {
  let current = element?.businessObject ?? element;

  while (current) {
    if (current.$type === 'bpmn:Process') return current;
    current = current.$parent;
  }

  return undefined;
};

const getActors = (element: any): string[] => {
  const process = getProcess(element);
  if (!process) return [];

  const configured = getConfiguredRaciActors({ rootElements: [ process ] });
  return configured ?? inferRaciActors({ rootElements: [ process ] });
};

class RaciPropertiesProvider {
  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:BaseElement')) return groups;

      // RACI is meaningful only for BPMN tasks/activities, not events,
      // gateways, sequence flows, data objects, etc.
      const type = element?.businessObject?.$type ?? element?.type ?? '';
      const isRaciTask = /^bpmn:(Task|UserTask|ServiceTask|ManualTask|ScriptTask|BusinessRuleTask|SendTask|ReceiveTask|CallActivity|SubProcess|Transaction)$/.test(type);
      if (!isRaciTask) return groups;

      if (groups.some((group: any) => group.id === 'raci')) return groups;

      const entry = (id: string, property: string, label: string) => ({
        id,
        element,
        component: RaciSelectEntry,
        isEdited: (node: any) => Boolean(node?.value),
        label,
        raciProperty: property,
      });

      groups.push({
        id: 'raci',
        label: 'RACI',
        entries: RACICODES.map(({ property, label }) =>
          entry(`raci-${property}`, property, label),
        ),
      });

      return groups;
    };
  }
}

function RaciSelectEntry(props: any) {
  const { element, id, label, raciProperty } = props;
  const modeling = useService('modeling');

  const getValue = () => {
    const businessObject = element.businessObject;
    const value = businessObject?.get
      ? businessObject.get(raciProperty)
      : businessObject?.[raciProperty];

    return String(value ?? '');
  };

  const setValue = (value: string) => {
    modeling.updateProperties(element, {
      [raciProperty]: value || undefined,
    });
  };

  const getOptions = () => [
    { value: '', label: '<Aucun>' },
    ...getActors(element).map(actor => ({
      value: actor,
      label: actor,
    })),
  ];

  return SelectEntry({
    element,
    id,
    label,
    getValue,
    setValue,
    getOptions,
  });
}

export default RaciPropertiesProvider;
