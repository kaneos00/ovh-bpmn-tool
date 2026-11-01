import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import {
  Button,
  Card,
  Chip,
  Input,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';

import { useSnackbar } from '../../../shared/hooks/useSnackbar';
import {
  approveProcessChangeRequest,
  assignProcessChangeRequestReviewer,
  createProcessChangeRequestProposal,
  processChangeRequestsQuery,
  rejectProcessChangeRequest,
  requestProcessChangeRequestChanges,
  resumeProcessChangeRequestEditing,
  startProcessChangeRequestEditing,
  submitProcessChangeRequest,
  withdrawProcessChangeRequest,
  type ProcessChangeRequest,
} from '../../../api/changeRequests/changeRequests.queries';

type Props = {
  resourceId: string;
  currentUserId: string;
  canPropose: boolean;
  canReview: boolean;
};

const getWorkingCopyActionLabel = (status: ProcessChangeRequest['status']) => {
  if (status === 'proposed') return 'Créer la version de travail';
  if (status === 'changes_requested') return 'Reprendre la modification';
  return 'Ouvrir la version de travail';
};

const labels: Record<ProcessChangeRequest['status'], string> = {
  proposed: 'Proposition',
  draft: 'Brouillon',
  in_review: 'En attente de validation',
  changes_requested: 'Corrections demandées',
  approved: 'Approuvée — publication à effectuer',
  rejected: 'Refusée',
  published: 'Publiée',
  withdrawn: 'Retirée',
};

export const ProcessChangeRequestsPanel = ({
  resourceId,
  currentUserId,
  canPropose,
  canReview,
}: Props) => {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { showAlert } = useSnackbar();
  const { data: requests = [], isLoading } = useQuery(
    processChangeRequestsQuery(resourceId),
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [reviewers, setReviewers] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submissionComments, setSubmissionComments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    await client.invalidateQueries(
      processChangeRequestsQuery(resourceId).queryKey,
    );
  };

  const createProposal = async () => {
    if (!title.trim() || !description.trim()) return;
    try {
      await createProcessChangeRequestProposal(resourceId, {
        title: title.trim(),
        description: description.trim(),
        justification: justification.trim(),
      });
      setTitle('');
      setDescription('');
      setJustification('');
      await refresh();
      showAlert({
        message: 'Proposition de modification enregistrée.',
        severity: 'success',
      });
    } catch {
      showAlert({
        message: 'Impossible de créer la proposition.',
        severity: 'danger',
      });
    }
  };

  const openWorkingCopy = async (request: ProcessChangeRequest) => {
    setBusyId(request.id);
    try {
      let contentId = request.workingContentId;
      if (request.status === 'proposed' && !contentId) {
        const result = (await startProcessChangeRequestEditing(
          resourceId,
          request.id,
          request.description,
        )) as { workingContentId: string };
        contentId = result.workingContentId;
      } else if (request.status === 'changes_requested') {
        await resumeProcessChangeRequestEditing(resourceId, request.id);
      }
      if (!contentId) throw new Error('Version de travail introuvable.');
      await refresh();
      navigate(
        `/${resourceId}/modeler?contentId=${encodeURIComponent(contentId)}&changeRequestId=${encodeURIComponent(request.id)}`,
      );
    } catch (error) {
      showAlert({
        message:
          error instanceof Error
            ? error.message
            : 'Impossible d’ouvrir la version de travail.',
        severity: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const submitRequest = async (request: ProcessChangeRequest) => {
    setBusyId(request.id);
    try {
      await submitProcessChangeRequest(
        resourceId,
        request.id,
        (submissionComments[request.id] ?? '').trim(),
      );
      setSubmissionComments(current => ({ ...current, [request.id]: '' }));
      await refresh();
      showAlert({ message: 'Demande soumise au valideur.', severity: 'success' });
    } catch (error) {
      showAlert({
        message: error instanceof Error ? error.message : 'Impossible de soumettre la demande.',
        severity: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const withdrawRequest = async (request: ProcessChangeRequest) => {
    setBusyId(request.id);
    try {
      await withdrawProcessChangeRequest(resourceId, request.id);
      await refresh();
      showAlert({ message: 'Demande retirée.', severity: 'success' });
    } catch (error) {
      showAlert({
        message: error instanceof Error ? error.message : 'Impossible de retirer la demande.',
        severity: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const assignReviewer = async (request: ProcessChangeRequest) => {
    const reviewerId = (reviewers[request.id] ?? '').trim();
    if (!reviewerId) return;
    setBusyId(request.id);
    try {
      await assignProcessChangeRequestReviewer(
        resourceId,
        request.id,
        reviewerId,
      );
      await refresh();
      showAlert({ message: 'Valideur désigné.', severity: 'success' });
    } catch {
      showAlert({
        message: 'Impossible de désigner le valideur.',
        severity: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (
    request: ProcessChangeRequest,
    decision: 'approve' | 'changes' | 'reject',
  ) => {
    const comment = (comments[request.id] ?? '').trim();
    if (decision !== 'approve' && !comment) {
      showAlert({
        message: 'Un commentaire est obligatoire pour cette décision.',
        severity: 'warning',
      });
      return;
    }
    setBusyId(request.id);
    try {
      if (decision === 'approve') {
        await approveProcessChangeRequest(resourceId, request.id, comment);
      } else if (decision === 'changes') {
        await requestProcessChangeRequestChanges(
          resourceId,
          request.id,
          comment,
        );
      } else {
        await rejectProcessChangeRequest(resourceId, request.id, comment);
      }
      await refresh();
      setComments(current => ({ ...current, [request.id]: '' }));
      let decisionMessage = 'Contribution refusée.';
      if (decision === 'approve') {
        decisionMessage =
          'Contribution approuvée. La publication reste distincte.';
      } else if (decision === 'changes') {
        decisionMessage = 'Corrections demandées à l’auteur.';
      }
      showAlert({
        message: decisionMessage,
        severity: 'success',
      });
    } catch (error) {
      showAlert({
        message:
          error instanceof Error
            ? error.message
            : 'Impossible d’enregistrer la décision.',
        severity: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography level="title-lg">Demandes de modification BPMN</Typography>
        <Typography level="body-sm" color="neutral">
          Les demandes sont suivies indépendamment de la version publiée.
        </Typography>
      </Stack>

      {canPropose && (
        <Card variant="outlined">
          <Typography level="title-md">Proposer une modification</Typography>
          <Input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Titre de la proposition"
            aria-label="Titre de la proposition"
          />
          <Textarea
            minRows={3}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Décrivez la modification souhaitée et les éléments concernés"
            aria-label="Description de la proposition"
          />
          <Textarea
            minRows={2}
            value={justification}
            onChange={event => setJustification(event.target.value)}
            placeholder="Justification facultative"
            aria-label="Justification"
          />
          <Stack direction="row" justifyContent="flex-end">
            <Button
              onClick={() => void createProposal()}
              disabled={!title.trim() || !description.trim()}
            >
              Envoyer la proposition
            </Button>
          </Stack>
        </Card>
      )}

      {isLoading && (
        <Typography level="body-sm" color="neutral">
          Chargement des demandes…
        </Typography>
      )}
      {!isLoading && requests.length === 0 && (
        <Card variant="outlined">
          <Typography level="body-sm" color="neutral">
            Aucune demande de modification pour ce processus.
          </Typography>
        </Card>
      )}
      {!isLoading && requests.length > 0 && (
        <Stack spacing={1.5}>
          {requests.map(request => {
            const isAuthor = request.authorId === currentUserId;
            const canDecide =
              canReview &&
              request.status === 'in_review' &&
              Boolean(request.assignedReviewerId) &&
              request.assignedReviewerId === currentUserId;
            const busy = busyId === request.id;
            return (
              <Card key={request.id} variant="outlined" sx={{ gap: 1 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography level="title-md">{request.title}</Typography>
                  <Chip size="sm" variant="soft">
                    {labels[request.status]}
                  </Chip>
                </Stack>
                <Typography level="body-xs" color="neutral">
                  Auteur : {request.authorId}
                  {request.sourceVersion
                    ? ` · Version source v${request.sourceVersion}`
                    : ''}
                </Typography>
                <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>
                  {request.description}
                </Typography>
                {request.justification && (
                  <Typography level="body-sm" color="neutral">
                    Justification : {request.justification}
                  </Typography>
                )}
                {isAuthor &&
                  request.status === 'draft' &&
                  !request.assignedReviewerId && (
                    <Typography level="body-xs" color="warning">
                      Un valideur doit être désigné avant de pouvoir soumettre
                      cette contribution.
                    </Typography>
                  )}
                {request.assignedReviewerId && (
                  <Typography level="body-xs" color="neutral">
                    Valideur : {request.assignedReviewerId}
                  </Typography>
                )}

                {isAuthor && request.status === 'draft' && (
                  <Stack spacing={0.75}>
                    <Textarea
                      size="sm"
                      minRows={2}
                      value={submissionComments[request.id] ?? ''}
                      onChange={event =>
                        setSubmissionComments(current => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Commentaire accompagnant la soumission"
                      aria-label="Commentaire de soumission"
                    />
                    <Button
                      size="sm"
                      variant="solid"
                      loading={busy}
                      disabled={
                        busy ||
                        !request.assignedReviewerId ||
                        !(submissionComments[request.id] ?? '').trim()
                      }
                      onClick={() => void submitRequest(request)}
                    >
                      Soumettre à validation
                    </Button>
                  </Stack>
                )}

                {request.workingContentId && request.sourceContentId && (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    onClick={() =>
                      navigate(
                        `/${resourceId}/compare/${encodeURIComponent(request.sourceContentId as string)}/${encodeURIComponent(request.workingContentId as string)}`,
                      )
                    }
                  >
                    Comparer avec la version de référence
                  </Button>
                )}

                {isAuthor &&
                  ['proposed', 'draft', 'changes_requested'].includes(
                    request.status,
                  ) && (
                    <Button
                      size="sm"
                      variant="outlined"
                      loading={busy}
                      disabled={busy}
                      onClick={() => void openWorkingCopy(request)}
                    >
                      {getWorkingCopyActionLabel(request.status)}
                    </Button>
                  )}

                {isAuthor &&
                  ['proposed', 'draft', 'in_review', 'changes_requested'].includes(
                    request.status,
                  ) && (
                    <Button
                      size="sm"
                      variant="plain"
                      color="neutral"
                      loading={busy}
                      disabled={busy}
                      onClick={() => void withdrawRequest(request)}
                    >
                      Retirer la demande
                    </Button>
                  )}

                {canReview &&
                  !['approved', 'rejected', 'published', 'withdrawn'].includes(
                    request.status,
                  ) && (
                    <Stack spacing={0.75}>
                      <Typography level="title-sm">
                        Désigner un valideur
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Input
                          size="sm"
                          value={
                            reviewers[request.id] ??
                            request.assignedReviewerId ??
                            ''
                          }
                          onChange={event =>
                            setReviewers(current => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          placeholder="Identifiant utilisateur"
                          aria-label="Identifiant utilisateur del valideur"
                        />
                        <Button
                          size="sm"
                          variant="outlined"
                          loading={busy}
                          disabled={busy}
                          onClick={() => void assignReviewer(request)}
                        >
                          Affecter
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                {canReview && request.status === 'approved' && (
                  <Button
                    size="sm"
                    color="success"
                    variant="outlined"
                    onClick={() =>
                      navigate(
                        `/${resourceId}/modeler/publish?changeRequestId=${encodeURIComponent(request.id)}`,
                      )
                    }
                  >
                    Préparer la publication
                  </Button>
                )}

                {canDecide && (
                  <Stack spacing={0.75}>
                    <Typography level="title-sm">Décision de revue</Typography>
                    <Textarea
                      size="sm"
                      minRows={2}
                      value={comments[request.id] ?? ''}
                      onChange={event =>
                        setComments(current => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Commentaire de revue ou motif"
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        size="sm"
                        color="warning"
                        variant="outlined"
                        disabled={busy}
                        loading={busy}
                        onClick={() => void decide(request, 'changes')}
                      >
                        Demander des corrections
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="outlined"
                        disabled={busy}
                        loading={busy}
                        onClick={() => void decide(request, 'reject')}
                      >
                        Refuser
                      </Button>
                      <Button
                        size="sm"
                        color="success"
                        disabled={busy}
                        loading={busy}
                        onClick={() => void decide(request, 'approve')}
                      >
                        Approuver
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};
