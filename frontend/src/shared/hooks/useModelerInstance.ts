import { useMemo } from 'react';
import BpmnModeler from 'camunda-bpmn-js/lib/camunda-platform/Modeler';
import BpmnViewer from 'camunda-bpmn-js/lib/camunda-platform/NavigatedViewer';
import MinimapModule from 'diagram-js-minimap';
import NavigationControls from '../../extensions/navigation-controls';
import VerticalInteractionHitFix from '../../extensions/vertical-interaction-hit-fix';

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
      // Ouvre automatiquement la minimap dans l’éditeur.
      minimap: {
        open: true,
      },
    });
  }, []);

  const getModelerInstance = () => {
    return modeler;
  };

  const getViewerInstance = (additionalOptions = {}) => {
    return new BpmnViewer({
      /*
        ANCIENNE CONFIGURATION — conservée pour comparaison / retour arrière
        additionalModules: [...getModelerModules(true)],
      */
      additionalModules: [
        ...getModelerModules(true),
        MinimapModule,
        NavigationControls,
        /*
          TEST — VerticalInteractionHitFix désactivé temporairement.
          Si la sélection fonctionne au premier chargement du Viewer,
          ce module est probablement à l'origine du problème.
          VerticalInteractionHitFix,
        */
      ],
      moddleExtensions: getModelerExtensions(),
      // Ouvre automatiquement la minimap dans le visualiseur.
      minimap: {
        open: true,
      },
      ...additionalOptions,
    });
  };

  return {
    getModelerInstance,
    getViewerInstance,
  };
};