import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { is } from 'bpmn-js/lib/util/ModelUtil';
// @ts-expect-error SelectEntry is available at runtime in @bpmn-io/properties-panel 3.44.1 but is missing from its declaration surface.
import { SelectEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

import { apiClient } from '../queryClient';
import type { Resource } from '../Types';
import { ResourceType } from '../shared/types/BpmnResource';

class CallActivityPropertiesProvider {
  getGroups(element: any) {
    return (groups: any[]) => {
      if (!is(element, 'bpmn:CallActivity')) return groups;

      // This provider runs after the Camunda provider and replaces its raw
      // calledElement text field with the application process selector.
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
  const [processes, setProcesses] = useState<Resource[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;

    apiClient
      .get(`/resources?filter.type=${ResourceType.Process}`)
      .then((result: Resource[]) => {
        if (cancelled) return;
        if (!Array.isArray(result)) {
          setLoadState('error');
          return;
        }
        setProcesses(result);
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getValue = () =>
    String(element.businessObject?.calledElement ?? '');

  const setValue = (value: string) => {
    modeling.updateProperties(element, {
      calledElement: value || undefined,
    });
  };

  const getOptions = () => {
    const currentValue = getValue();
    const sortedProcesses = [...processes].sort((left, right) =>
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
    if (loadState === 'loading') {
      placeholder = 'Chargement des processus…';
    } else if (loadState === 'error') {
      placeholder = 'Liste des processus indisponible';
    } else if (options.length === 0) {
      placeholder = 'Aucun processus accessible';
    }

    return [{ value: '', label: placeholder }, ...options];
  };

  // The properties panel is Preact-based: use Preact elements/hooks rather
  // than React hooks/elements inside its renderer.
  return h(SelectEntry, {
    element,
    id,
    label,
    getValue,
    setValue,
    getOptions,
  });
}

export default CallActivityPropertiesProvider;
