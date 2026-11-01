import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useBlocker, useNavigate, useParams } from 'react-router-dom';

import { ModelerActionBar } from './components/ModelerActionBar';
import { Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Textarea } from '@mui/joy';
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
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [submissionComment, setSubmissionComment] = useState('');

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
    onDiagramSubmitChangeRequest,
    isChangeRequest,
    onCompareWithSource,
    actionData,
  } = useContentModeler(bpmnModelerInstance);

  const openSubmissionDialog = (exitAfterSubmit = false) => {
    pendingSaveExitRef.current = exitAfterSubmit;
    setSubmissionDialogOpen(true);
  };

  const closeSubmissionDialog = () => {
    pendingSaveExitRef.current = false;
    setSubmissionDialogOpen(false);
  };

  const confirmSubmission = () => {
    if (!submissionComment.trim() || !onDiagramSubmitChangeRequest) return;
    onDiagramSubmitChangeRequest(submissionComment.trim());
    setSubmissionDialogOpen(false);
    setSubmissionComment('');
  };

  const { diagramContainerRef, diagramPropertiesRef, hasLintError, isDirty, canUndo, canRedo, undo, redo, markSaved } = useModeler(bpmnModelerInstance, draftXmlContent);
  const blocker = useBlocker(({ nextLocation }) => isDirty && nextLocation.pathname === `/${resourceId}`);

  useEffect(() => {
    if (!actionData || handledActionDataRef.current === actionData) return;
    handledActionDataRef.current = actionData;
    if (actionData.error) {
      pendingSaveExitRef.current = false;
      pendingPublishExitRef.current = false;
      return;
    }
    if (
      actionData.formAction === 'saveContent' ||
      actionData.formAction === 'saveContentBeforePublish' ||
      actionData.formAction === 'submitChangeRequest'
    ) {
      markSaved();

      if (
        actionData.formAction === 'saveContent' ||
        actionData.formAction === 'submitChangeRequest'
      ) {
        if (pendingSaveExitRef.current && blocker.state === 'blocked') {
          pendingSaveExitRef.current = false;
          blocker.proceed?.();
        }
        return;
      }

      // Publish only after the draft save has succeeded. This also handles the
      // direct Publish button; failures must leave the user in the modeler.
      pendingPublishExitRef.current = false;
      if (blocker.state === 'blocked') blocker.reset?.();
      navigate(`/${resourceId}/modeler/publish`);
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
        onDiagramSubmitChangeRequest={() => openSubmissionDialog(false)}
        isChangeRequest={isChangeRequest}
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
      <Modal open={blocker.state === 'blocked' && !submissionDialogOpen} onClose={() => { pendingSaveExitRef.current = false; pendingPublishExitRef.current = false; blocker.reset?.(); }}>
        <ModalDialog>
          <DialogTitle>Modifications non enregistrées</DialogTitle>
          <DialogContent>Le diagramme a été modifié depuis le dernier enregistrement. Que souhaitez-vous faire avant de quitter le modeleur ?</DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={() => { pendingSaveExitRef.current = false; pendingPublishExitRef.current = false; blocker.reset?.(); }}>Continuer l’édition</Button>
            <Button variant="outlined" color="danger" onClick={() => { markSaved(); blocker.proceed?.(); }}>Abandonner les modifications</Button>
            <Button variant="outlined" color="neutral" onClick={() => { pendingSaveExitRef.current = true; onDiagramSave(); }}>Enregistrer sans publier</Button>
            {isChangeRequest && onDiagramSubmitChangeRequest ? (
              <Button
                variant="solid"
                color="primary"
                onClick={() => openSubmissionDialog(true)}
              >
                Enregistrer et soumettre à validation
              </Button>
            ) : (
              <Button
                variant="solid"
                color="success"
                onClick={() => {
                  pendingPublishExitRef.current = true;
                  onDiagramPublish();
                }}
              >
                Enregistrer et publier
              </Button>
            )}
          </DialogActions>
        </ModalDialog>
      </Modal>
      <Modal open={submissionDialogOpen} onClose={closeSubmissionDialog}>
        <ModalDialog>
          <DialogTitle>Soumettre la contribution à validation</DialogTitle>
          <DialogContent>
            Ajoutez un commentaire qui explique les changements apportés et les points à vérifier.
          </DialogContent>
          <Textarea
            minRows={4}
            autoFocus
            value={submissionComment}
            onChange={event => setSubmissionComment(event.target.value)}
            placeholder="Commentaire obligatoire de soumission"
            aria-label="Commentaire de soumission"
          />
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={closeSubmissionDialog}>
              Annuler
            </Button>
            <Button
              variant="solid"
              disabled={!submissionComment.trim()}
              onClick={confirmSubmission}
            >
              Soumettre à validation
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
};

Component.displayName = 'ContentModelerContainer';
