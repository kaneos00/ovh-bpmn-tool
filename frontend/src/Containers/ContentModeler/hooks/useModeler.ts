import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  BpmnLintIssues,
  PropertiesPanel,
  checkForLinterIssues,
} from '../../../Components/BusinessComponents/Modeler/helpers';
import Modeler from 'camunda-bpmn-js/lib/base/Modeler';
import { useBpmnToolOptions } from '../../../Providers/BpmnToolOptions/useBpmnToolOptions';

export const useModeler = (
  bpmnModelerInstance: Modeler,
  content?: string,
  contentLoading = false,
) => {
  const [searchParams] = useSearchParams();
  const targetElementId = searchParams.get('element');

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
        message: 'Diagram or Properties refs are undefined',
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
    canvas.zoom('fit-viewport');
  };

  useEffect(() => {
    // Ne pas créer un diagramme vide pendant que le XML demandé par Recherche
    // est encore en cours de chargement.
    if (contentLoading) return;

    if (diagramContainerRef.current && diagramPropertiesRef.current) {
      if (!content) {
        bpmnModelerInstance
          .createDiagram()
          .then(() => attachModeler())
          .catch((error: unknown) => {
            console.error('[Modeler] Failed to create diagram', error);
            showAlert({
              message: 'Failed to render file',
              severity: 'danger',
            });
          });
      } else {
        /*
        ANCIEN COMPORTEMENT — conservé pour comparaison / retour arrière
        Import direct du XML sans nettoyage explicite du diagramme précédent.
        bpmnModelerInstance.importXML(content)
        */

        // Un Modeler peut conserver un diagramme précédent (notamment après
        // navigation depuis le Viewer ou après un premier createDiagram).
        // On le détruit explicitement avant de charger le XML demandé.
        // Cela évite qu'un root implicite ou un ancien diagramme empêche
        // l'import du BPMN 2.0 importé.
        bpmnModelerInstance.clear();

        bpmnModelerInstance
          .importXML(content)
          .then(() => {
            attachModeler();

            if (targetElementId) {
              const locateTargetElement = () => {
                const elementRegistry = bpmnModelerInstance.get('elementRegistry') as any;
                const canvas = bpmnModelerInstance.get('canvas') as any;
                const selection = bpmnModelerInstance.get('selection') as any;
                const element = elementRegistry.get(targetElementId);

                console.info('[Recherche] target element', {
                  targetElementId,
                  found: Boolean(element),
                });

                if (!element) return;

                selection.select(element);
                canvas.scrollToElement(element);
                canvas.addMarker(element, 'recherche-target');
                window.setTimeout(() => {
                  canvas.removeMarker(element, 'recherche-target');
                }, 2500);
              };

              window.requestAnimationFrame(locateTargetElement);
            }
          })
          .catch((error: unknown) => {
            console.error('[Modeler] Failed to import BPMN 2.0 XML', error);
            showAlert({
              message: 'Failed to import file',
              severity: 'danger',
            });
          });
      }

      bpmnModelerInstance.on(
        'linting.completed',
        ({ issues }: { issues: BpmnLintIssues }) => {
          setHasLintError(checkForLinterIssues(issues));
        },
      );
    }
  }, [
    bpmnModelerInstance,
    diagramContainerRef,
    diagramPropertiesRef,
    content,
    contentLoading,
    targetElementId,
  ]);

  return {
    diagramContainerRef,
    diagramPropertiesRef,
    hasLintError,
  };
};