import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';

import { ModelerActionBar } from './components/ModelerActionBar';
import { ModelerShortcuts } from '../../Components/BusinessComponents/ModelerShortcuts/ModelerShortcuts';
import { useContentModeler } from './hooks/useContentModeler';
import { useModeler } from './hooks/useModeler';
import { Modeler } from '../../Components/BusinessComponents/Modeler/Modeler';
import { RaciMatrix } from './components/RaciMatrix';
import { useBpmnToolOptions } from '../../Providers/BpmnToolOptions/useBpmnToolOptions';
import { useModelerInstance } from '../../shared/hooks/useModelerInstance';
import { useResource } from '../../shared/hooks/useResource';
import type { ContentModelerRouteParams } from '.';
import { apiClient } from '../../queryClient';
import { useSnackbar } from '../../shared/hooks/useSnackbar';

export const Component = () => {
  // share modeler instance in order to avoid create instance in useContentModeler and useModeler
  const { getModelerInstance } = useModelerInstance();
  const bpmnModelerInstance = getModelerInstance();
  const { getRechercheProvider } = useBpmnToolOptions();
  const navigate = useNavigate();
  const { showAlert } = useSnackbar();
  const { resourceId: routeResourceId } = useParams() as ContentModelerRouteParams;
  const { resource } = useResource(routeResourceId);
  const [raciView, setRaciView] = useState<'matrix' | 'actors' | null>(null);

  useEffect(() => {
    const eventBus = bpmnModelerInstance.get('eventBus') as {
      on: (eventName: string, priority: number, callback: (event: any) => void) => void;
      off: (eventName: string, callback: (event: any) => void) => void;
    };

    const onCallActivityDoubleClick = (event: any) => {
      const businessObject = event.element?.businessObject;
      if (businessObject?.$type !== 'bpmn:CallActivity') {
        return;
      }

      // A calledElement that contains a BPMN Tool resource ID is the navigation contract.
      event.stopPropagation();
      const targetResourceId = String(businessObject.calledElement ?? '').trim();
      if (!targetResourceId) {
        showAlert({
          message: 'Cette activité d’appel n’est pas liée à un processus BPMN Tool. Renseignez son identifiant de ressource dans « Called element ».',
          severity: 'warning',
        });
        return;
      }

      void apiClient.get(`/resources/${encodeURIComponent(targetResourceId)}`)
        .then(() => navigate(`/${targetResourceId}/modeler`))
        .catch(() => showAlert({
          message: 'Accès au processus impossible : vous ne disposez pas des droits nécessaires ou le processus n’est plus disponible.',
          severity: 'danger',
        }));
    };

    eventBus.on('element.dblclick', 1500, onCallActivityDoubleClick);
    return () => eventBus.off('element.dblclick', onCallActivityDoubleClick);
  }, [bpmnModelerInstance, navigate, showAlert]);

  useEffect(() => {
    const provider = getRechercheProvider();
    const service = bpmnModelerInstance.get('rechercheService', false) as any;
    service?.setProvider(provider);
    service?.setContext({
      resourceId: resource?.id,
      resourceName: resource?.name,
      resourceType: resource?.type,
    });
  }, [bpmnModelerInstance, getRechercheProvider, resource?.id, resource?.name, resource?.type]);

  const {
    resourceId,
    draftXmlContent,
    isShortcurtModalOpen,
    setIsShortcurtModalOpen,
    onFileUpload,
    onFileExport,
    onDiagramSave,
    onDiagramPublish,
    onCompareWithSource,
    actionData,
  } = useContentModeler(bpmnModelerInstance);

  const { diagramContainerRef, diagramPropertiesRef, hasLintError } =
    useModeler(bpmnModelerInstance, draftXmlContent);

  return (
    <>
      {actionData && actionData.formAction === 'saveContentBeforePublish' && (
        <Navigate to="./publish" />
      )}
      <ModelerActionBar
        resourceId={resourceId}
        hasLintError={hasLintError}
        onFileUpload={onFileUpload}
        onFileExport={onFileExport}
        onDiagramSave={onDiagramSave}
        onDiagramPublish={onDiagramPublish}
        onShortcutDisplay={() => setIsShortcurtModalOpen(true)}
        onRaciOpen={() => setRaciView('matrix')}
        onRolesOpen={() => setRaciView('actors')}
        onCompareWithSource={onCompareWithSource}
      />
      <Modeler
        diagramContainerRef={diagramContainerRef}
        diagramPropertiesRef={diagramPropertiesRef}
      />
      <RaciMatrix
        modeler={bpmnModelerInstance}
        open={raciView !== null}
        view={raciView ?? 'matrix'}
        onClose={() => setRaciView(null)}
      />
      <ModelerShortcuts
        open={isShortcurtModalOpen}
        onCancelClick={() => setIsShortcurtModalOpen(false)}
      />
      <Outlet />
    </>
  );
};

Component.displayName = 'ContentModelerContainer';
