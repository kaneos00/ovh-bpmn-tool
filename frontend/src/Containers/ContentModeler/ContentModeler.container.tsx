import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useBlocker, useNavigate, useParams } from 'react-router-dom';

import { ModelerActionBar } from './components/ModelerActionBar';
import { Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions } from '@mui/joy';
import { ModelerShortcuts } from '../../Components/BusinessComponents/ModelerShortcuts/ModelerShortcuts';
import { useContentModeler } from './hooks/useContentModeler';
import { useModeler } from './hooks/useModeler';
import { Modeler } from '../../Components/BusinessComponents/Modeler/Modeler';
import { RaciMatrix } from './components/RaciMatrix';
import { useBpmnToolOptions } from '../../Providers/BpmnToolOptions/useBpmnToolOptions';
import { useModelerInstance } from '../../shared/hooks/useModelerInstance';
import { useResource } from '../../shared/hooks/useResource';
import type { ContentModelerRouteParams } from '.';
import { useCallActivityNavigation } from '../../shared/hooks/useCallActivityNavigation';
import { ImpersonationBanner } from '../../Components/GenericComponents/ImpersonationBanner/ImpersonationBanner';

export const Component = () => {
  // share modeler instance in order to avoid create instance in useContentModeler and useModeler
  const { getModelerInstance } = useModelerInstance();
  const bpmnModelerInstance = getModelerInstance();
  const { getRechercheProvider } = useBpmnToolOptions();
  const { resourceId: routeResourceId } = useParams() as ContentModelerRouteParams;
  const navigate = useNavigate();
  const pendingSaveExitRef = useRef(false);
  const pendingPublishExitRef = useRef(false);
  const handledActionDataRef = useRef<typeof actionData>(undefined);
  const { resource } = useResource(routeResourceId);
  const [raciView, setRaciView] = useState<'matrix' | 'actors' | null>(null);

  useCallActivityNavigation(bpmnModelerInstance);

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

  const { diagramContainerRef, diagramPropertiesRef, hasLintError, isDirty, canUndo, canRedo, undo, redo, markSaved } = useModeler(bpmnModelerInstance, draftXmlContent);
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!actionData || handledActionDataRef.current === actionData) return;
    handledActionDataRef.current = actionData;
    if (actionData.error) {
      pendingSaveExitRef.current = false;
      pendingPublishExitRef.current = false;
      return;
    }
    if (actionData.formAction === 'saveContent' || actionData.formAction === 'saveContentBeforePublish') {
      markSaved();
      if (pendingSaveExitRef.current && blocker.state === 'blocked') {
        pendingSaveExitRef.current = false;
        blocker.proceed?.();
      } else if (pendingPublishExitRef.current) {
        pendingPublishExitRef.current = false;
        if (blocker.state === 'blocked') blocker.reset?.();
        navigate(`/${resourceId}/publish`);
      }
    }
  }, [actionData, markSaved, blocker, navigate, resourceId]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => { window.removeEventListener('beforeunload', warnBeforeUnload); };
  }, [isDirty]);

  return (
    <>
      {actionData && actionData.formAction === 'saveContentBeforePublish' && (
        <Navigate to="./publish" />
      )}
      <ImpersonationBanner />
      <ModelerActionBar
        resourceId={resourceId}
        hasLintError={hasLintError}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
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
      <Modal open={blocker.state === 'blocked'} onClose={() => { pendingSaveExitRef.current = false; pendingPublishExitRef.current = false; blocker.reset?.(); }}>
        <ModalDialog>
          <DialogTitle>Modifications non enregistrées</DialogTitle>
          <DialogContent>Le diagramme a été modifié depuis le dernier enregistrement. Que souhaitez-vous faire avant de quitter le modeleur ?</DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={() => { pendingSaveExitRef.current = false; pendingPublishExitRef.current = false; blocker.reset(); }}>Continuer l’édition</Button>
            <Button variant="outlined" color="danger" onClick={() => { markSaved(); blocker.proceed?.(); }}>Abandonner les modifications</Button>
            <Button variant="outlined" color="neutral" onClick={() => { pendingSaveExitRef.current = true; onDiagramSave(); }}>Enregistrer sans publier</Button>
            <Button variant="solid" color="success" onClick={() => { pendingPublishExitRef.current = true; onDiagramPublish(); }}>Enregistrer et publier</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
};

Component.displayName = 'ContentModelerContainer';
