import { useEffect, useRef, useState } from 'react';

import { useSnackbar } from '../../../shared/hooks/useSnackbar';
import {
  BpmnLintIssues,
  PropertiesPanel,
  checkForLinterIssues,
} from '../../../Components/BusinessComponents/Modeler/helpers';
import Modeler from 'camunda-bpmn-js/lib/base/Modeler';
import { useBpmnToolOptions } from '../../../Providers/BpmnToolOptions/useBpmnToolOptions';

export const useModeler = (bpmnModelerInstance: Modeler, content?: string) => {
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const diagramPropertiesRef = useRef<HTMLDivElement>(null);
  const [hasLintError, setHasLintError] = useState(false);

  const { getModelerProviders } = useBpmnToolOptions();

  const providersRegisteredRef = useRef(false);
  const removeSelectionListenerRef = useRef<(() => void) | null>(null);

  const propertiesPanel: PropertiesPanel =
    bpmnModelerInstance.get('propertiesPanel');

  const { showAlert } = useSnackbar();

  const attachModeler = () => {
    if (!diagramContainerRef.current || !diagramPropertiesRef.current) {
      showAlert({
        message: 'Diagram or Properties ref are undefined',
        severity: 'danger',
      });
      return;
    }

    bpmnModelerInstance.attachTo(diagramContainerRef.current);

    if (!providersRegisteredRef.current) {
      const providers = getModelerProviders();

      providers.forEach(({ priority, instance: ProviderInstance }) => {
        propertiesPanel.registerProvider(priority, new ProviderInstance());
      });

      providersRegisteredRef.current = true;
    }

    propertiesPanel.attachTo(diagramPropertiesRef.current);

    const propertiesContainer = diagramPropertiesRef.current;
    propertiesContainer.style.display = 'none';
    removeSelectionListenerRef.current?.();

    const eventBus = bpmnModelerInstance.get('eventBus') as { on: Function; off: Function };
    const collapsedTab = diagramContainerRef.current?.parentElement
      ?.querySelector('.properties-panel-collapsed-tab') as HTMLElement | null;

    const syncPropertiesPanel = (event?: { newSelection?: unknown[] }) => {
      const selected = event?.newSelection ?? (bpmnModelerInstance.get('selection') as { get?: () => unknown[] } | undefined)?.get?.() ?? [];
      const hasActivitySelected = Array.isArray(selected) && selected.some(item => {
        const element = item as { type?: unknown; businessObject?: { $type?: unknown } };
        const type = String(element?.type ?? element?.businessObject?.$type ?? '');
        return /(?:Task|CallActivity|SubProcess|Transaction)$/.test(type);
      });

      propertiesContainer.style.display = hasActivitySelected ? 'block' : 'none';
      if (collapsedTab) collapsedTab.style.display = hasActivitySelected ? 'none' : 'flex';
    };

    eventBus.on('selection.changed', syncPropertiesPanel);
    syncPropertiesPanel();
    removeSelectionListenerRef.current = () => {
      eventBus.off('selection.changed', syncPropertiesPanel);
    };
  };

  useEffect(() => {
    if (diagramContainerRef.current && diagramPropertiesRef.current) {
      if (!content) {
        bpmnModelerInstance
          .createDiagram()
          .then(() => attachModeler())
          .catch(() =>
            showAlert({
              message: 'Failed to render file',
              severity: 'danger',
            }),
          );
      } else {
        bpmnModelerInstance
          .importXML(content)
          .then(() => attachModeler())
          .catch(() =>
            showAlert({
              message: 'Failed to import file',
              severity: 'danger',
            }),
          );
      }

      const onLintingCompleted = ({
        issues,
      }: {
        issues: BpmnLintIssues;
      }) => {
        setHasLintError(checkForLinterIssues(issues));
      };

      bpmnModelerInstance.on('linting.completed', onLintingCompleted);

      return () => {
        bpmnModelerInstance.off('linting.completed', onLintingCompleted);
        removeSelectionListenerRef.current?.();
        removeSelectionListenerRef.current = null;
      };
    }

    return undefined;
  }, [bpmnModelerInstance, content, getModelerProviders, propertiesPanel, showAlert]);

  return {
    diagramContainerRef,
    diagramPropertiesRef,
    hasLintError,
  };
};
