import { createElement } from 'react';
import { useQuery } from 'react-query';
import { is } from 'bpmn-js/lib/util/ModelUtil';
// @ts-expect-error SelectEntry is available at runtime in @bpmn-io/properties-panel 3.44.1 but is missing from its declaration surface.
import { SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

import { resourcesQuery } from '../api/resources/resources.queries';
import type { Resource } from '../Types';
import { ResourceType } from '../shared/types/BpmnResource';

class CallActivityPropertiesProvider {
  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:CallActivity')) return groups;

      // Replace the raw technical calledElement input with a process selector.
      const groupsWithoutRawCalledElement = groups
        .map(group => ({
          ...group,
          entries: group.entries?.filter(
            (entry: any) => entry.id !== 'calledElement',
          ),
        }))
        .filter(
          group => !Array.isArray(group.entries) || group.entries.length > 0,
        );

      if (
        groupsWithoutRawCalledElement.some(
          group => group.id === 'bpmnToolCallActivity',
        )
      ) {
        return groupsWithoutRawCalledElement;
      }

      groupsWithoutRawCalledElement.push({
        id: 'bpmnToolCallActivity',
        label: 'Processus appelé',
        entries: [
          {
            id: 'bpmnToolCalledElement',
            element,
            component: CallActivityProcessSelectEntry,
            isEdited: (node: any) => Boolean(node?.value),
            label: 'Processus cible',
          },
        ],
      });

      return groupsWithoutRawCalledElement;
    };
  }
}

function CallActivityProcessSelectEntry(props: any) {
  const { element, id, label } = props;
  const modeling = useService('modeling');
  const {
    data: processes = [],
    isLoading,
    isError,
  } = useQuery(resourcesQuery({ type: ResourceType.Process }));

  const getValue = () =>
    String(element.businessObject?.calledElement ?? '');

  const setValue = (value: string) => {
    modeling.updateProperties(element, {
      calledElement: value || undefined,
    });
  };

  const getOptions = () => {
    const currentValue = getValue();
    const sortedProcesses = [...(processes as Resource[])].sort((left, right) =>
      left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' }),
    );
    const nameCounts = new Map<string, number>();

    sortedProcesses.forEach(process => {
      nameCounts.set(process.name, (nameCounts.get(process.name) ?? 0) + 1);
    });

    const options = sortedProcesses.map(process => ({
      value: process.id,
      label:
        nameCounts.get(process.name)! > 1
          ? `${process.name} — ${process.id.slice(0, 8)}`
          : process.name,
    }));

    if (
      currentValue &&
      !sortedProcesses.some(process => process.id === currentValue)
    ) {
      options.unshift({
        value: currentValue,
        label: `Processus inaccessible ou indisponible — ${currentValue.slice(0, 8)}`,
      });
    }

    let placeholder = '— Sélectionner un processus —';
    if (isLoading) {
      placeholder = 'Chargement des processus…';
    } else if (isError) {
      placeholder = 'Liste des processus indisponible';
    }

    return [{ value: '', label: placeholder }, ...options];
  };

  // Render the properties-panel entry as a React component. Calling it as a
  // plain function executes its hooks outside React and triggers error #321.
  return createElement(SelectEntry, {
    element,
    id,
    label,
    getValue,
    setValue,
    getOptions,
  });
}

export default CallActivityPropertiesProvider;
