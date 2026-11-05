import React, { useEffect, useRef, useState } from 'react';
import {
  Outlet,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useQuery } from 'react-query';

const getRemarkStatusColor = (
  status: string,
): 'success' | 'danger' | 'warning' => {
  if (status === 'accepted') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
};

const getRemarkStatusLabel = (status: string): string => {
  if (status === 'accepted') return 'Acceptée';
  if (status === 'rejected') return 'Refusée';
  return 'En attente';
};

import { ModelerActionBar } from './components/ModelerActionBar';
import {
  Alert,
  Button,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Textarea,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';
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
import queryClient, { apiClient } from '../../queryClient';
import { generatePngFromSvg } from '../../shared/utils/generatePngFromSvg';

export const Component = () => {
  // share modeler instance in order to avoid create instance in useContentModeler and useModeler
  const { getModelerInstance } = useModelerInstance();
  const bpmnModelerInstance = getModelerInstance();
  const { getRechercheProvider } = useBpmnToolOptions();
  const { resourceId: routeResourceId } =
    useParams() as ContentModelerRouteParams;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get('proposalId');
  const reviewRemarksMode = searchParams.get('reviewRemarks') === '1';
  const proposalMode = Boolean(proposalId);
  const approvedProposalMode = searchParams.get('publishApproved') === '1';
  const sourceResourceId = searchParams.get('sourceResourceId');
  const pendingSaveExitRef = useRef(false);
  const pendingPublishExitRef = useRef(false);
  const handledActionDataRef = useRef<typeof actionData>(undefined);
  const { resource } = useResource(routeResourceId);
  const [raciView, setRaciView] = useState<'matrix' | 'actors' | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [submissionComment, setSubmissionComment] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [publishingApprovedProposal, setPublishingApprovedProposal] =
    useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publicationSummaryComment, setPublicationSummaryComment] =
    useState('');
  const [remarkDecisionComments, setRemarkDecisionComments] = useState<
    Record<string, string>
  >({});
  const [decidingRemarkId, setDecidingRemarkId] = useState<string | null>(null);
  const [remarkDecisionError, setRemarkDecisionError] = useState<string | null>(
    null,
  );
  const [selectedModelerElementId, setSelectedModelerElementId] = useState<
    string | null
  >(null);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [submittingNewRemark, setSubmittingNewRemark] = useState(false);

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
  }, [
    bpmnModelerInstance,
    getRechercheProvider,
    resource?.id,
    resource?.name,
    resource?.type,
  ]);

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

  type ProposalRemark = {
    id: string;
    elementId: string;
    authorUserId: string;
    authorName?: string;
    decisionByName?: string | null;
    comment: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    decisionBy: string | null;
    decidedAt: string | null;
    decisionComment: string | null;
  };
  const { data: proposalRemarks = [], refetch: refetchProposalRemarks } =
    useQuery<ProposalRemark[]>(
      ['process-change-proposal-comments', proposalId],
      () =>
        apiClient.get(
          `/projects/process-change-proposals/${proposalId}/comments`,
        ),
      { enabled: Boolean(proposalId) },
    );

  const selectRemarkElement = (elementId: string) => {
    const element = (bpmnModelerInstance.get('elementRegistry') as any).get(
      elementId,
    );
    if (!element) {
      setRemarkDecisionError(
        `L’élément BPMN « ${elementId} » n’existe plus dans le diagramme courant.`,
      );
      return;
    }
    (bpmnModelerInstance.get('selection') as any).select([element]);
  };

  const decideRemark = async (
    remark: ProposalRemark,
    decision: 'accepted' | 'rejected',
  ) => {
    if (!proposalId || decidingRemarkId) return;
    setDecidingRemarkId(remark.id);
    setRemarkDecisionError(null);
    try {
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/comments/${remark.id}/decision`,
        {
          decision,
          comment: remarkDecisionComments[remark.id]?.trim() || undefined,
        },
      );
      setRemarkDecisionComments(previous => ({ ...previous, [remark.id]: '' }));
      await Promise.all([
        refetchProposalRemarks(),
        queryClient.invalidateQueries({
          queryKey: ['process-change-proposals-to-review'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['process-change-proposal-comments', proposalId],
        }),
      ]);
    } catch (error) {
      setRemarkDecisionError(
        error instanceof Error
          ? error.message
          : 'La décision sur la remarque a échoué.',
      );
    } finally {
      setDecidingRemarkId(null);
    }
  };

  const {
    diagramContainerRef,
    diagramPropertiesRef,
    hasLintError,
    isDirty,
    canUndo,
    canRedo,
    undo,
    redo,
    markSaved,
    isModelerReady,
  } = useModeler(bpmnModelerInstance, draftXmlContent);
  useEffect(() => {
    if (!isModelerReady) return undefined;
    const eventBus = bpmnModelerInstance.get('eventBus') as any;
    const selection = bpmnModelerInstance.get('selection') as any;
    const syncSelectedElement = () => {
      const selected = selection?.get?.() ?? [];
      setSelectedModelerElementId(selected[0]?.id ?? null);
    };
    eventBus.on('selection.changed', syncSelectedElement);
    syncSelectedElement();
    return () => eventBus.off('selection.changed', syncSelectedElement);
  }, [bpmnModelerInstance, isModelerReady]);

  const addRemarkFromModeler = async () => {
    if (
      !proposalId ||
      !selectedModelerElementId ||
      !newRemarkText.trim() ||
      submittingNewRemark
    )
      return;
    setSubmittingNewRemark(true);
    setRemarkDecisionError(null);
    try {
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/comments`,
        { elementId: selectedModelerElementId, comment: newRemarkText.trim() },
      );
      setNewRemarkText('');
      if (approvedProposalMode) {
        navigate(
          `/${resourceId}/modeler?proposalId=${proposalId}&reviewRemarks=1`,
        );
      }
      await Promise.all([
        refetchProposalRemarks(),
        queryClient.invalidateQueries({
          queryKey: ['process-change-proposal-comments', proposalId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['process-change-proposals-to-review'],
        }),
      ]);
    } catch (error) {
      setRemarkDecisionError(
        error instanceof Error
          ? error.message
          : 'Impossible d’ajouter la remarque.',
      );
    } finally {
      setSubmittingNewRemark(false);
    }
  };

  const blocker = useBlocker(
    ({ nextLocation }) => isDirty && nextLocation.pathname === `/${resourceId}`,
  );
  const publishApprovedProposal = async () => {
    if (!proposalId || !approvedProposalMode || publishingApprovedProposal)
      return;
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
        queryClient.invalidateQueries({
          queryKey: ['my-process-change-proposals'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['process-change-proposals-to-review'],
        }),
      ]);
      navigate(sourceResourceId ? `/${sourceResourceId}` : '/mes-demandes');
    } catch (error) {
      setPublicationError(
        error instanceof Error
          ? error.message
          : 'Impossible de publier la version approuvée.',
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
      setSubmissionError(null);
      setValidationModalOpen(true);
      return;
    }
    if (
      actionData.formAction === 'saveContent' ||
      actionData.formAction === 'saveContentBeforePublish'
    ) {
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
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
    };
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
        proposalMode={proposalMode}
        reviewOnly={reviewRemarksMode && !approvedProposalMode}
        approvedProposalMode={approvedProposalMode}
        onPublishApprovedProposal={publishApprovedProposal}
        publishApprovedDisabled={
          !isModelerReady ||
          publishingApprovedProposal ||
          !proposalId ||
          !publicationSummaryComment.trim()
        }
        publishApprovedLoading={publishingApprovedProposal}
      />
      {publicationError && (
        <Alert color="danger" sx={{ mx: 2, my: 1 }}>
          {publicationError}
        </Alert>
      )}
      {approvedProposalMode && (
        <Sheet
          variant="outlined"
          sx={{ mx: 2, my: 1.5, p: 2, borderRadius: 'md' }}
        >
          <Stack spacing={1}>
            <Typography level="title-sm">
              Commentaire général de validation
            </Typography>
            <Typography level="body-xs" textColor="neutral">
              La trace détaillée des remarques, de leurs auteurs, dates et
              décisions sera ajoutée automatiquement à l’historique de
              publication.
            </Typography>
            <Textarea
              minRows={2}
              value={publicationSummaryComment}
              onChange={event =>
                setPublicationSummaryComment(event.target.value)
              }
              placeholder="Saisissez le commentaire général qui accompagnera la publication…"
            />
          </Stack>
        </Sheet>
      )}
      {proposalId && (reviewRemarksMode || proposalRemarks.length > 0) && (
        <Sheet
          variant="outlined"
          sx={{ mx: 2, my: 1.5, p: 2, borderRadius: 'md' }}
        >
          <Stack spacing={1.5}>
            {reviewRemarksMode && (
              <Alert color="primary" variant="soft">
                Mode revue : le diagramme soumis est consulté sans modification
                directe. Si une correction BPMN est nécessaire, utilisez la
                décision de demande de corrections pour laisser l’auteur
                reprendre le brouillon dans le circuit existant.
              </Alert>
            )}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography level="title-md">
                Remarques à traiter (
                {
                  proposalRemarks.filter(remark => remark.status === 'pending')
                    .length
                }{' '}
                en attente)
              </Typography>
              <Typography level="body-xs" textColor="neutral">
                Les décisions sont historisées séparément du BPMN.
              </Typography>
            </Stack>
            {remarkDecisionError && (
              <Alert color="danger">{remarkDecisionError}</Alert>
            )}
            <Stack spacing={1}>
              <Typography level="title-sm">
                Ajouter une remarque sur le diagramme
              </Typography>
              <Typography level="body-xs" textColor="neutral">
                Sélectionnez un élément dans le modeleur, puis ajoutez une
                remarque au dossier de validation.
              </Typography>
              <Typography level="body-xs">
                Élément sélectionné : {selectedModelerElementId || 'aucun'}
              </Typography>
              <Textarea
                size="sm"
                minRows={2}
                value={newRemarkText}
                onChange={event => setNewRemarkText(event.target.value)}
                placeholder="Nouvelle remarque…"
              />
              <Button
                size="sm"
                variant="outlined"
                color="primary"
                loading={submittingNewRemark}
                disabled={
                  !selectedModelerElementId ||
                  !newRemarkText.trim() ||
                  submittingNewRemark
                }
                onClick={addRemarkFromModeler}
              >
                Ajouter au dossier
              </Button>
            </Stack>
            {proposalRemarks.length === 0 ? (
              <Typography level="body-sm" textColor="neutral">
                Aucune remarque associée à cette demande.
              </Typography>
            ) : (
              proposalRemarks.map(remark => (
                <Sheet
                  key={remark.id}
                  variant="soft"
                  sx={{ p: 1.25, borderRadius: 'sm' }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <Typography level="title-sm">
                        {remark.elementId}
                      </Typography>
                      <Typography
                        level="body-xs"
                        color={getRemarkStatusColor(remark.status)}
                      >
                        {getRemarkStatusLabel(remark.status)}
                      </Typography>
                    </Stack>
                    <Typography level="body-sm">{remark.comment}</Typography>
                    <Typography level="body-xs" textColor="neutral">
                      Déposée le{' '}
                      {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(remark.createdAt))}{' '}
                      · {remark.authorName || remark.authorUserId}
                    </Typography>
                    {remark.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outlined"
                          color="neutral"
                          onClick={() => selectRemarkElement(remark.elementId)}
                        >
                          Localiser dans le diagramme
                        </Button>
                        {reviewRemarksMode ? (
                          <>
                            <Textarea
                              size="sm"
                              minRows={1}
                              value={remarkDecisionComments[remark.id] ?? ''}
                              onChange={event =>
                                setRemarkDecisionComments(previous => ({
                                  ...previous,
                                  [remark.id]: event.target.value,
                                }))
                              }
                              placeholder="Commentaire de décision (facultatif)…"
                            />
                            <Stack
                              direction="row"
                              spacing={1}
                              useFlexGap
                              flexWrap="wrap"
                            >
                              <Button
                                size="sm"
                                color="success"
                                loading={decidingRemarkId === remark.id}
                                disabled={decidingRemarkId !== null}
                                onClick={() => decideRemark(remark, 'accepted')}
                              >
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                variant="outlined"
                                loading={decidingRemarkId === remark.id}
                                disabled={decidingRemarkId !== null}
                                onClick={() => decideRemark(remark, 'rejected')}
                              >
                                Refuser
                              </Button>
                            </Stack>
                          </>
                        ) : (
                          <Typography level="body-xs" textColor="neutral">
                            En attente de traitement par le validateur.
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography level="body-xs" textColor="neutral">
                        Décidée le{' '}
                        {remark.decidedAt
                          ? new Intl.DateTimeFormat('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(remark.decidedAt))
                          : '—'}
                        {(remark.decisionByName || remark.decisionBy) &&
                          ` · par ${
                            remark.decisionByName || remark.decisionBy
                          }`}
                        {remark.decisionComment
                          ? ` · ${remark.decisionComment}`
                          : ''}
                      </Typography>
                    )}
                  </Stack>
                </Sheet>
              ))
            )}
          </Stack>
        </Sheet>
      )}
      <Modeler
        diagramContainerRef={diagramContainerRef}
        diagramPropertiesRef={diagramPropertiesRef}
        reviewOnly={reviewRemarksMode && !approvedProposalMode}
      />
      <Modal
        open={validationModalOpen}
        onClose={() => {
          if (!submittingProposal) setValidationModalOpen(false);
        }}
      >
        <ModalDialog>
          <DialogTitle>Demander la validation de la modification</DialogTitle>
          <DialogContent>
            Le brouillon est enregistré. Ajoutez un commentaire pour transmettre
            cette version au validateur du projet.
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
              disabled={
                !submissionComment.trim() || submittingProposal || !proposalId
              }
              onClick={async () => {
                if (!proposalId) return;
                setSubmittingProposal(true);
                setSubmissionError(null);
                try {
                  const metadataDocument = new DOMParser().parseFromString(
                    draftXmlContent,
                    'application/xml',
                  );
                  const processMetadata = Array.from(
                    metadataDocument.getElementsByTagNameNS(
                      'https://ovh-bpmn-tool.local/schema/process-metadata',
                      'processMetadata',
                    ),
                  )[0];
                  const pilotIdentifier =
                    processMetadata?.getAttribute('pilot')?.trim() || undefined;
                  await apiClient.post(
                    `/projects/process-change-proposals/${proposalId}/submit`,
                    {
                      comment: submissionComment.trim(),
                      validatorUserId: pilotIdentifier,
                    },
                  );
                  await queryClient.invalidateQueries({
                    queryKey: ['my-process-change-proposals'],
                  });
                  setValidationModalOpen(false);
                  navigate('/mes-demandes');
                } catch (error) {
                  setSubmissionError(
                    error instanceof Error
                      ? error.message
                      : 'Impossible de soumettre la demande.',
                  );
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
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => {
          pendingSaveExitRef.current = false;
          pendingPublishExitRef.current = false;
          blocker.reset?.();
        }}
      >
        <ModalDialog>
          <DialogTitle>Modifications non enregistrées</DialogTitle>
          <DialogContent>
            Le diagramme a été modifié depuis le dernier enregistrement. Que
            souhaitez-vous faire avant de quitter le modeleur ?
          </DialogContent>
          <DialogActions>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => {
                pendingSaveExitRef.current = false;
                pendingPublishExitRef.current = false;
                blocker.reset?.();
              }}
            >
              Continuer l’édition
            </Button>
            <Button
              variant="outlined"
              color="danger"
              onClick={() => {
                markSaved();
                blocker.proceed?.();
              }}
            >
              Abandonner les modifications
            </Button>
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => {
                pendingSaveExitRef.current = true;
                onDiagramSave();
              }}
            >
              Enregistrer sans publier
            </Button>
            <Button
              variant="solid"
              color="success"
              onClick={() => {
                pendingPublishExitRef.current = true;
                onDiagramPublish();
              }}
            >
              {proposalMode
                ? 'Enregistrer et demander en validation'
                : 'Enregistrer et publier'}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </>
  );
};

Component.displayName = 'ContentModelerContainer';
