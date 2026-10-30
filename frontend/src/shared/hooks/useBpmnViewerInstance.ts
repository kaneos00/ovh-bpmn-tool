import { useCallback } from 'react';
import BpmnViewer from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';
import VerticalInteractionHitFix from '../../extensions/vertical-interaction-hit-fix';
import RechercheModule from '../../extensions/recherche/recherche-module';

import { useBpmnToolOptions } from '../../Providers/BpmnToolOptions/useBpmnToolOptions';

export const useBpmnViewerInstance = () => {
  const { getModelerExtensions, getModelerModules } = useBpmnToolOptions();

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

  return { getViewerInstance };
};
