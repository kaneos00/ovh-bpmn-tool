import { useCallback, useEffect, useMemo } from 'react';
import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';
import RechercheModule from '../../extensions/recherche/recherche-module';

import { useBpmnToolOptions } from '../../Providers/BpmnToolOptions/useBpmnToolOptions';

export const useModelerInstance = () => {
  const { getModelerExtensions, getModelerModules, getModelerLinting, getModelerProviders } =
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
  }, [getModelerExtensions, getModelerModules, getModelerProviders, lintingOptions]);

  useEffect(() => {
    return () => {
      // Clear diagram-js selection while the modeler services are still alive.
      // Calling selection after destroy can access an already disposed canvas plane.
      try {
        const selection = modeler.get('selection') as {
          select?: (elements: unknown[]) => void;
        } | undefined;
        selection?.select?.([]);
      } catch {
        // Teardown must continue even if the selection service is unavailable.
      }
      modeler.destroy();
    };
  }, [modeler]);

  const getModelerInstance = useCallback(() => modeler, [modeler]);

  return { getModelerInstance };
};
