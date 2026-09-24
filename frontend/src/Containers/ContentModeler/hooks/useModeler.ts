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

    const canvas = bpmnModelerInstance.get('canvas') as any;
    const controls = diagramContainerRef.current.querySelector(
      '.bpmn-tool-navigation-controls',
    );

    if (controls) {
      const zoom = (factor: number) => {
        const current = canvas.zoom();
        const rect = diagramContainerRef.current!.getBoundingClientRect();
        canvas.zoom(current * factor, {
          x: rect.width / 2,
          y: rect.height / 2,
        });
      };

      const handlers: Record<string, () => void> = {
        'zoom-in': () => zoom(1.2),
        'zoom-out': () => zoom(1 / 1.2),
        reset: () => canvas.zoom(1),
        fit: () => canvas.zoom('fit-viewport'),
      };

      controls.querySelectorAll<HTMLButtonElement>(
        '[data-navigation-action]',
      ).forEach(button => {
        const action = button.dataset.navigationAction;
        const handler = action ? handlers[action] : undefined;

        if (handler) {
          button.addEventListener('click', handler);
        }
      });
    }
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

      bpmnModelerInstance.on(
        'linting.completed',
        ({ issues }: { issues: BpmnLintIssues }) => {
          setHasLintError(checkForLinterIssues(issues));
        },
      );
    }
  }, [bpmnModelerInstance, diagramContainerRef, diagramPropertiesRef, content]);

  return {
    diagramContainerRef,
    diagramPropertiesRef,
    hasLintError,
  };
};
