import { useMemo } from 'react';
import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';
import BpmnViewer from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';

import { useBpmnToolOptions } from '../../Providers/BpmnToolOptions/useBpmnToolOptions';

export const useModelerInstance = () => {
  const { getModelerExtensions, getModelerModules, getModelerLinting } =
    useBpmnToolOptions();

  const lintingOptions = getModelerLinting();

  const modeler = useMemo(() => {
    return new BpmnModeler({
      keyboard: { bindTo: document },
      /*
        ANCIENNE CONFIGURATION — conservée pour comparaison / retour arrière
        additionalModules: getModelerModules(),
      */
      additionalModules: [
        ...getModelerModules(),
        MinimapModule,
        NavigationControls,
      ],
      ...(lintingOptions.active ? { linting: lintingOptions } : {}),
      moddleExtensions: getModelerExtensions(),
    });
  }, []);

  const getModelerInstance = () => {
    return modeler;
  };

  const getViewerInstance = (additionalOptions = {}) => {
    return new BpmnViewer({
      additionalModules: [...getModelerModules(true)],
      moddleExtensions: getModelerExtensions(),
      ...additionalOptions,
    });
  };

  return {
    getModelerInstance,
    getViewerInstance,
  };
};
