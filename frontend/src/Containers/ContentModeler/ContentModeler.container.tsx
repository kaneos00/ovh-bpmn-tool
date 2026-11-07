import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ModelerActionBar } from './components/ModelerActionBar';
import { Alert, Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Textarea } from '@mui/joy';
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
import { ProposalRemarksPanel } from './components/ProposalRemarksPanel';
import queryClient, { apiClient } from '../../queryClient';

export const Component = () => {
  // share modeler instance in order to avoid create instance in useContentModeler and useModeler
  const { getModelerInstance } = useModelerInstance();
  const bpmnModelerInstance = getModelerInstance();
  const { getRechercheProvider } = useBpmnToolOptions();
  const { resourceId: routeResourceId } = useParams() as ContentModelerRouteParams;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('proposalId');
  const reviewRemarksMode = searchParams.get('reviewRemarks') === '1';
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [submissionComment, setSubmissionComment] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
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

  const { diagramContainerRef, diagramPropertiesRef, hasLintError, isDirty, canUndo, canRedo, undo, redo, markSaved, isModelerReady } = useModeler(bpmnModelerInstance, draftXmlContent);
  const blocker = useBlocker(({ nextLocation }) => isDirty && nextLocation.pathname === `/${resourceId}`);

  useEffect(() => {
    if (!actionData || handledActionDataRef.current === actionData) return;
    handledActionDataRef.current = actionData;
    if (actionData.error) {
      pendingSaveExitRef.current = false;
      pendingPublishExitRef.current = false;
      return;
    }
    if (actionData.formAction === 'saveContentBeforeSubmit') {
      markSaved();
      pendingSaveExitRef.current = false;
      pendingPublishExitRef.current = false;
      setSubmissionError(null);
      setValidationModalOpen(true);
      return;
    }
    if (actionData.formAction === 'saveContent' || actionData.formAction === 'saveContentBeforePublish') {
      markSaved();

      if (actionData.formAction === 'saveContent') {
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
        onShortcutDisplay={() => setIsShortcurtModalOpen(true)}
        onRaciOpen={() => setRaciView('matrix')}
        onRolesOpen={() => setRaciView('actors')}
        onCompareWithSource={onCompareWithSource}
        proposalMode={Boolean(proposalId)}
      />
      <div style={{ position: 'relative' }}>
        <Modeler
          diagramContainerRef={diagramContainerRef}
          diagramPropertiesRef={diagramPropertiesRef}
        />
        {proposalId && (
          <ProposalRemarksPanel
            modeler={bpmnModelerInstance}
            proposalId={proposalId}
            isModelerReady={isModelerReady}
            canDecide={reviewRemarksMode}
          />
        )}
      </div>
      <Modal
        open={validationModalOpen}
        onClose={() => {
          if (!submittingProposal) setValidationModalOpen(false);
        }}
      >
        <ModalDialog>
          <DialogTitle>Demander la validation de la modification</DialogTitle>
          <DialogContent>
            Le brouillon est enregistré. Ajoutez un commentaire pour transmettre cette version au validateur du projet.
          </DialogContent>
          <Textarea
            minRows={3}
            value={submissionComment}
            onChange={event => setSubmissionComment(event.target.value)}
            placeholder="Décrivez les modifications proposées et leur justification…"
          />
          {submissionError && <Alert color="danger">{submissionError}</Alert>}
          <DialogActions>
            <Button
              variant="plain"
              color="neutral"
              disabled={submittingProposal}
              onClick={() => setValidationModalOpen(false)}
            >
              Continuer l’édition
            </Button>
            <Button
              variant="solid"
              color="primary"
              loading={submittingProposal}
              disabled={!proposalId || !submissionComment.trim() || submittingProposal}
              onClick={async () => {
                if (!proposalId || !submissionComment.trim() || submittingProposal) return;
                setSubmittingProposal(true);
                setSubmissionError(null);
                try {
                  const metadataDocument = new DOMParser().parseFromString(draftXmlContent, 'application/xml');
                  const processMetadata = Array.from(metadataDocument.getElementsByTagNameNS(
                    'https://ovh-bpmn-tool.local/schema/process-metadata',
                    'processMetadata',
                  ))[0];
                  const pilotIdentifier = processMetadata?.getAttribute('pilot')?.trim() || undefined;
                  await apiClient.post(
                    `/projects/process-change-proposals/${proposalId}/submit`,
                    { comment: submissionComment.trim(), validatorUserId: pilotIdentifier },
                  );
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['my-process-change-proposals'] }),
                    queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] }),
                  ]);
                  setValidationModalOpen(false);
                  navigate('/mes-demandes');
                } catch (error) {
                  setSubmissionError(error instanceof Error ? error.message : 'Impossible de soumettre la demande.');
                } finally {
                  setSubmittingProposal(false);
                }
              }}
            >
              Envoyer au validateur
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
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
            <Button variant="plain" color="neutral" onClick={() => { pendingSaveExitRef.current = false; pendingPublishExitRef.current = false; blocker.reset?.(); }}>Continuer l’édition</Button>
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
