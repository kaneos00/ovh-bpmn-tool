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
  };

  useEffect(() => {
    let active = true;

    if (diagramContainerRef.current && diagramPropertiesRef.current) {
      const importPromise = content
        ? bpmnModelerInstance.importXML(content)
        : bpmnModelerInstance.createDiagram();

      importPromise
        .then(() => {
          if (active) {
            attachModeler();
          }
        })
        .catch(() => {
          if (active) {
            showAlert({
              message: content ? 'Failed to import file' : 'Failed to render file',
              severity: 'danger',
            });
          }
        });
    }

    return () => {
      active = false;
    };
  }, [bpmnModelerInstance, content]);

  useEffect(() => {
    const onLintingCompleted = ({ issues }: { issues: BpmnLintIssues }) => {
      setHasLintError(checkForLinterIssues(issues));
    };

    bpmnModelerInstance.on('linting.completed', onLintingCompleted);

    return () => {
      bpmnModelerInstance.off('linting.completed', onLintingCompleted);
    };
  }, [bpmnModelerInstance]);

  useEffect(() => {
    return () => {
      bpmnModelerInstance.destroy();
    };
  }, [bpmnModelerInstance]);

  return {
    diagramContainerRef,
    diagramPropertiesRef,
    hasLintError,
  };
};
