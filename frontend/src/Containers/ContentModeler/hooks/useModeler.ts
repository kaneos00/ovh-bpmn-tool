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
  const [isDirty, setIsDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const { getModelerProviders } = useBpmnToolOptions();

  const providersRegisteredRef = useRef(false);
  const importGenerationRef = useRef(0);
  const importQueueRef = useRef<Promise<void>>(Promise.resolve());
  const removeSelectionListenerRef = useRef<(() => void) | null>(null);
  const removeCommandStackListenerRef = useRef<(() => void) | null>(null);
  const savedStackIndexRef = useRef(0);

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

    const commandStack = bpmnModelerInstance.get('commandStack') as any;
    const eventBus = bpmnModelerInstance.get('eventBus') as any;
    const syncCommandStackState = () => {
      setCanUndo(Boolean(commandStack?.canUndo?.()));
      setCanRedo(Boolean(commandStack?.canRedo?.()));
      setIsDirty(Number(commandStack?._stackIdx ?? 0) !== savedStackIndexRef.current);
    };
    removeCommandStackListenerRef.current?.();
    savedStackIndexRef.current = Number(commandStack?._stackIdx ?? 0);
    eventBus.on('commandStack.changed', syncCommandStackState);
    syncCommandStackState();
    removeCommandStackListenerRef.current = () => eventBus.off('commandStack.changed', syncCommandStackState);

    // Apply semantic color markers to the imported BPMN elements in the editor.
    const canvas = bpmnModelerInstance.get('canvas') as any;
    const elementRegistry = bpmnModelerInstance.get('elementRegistry') as any;
    elementRegistry.getAll().forEach((element: any) => {
      if (element?.type === 'bpmn:StartEvent') {
        canvas.addMarker(element.id, 'bpmn-start-event');
      } else if (element?.type === 'bpmn:EndEvent') {
        canvas.addMarker(element.id, 'bpmn-end-event');
      } else if (element?.type === 'bpmn:DataStoreReference') {
        canvas.addMarker(element.id, 'bpmn-data-store');
      } else if (element?.type === 'bpmn:DataObjectReference') {
        canvas.addMarker(element.id, 'bpmn-data-object-reference');
      } else if (element?.type === 'bpmn:ParallelGateway') {
        canvas.addMarker(element.id, 'bpmn-gateway-parallel');
      } else if (element?.type === 'bpmn:InclusiveGateway') {
        canvas.addMarker(element.id, 'bpmn-gateway-inclusive');
      } else if (element?.type === 'bpmn:ComplexGateway') {
        canvas.addMarker(element.id, 'bpmn-gateway-complex');
      } else if (element?.type === 'bpmn:EventBasedGateway') {
        canvas.addMarker(element.id, 'bpmn-gateway-event-based');
      }
    });

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

    const eventBus = bpmnModelerInstance.get('eventBus') as {
      on: (event: string, callback: (event: { newSelection?: unknown[] }) => void) => void;
      off: (event: string, callback: (event: { newSelection?: unknown[] }) => void) => void;
    };
    const collapsedTabs = diagramContainerRef.current?.parentElement
      ?.querySelectorAll('.properties-panel-collapsed-tab');

    const syncPropertiesPanel = (event?: { newSelection?: unknown[] }) => {
      const selected = event?.newSelection ?? (bpmnModelerInstance.get('selection') as { get?: () => unknown[] } | undefined)?.get?.() ?? [];
      const hasElementSelected = Array.isArray(selected) && selected.length > 0;

      // The panel is driven by the actual BPMN selection, including lanes,
      // events, gateways and activities. Never leave the plugin's collapsed
      // tab behind after a selection is cleared.
      propertiesContainer.style.display = hasElementSelected ? 'block' : 'none';
      collapsedTabs?.forEach(tab => {
        (tab as HTMLElement).style.display = 'none';
      });
    };

    eventBus.on('selection.changed', syncPropertiesPanel);
    syncPropertiesPanel();
    removeSelectionListenerRef.current = () => {
      eventBus.off('selection.changed', syncPropertiesPanel);
    };
  };

  useEffect(() => {
    const generation = ++importGenerationRef.current;

    if (!diagramContainerRef.current || !diagramPropertiesRef.current) {
      return () => {
        if (importGenerationRef.current === generation) importGenerationRef.current += 1;
      };
    }

    const onLintingCompleted = ({ issues }: { issues: BpmnLintIssues }) => {
      if (generation === importGenerationRef.current) {
        setHasLintError(checkForLinterIssues(issues));
      }
    };

    bpmnModelerInstance.on('linting.completed', onLintingCompleted);

    // Serialize imports on the shared Modeler. Rapid content changes must not
    // leave older imports attaching listeners or panels after a newer render.
    const importTask = importQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (generation !== importGenerationRef.current) return;
        if (content) {
          await bpmnModelerInstance.importXML(content);
        } else {
          await bpmnModelerInstance.createDiagram();
        }

        if (generation !== importGenerationRef.current) return;
        setIsDirty(false);
        attachModeler();
      })
      .catch(() => {
        if (generation === importGenerationRef.current) {
          showAlert({
            message: content ? 'Failed to import file' : 'Failed to render file',
            severity: 'danger',
          });
        }
      });

    importQueueRef.current = importTask;

    return () => {
      if (importGenerationRef.current === generation) importGenerationRef.current += 1;
      bpmnModelerInstance.off('linting.completed', onLintingCompleted);
      removeSelectionListenerRef.current?.();
      removeSelectionListenerRef.current = null;
      removeCommandStackListenerRef.current?.();
      removeCommandStackListenerRef.current = null;
    };
  }, [bpmnModelerInstance, content, getModelerProviders, propertiesPanel, showAlert]);

  const undo = () => (bpmnModelerInstance.get('commandStack') as any)?.undo?.();
  const redo = () => (bpmnModelerInstance.get('commandStack') as any)?.redo?.();
  const markSaved = () => {
    const commandStack = bpmnModelerInstance.get('commandStack') as any;
    savedStackIndexRef.current = Number(commandStack?._stackIdx ?? 0);
    setIsDirty(false);
    setCanUndo(Boolean(commandStack?.canUndo?.()));
    setCanRedo(Boolean(commandStack?.canRedo?.()));
  };
  return { diagramContainerRef, diagramPropertiesRef, hasLintError, isDirty, canUndo, canRedo, undo, redo, markSaved };
};
