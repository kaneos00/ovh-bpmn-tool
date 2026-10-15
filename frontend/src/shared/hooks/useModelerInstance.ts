import { useCallback, useEffect, useMemo } from 'react';
import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';
import BpmnViewer from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';
import VerticalInteractionHitFix from '../../extensions/vertical-interaction-hit-fix';
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

  const getViewerInstance = useCallback((additionalOptions = {}) => {
    return new BpmnViewer({
      additionalModules: [
        ...getModelerModules(true).filter(module => module !== RechercheModule),
        MinimapModule,
        NavigationControls,
        VerticalInteractionHitFix,
      ],
      moddleExtensions: getModelerExtensions(),
      minimap: {
        open: false,
      },
      ...additionalOptions,
    });
  }, [getModelerExtensions, getModelerModules]);

  return {
    getModelerInstance,
    getViewerInstance,
  };
};
