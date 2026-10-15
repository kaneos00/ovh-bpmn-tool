import { useCallback, useEffect, useMemo } from 'react';
import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';
import BpmnViewer from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';
import VerticalInteractionHitFix from '../../extensions/vertical-interaction-hit-fix';

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
        ...getModelerModules(),
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
        ...getModelerModules(true),
        MinimapModule,
        NavigationControls,
        VerticalInteractionHitFix,
      ],
      moddleExtensions: getModelerExtensions(),
      minimap: {
        open: true,
      },
      ...additionalOptions,
    });
  }, [getModelerExtensions, getModelerModules]);

  return {
    getModelerInstance,
    getViewerInstance,
  };
};
