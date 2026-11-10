import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
import { generatePngFromSvg } from '../../shared/utils/generatePngFromSvg';

type ProposalWorkspaceContext = {
  id: string;
  sourceResourceId: string;
  cloneResourceId: string;
  cloneContentId?: string | null;
  submittedContentId?: string | null;
};

export const Component = () => {
  // share modeler instance in order to avoid create instance in useContentModeler and useModeler
  const { getModelerInstance } = useModelerInstance();
  const bpmnModelerInstance = getModelerInstance();

  const { getRechercheProvider } = useBpmnToolOptions();
  const { resourceId: routeResourceId } = useParams() as ContentModelerRouteParams;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('proposalId');
  const reviewRemarksMode = searchParams.get('reviewRemarks') === '1';
  const approvedProposalMode = searchParams.get('publishApproved') === '1';
  const [proposalWorkspace, setProposalWorkspace] = useState<ProposalWorkspaceContext | null>(null);
  const [proposalWorkspaceResolved, setProposalWorkspaceResolved] = useState(!proposalId);
  const [proposalWorkspaceError, setProposalWorkspaceError] = useState<string | null>(null);
  useEffect(() => {
    if (!proposalId) {
      setProposalWorkspace(null);
      setProposalWorkspaceResolved(true);
      setProposalWorkspaceError(null);
      return undefined;
    }
    let active = true;
    setProposalWorkspace(null);
    setProposalWorkspaceResolved(false);
    setProposalWorkspaceError(null);
    const loadProposalContext = async () => {
      try {
        const [authored, reviewable] = await Promise.all([
          apiClient.get('/projects/me/process-change-proposals').catch(() => []),
          apiClient.get('/projects/me/process-change-proposals/to-review').catch(() => []),
        ]);
        if (!active) return;
        const candidates = [
          ...(Array.isArray(authored) ? authored : []),
          ...(Array.isArray(reviewable) ? reviewable : []),
        ] as ProposalWorkspaceContext[];
        const match = candidates.find(item => item.id === proposalId) ?? null;
        setProposalWorkspace(match);
        if (!match) {
          setProposalWorkspaceError('La demande est introuvable ou vous ne disposez pas des droits pour y accéder.');
        }
      } catch (error) {
        if (!active) return;
        setProposalWorkspaceError(
          error instanceof Error ? error.message : 'Impossible de charger les informations de la demande.',
        );
      } finally {
        if (active) setProposalWorkspaceResolved(true);
      }
    };
    void loadProposalContext();
    return () => { active = false; };
  }, [proposalId]);
  const proposalContext = proposalWorkspace?.id === proposalId ? proposalWorkspace : null;
  const resolvedResourceId = proposalContext?.cloneResourceId ?? routeResourceId;
  const sourceResourceId = proposalContext?.sourceResourceId || searchParams.get('sourceResourceId') || null;
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [submissionComment, setSubmissionComment] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [publishingApprovedProposal, setPublishingApprovedProposal] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationSummaryComment, setPublicationSummaryComment] = useState('');
  const pendingSaveExitRef = useRef(false);
  const pendingPublishExitRef = useRef(false);
  const handledActionDataRef = useRef<typeof actionData>(undefined);
  const proposalResourceReady = !proposalId || Boolean(proposalContext?.cloneResourceId);
  const { resource } = useResource(resolvedResourceId, proposalResourceReady);
  const returnToUrl = proposalId && (sourceResourceId || resource?.sourceResourceId)
    ? `/${sourceResourceId || resource?.sourceResourceId}`
    : `/${resolvedResourceId}`;
  const [raciView, setRaciView] = useState<'matrix' | 'actors' | null>(null);

  useCallActivityNavigation(bpmnModelerInstance);

  // Older proposal links may contain the source process ID in the route
  // instead of the private clone ID. Resolve the proposal and canonicalize the URL.
  useEffect(() => {
    if (!proposalId || !proposalContext?.cloneResourceId) return;
    const params = new URLSearchParams(location.search);
    let needsRedirect = routeResourceId !== proposalContext.cloneResourceId;
    if (params.get('sourceResourceId') !== proposalContext.sourceResourceId) {
      params.set('sourceResourceId', proposalWorkspace.sourceResourceId);
      needsRedirect = true;
    }
    if (!params.get('contentId')) {
      const contentId = reviewRemarksMode || approvedProposalMode
        ? proposalContext.submittedContentId
        : proposalContext.cloneContentId;
      if (contentId) {
        params.set('contentId', contentId);
        needsRedirect = true;
      }
    }
    if (needsRedirect) {
      navigate(`/${proposalContext.cloneResourceId}/modeler?${params.toString()}`, { replace: true });
    }
  }, [
    proposalId,
    proposalContext,
    routeResourceId,
    location.search,
    reviewRemarksMode,
    approvedProposalMode,
    navigate,
  ]);

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
    draftXmlContentErrorMessage,
    isShortcurtModalOpen,
    setIsShortcurtModalOpen,
    onFileUpload,
    onFileExport,
    onDiagramSave,
    onDiagramPublish,
    onCompareWithSource,
    actionData,
  } = useContentModeler(bpmnModelerInstance, resolvedResourceId, proposalResourceReady);

  const { diagramContainerRef, diagramPropertiesRef, hasLintError, isDirty, canUndo, canRedo, undo, redo, markSaved, isModelerReady } = useModeler(bpmnModelerInstance, draftXmlContent);
  // Protect every exit from the modeler, not only the Home button target.
  // The nested publication preview remains part of the current editing flow.
  const blocker = useBlocker(({ nextLocation }) =>
    isDirty &&
    nextLocation.pathname !== location.pathname &&
    !nextLocation.pathname.startsWith(`${location.pathname}/`),
  );
  let homeSaveActionLabel = 'Enregistrer et publier';
  if (proposalId && !approvedProposalMode) homeSaveActionLabel = 'Enregistrer et demander validation';
  if (reviewRemarksMode || approvedProposalMode) homeSaveActionLabel = 'Enregistrer et quitter';

  const publishApprovedProposal = async () => {
    if (!proposalId || !approvedProposalMode || publishingApprovedProposal) return;
    if (isDirty) {
      setPublicationError('La version approuvée ne peut pas être modifiée avant publication. Rechargez le modeleur pour retrouver le contenu approuvé.');
      return;
    }
    setPublishingApprovedProposal(true);
    setPublicationError(null);
    try {
      const { svg } = await bpmnModelerInstance.saveSVG();
      const pngContent = await generatePngFromSvg(svg);
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/publish`,
        { pngContent, summaryComment: publicationSummaryComment.trim() },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-process-change-proposals'] }),
        queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] }),
      ]);
      navigate(sourceResourceId ? `/${sourceResourceId}` : '/mes-demandes');
    } catch (error) {
      setPublicationError(
        error instanceof Error ? error.message : 'Impossible de publier la version approuvée.',
      );
    } finally {
      setPublishingApprovedProposal(false);
    }
  };

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
        returnToUrl={returnToUrl}
        modelerReady={isModelerReady}
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
        hidePublish={reviewRemarksMode || approvedProposalMode}
        approvedProposalMode={approvedProposalMode}
        onPublishApprovedProposal={publishApprovedProposal}
        publishApprovedDisabled={!isModelerReady || isDirty || publishingApprovedProposal || !proposalId || !publicationSummaryComment.trim()}
        publishApprovedLoading={publishingApprovedProposal}
        readOnly={approvedProposalMode}
      />
      {proposalId && proposalWorkspaceResolved && proposalWorkspaceError && (
        <Alert color="danger" sx={{ mx: 2, my: 1 }}>
          {proposalWorkspaceError}
        </Alert>
      )}
      {draftXmlContentErrorMessage && (
        <Alert color="danger" sx={{ mx: 2, my: 1 }}>
          Impossible de charger le diagramme BPMN de cette demande : {draftXmlContentErrorMessage}
        </Alert>
      )}
      {publicationError && <Alert color="danger" sx={{ mx: 2, my: 1 }}>{publicationError}</Alert>}
      {approvedProposalMode && (
        <Alert color="neutral" variant="soft" sx={{ mx: 2, my: 1 }}>
          La contribution est approuvée et figée. Le diagramme est en lecture seule jusqu’à sa publication.
        </Alert>
      )}
      {approvedProposalMode && (
        <Alert color="neutral" variant="soft" sx={{ mx: 2, my: 1 }}>
          <div style={{ width: '100%' }}>
            <DialogTitle>Commentaire général de publication</DialogTitle>
            <Textarea
              minRows={2}
              value={publicationSummaryComment}
              onChange={event => setPublicationSummaryComment(event.target.value)}
              placeholder="Synthèse des modifications apportées…"
            />
          </div>
        </Alert>
      )}
      <div style={{ position: 'relative' }}>
        <Modeler
          diagramContainerRef={diagramContainerRef}
          diagramPropertiesRef={diagramPropertiesRef}
          readOnly={approvedProposalMode}
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
                  if (typeof draftXmlContent !== 'string' || !draftXmlContent.trim()) {
                    setSubmissionError('Le diagramme BPMN n’est pas encore chargé. Rechargez le modeleur avant de soumettre la demande.');
                    return;
                  }
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
            <Button variant="solid" color="success" onClick={() => {
              if (reviewRemarksMode || approvedProposalMode) {
                pendingSaveExitRef.current = true;
                onDiagramSave();
              } else {
                pendingPublishExitRef.current = true;
                onDiagramPublish();
              }
            }}>
              {homeSaveActionLabel}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
};

Component.displayName = 'ContentModelerContainer';
