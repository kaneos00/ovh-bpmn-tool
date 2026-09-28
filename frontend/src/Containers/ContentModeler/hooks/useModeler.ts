import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSnackbar } from '../../../shared/hooks/useSnackbar';
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
    // Ne pas créer un diagramme vide pendant que le XML demandé par Recherche
    // est encore en cours de chargement.
    if (contentLoading) return;

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
          .then(() => {
            attachModeler();

            /*
            ANCIEN COMPORTEMENT — conservé pour comparaison / retour arrière
            L'import du XML était terminé ici sans exploiter le paramètre
            ?element=... transmis par Recherche.
            */

            /*
            ANCIEN COMPORTEMENT — conservé pour comparaison / retour arrière
            L'import du XML était terminé ici sans exploiter le paramètre
            ?element=... transmis par Recherche.
            */

            // Recherche demande l'ouverture directe d'un élément BPMN.
            // La sélection est différée d'une frame afin de laisser bpmn-js
            // terminer le rendu graphique après importXML().
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

                // Marqueur visuel temporaire : permet également de confirmer
                // que la résolution de l'élément a bien fonctionné.
                canvas.addMarker(element, 'recherche-target');
                window.setTimeout(() => {
                  canvas.removeMarker(element, 'recherche-target');
                }, 2500);
              };

              window.requestAnimationFrame(locateTargetElement);
            }
          })
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
