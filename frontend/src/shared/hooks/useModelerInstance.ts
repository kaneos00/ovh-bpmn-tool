import { useCallback, useEffect, useMemo } from 'react';
import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';
import RechercheModule from '../../extensions/recherche/recherche-module';

import { useBpmnToolOptions } from '../../Providers/BpmnToolOptions/useBpmnToolOptions';

export const useModelerInstance = () => {
  const { getModelerExtensions, getModelerModules, getModelerLinting } =
    useBpmnToolOptions();

  const lintingOptions = useMemo(
    () => getModelerLinting(),
    [getModelerLinting],
  );

  const modeler = useMemo(() => {
    return new BpmnModeler({
      keyboard: { bindTo: document },
      additionalModules: [
        ...getModelerModules().filter(module => module !== RechercheModule),
        MinimapModule,
        NavigationControls,
      ],
      ...(lintingOptions.active ? { linting: lintingOptions } : {}),
      moddleExtensions: getModelerExtensions(),
      minimap: {
        open: true,
      },
    });
  }, [getModelerExtensions, getModelerModules, lintingOptions]);

  useEffect(() => {
    return () => {
      modeler.destroy();
    };
  }, [modeler]);

  const getModelerInstance = useCallback(() => modeler, [modeler]);

  return { getModelerInstance };
};
