import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Input, Sheet, Stack,
  Table, Textarea, Typography,
} from '@mui/joy';
import { Search, VisibilityOutlined, EditOutlined } from '@mui/icons-material';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { apiClient } from '../../queryClient';

type ProposalStatus = 'draft' | 'submitted' | 'approved' | 'changes_requested' | 'rejected' | 'published';
type ReviewProposal = {
  id: string; projectId: string; projectName: string; sourceResourceId: string;
  sourcePublishedContentId: string; processName: string; cloneResourceId: string;
  submittedContentId: string | null; authorName: string; submissionComment: string | null;
  submittedAt: string | null; latestActivityAt: string; status: 'submitted' | 'approved';
  totalRemarksCount?: number; pendingRemarksCount?: number;
};
type Proposal = {
  id: string;
  projectId: string;
  projectName: string;
  sourceResourceId: string;
  processName: string;
  cloneResourceId: string;
  cloneContentId: string | null;
  submittedContentId: string | null;
  validatorUserId: string | null;
  validatorName?: string | null;
  validatorWarning?: string | null;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  latestActivityAt: string;
  latestActivityType: string;
  latestActivityComment: string | null;
};

const proposalsQuery = () => ({
  queryKey: ['my-process-change-proposals'],
  queryFn: (): Promise<Proposal[]> => apiClient.get('/projects/me/process-change-proposals'),
});

const reviewProposalsQuery = () => ({
  queryKey: ['process-change-proposals-to-review'],
  queryFn: (): Promise<ReviewProposal[]> => apiClient.get('/projects/me/process-change-proposals/to-review'),
});

const statusPresentation: Record<ProposalStatus, { label: string; color: 'neutral' | 'warning' | 'success' | 'danger' | 'primary' }> = {
  draft: { label: 'Brouillon', color: 'neutral' },
  submitted: { label: 'En attente', color: 'warning' },
  approved: { label: 'Approuvée', color: 'success' },
  changes_requested: { label: 'Modifications demandées', color: 'primary' },
  rejected: { label: 'Refusée', color: 'danger' },
  published: { label: 'Publiée', color: 'success' },
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

export const Component = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | ProposalStatus>('all');
  const [search, setSearch] = useState('');
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { data = [], isLoading, isError, refetch } = useQuery(proposalsQuery());
  const { data: reviews = [], isLoading: reviewsLoading, isError: reviewsError, refetch: refetchReviews } = useQuery(reviewProposalsQuery());

  const decideProposal = async (proposal: ReviewProposal, decision: 'approved' | 'changes_requested' | 'rejected') => {
    const comment = reviewComments[proposal.id]?.trim() ?? '';
    if (decision !== 'approved' && !comment) return;
    setReviewingId(proposal.id);
    setReviewError(null);
    try {
      await apiClient.post(`/projects/process-change-proposals/${proposal.id}/decision`, { decision, comment });
      setReviewComments(previous => ({ ...previous, [proposal.id]: '' }));
      await Promise.all([refetchReviews(), refetch()]);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'La décision n’a pas pu être enregistrée.');
    } finally {
      setReviewingId(null);
    }
  };

  const filtered = useMemo(() => data.filter(proposal => {
    const statusMatch = filter === 'all' || proposal.status === filter ||
      (filter === 'approved' && proposal.status === 'published');
    const term = search.trim().toLocaleLowerCase('fr');
    const searchMatch = !term || [proposal.processName, proposal.projectName, proposal.id]
      .some(value => value.toLocaleLowerCase('fr').includes(term));
    return statusMatch && searchMatch;
  }), [data, filter, search]);

  const drafts = data.filter(item => item.status === 'draft' || item.status === 'changes_requested').length;
  const pending = data.filter(item => item.status === 'submitted').length;
  const decided = data.filter(item => ['approved', 'published', 'rejected'].includes(item.status)).length;

  const openProposal = (proposal: Proposal) => {
    if (proposal.status === 'draft' || proposal.status === 'changes_requested') {
      const contentQuery = proposal.cloneContentId
        ? `&contentId=${proposal.cloneContentId}`
        : '';
      navigate(`/${proposal.cloneResourceId}/modeler?proposalId=${proposal.id}${contentQuery}`);
      return;
    }
    navigate(`/${proposal.sourceResourceId}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.level1' }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 1, md: 2 } }}>
        <WorkspaceNavigation />
        <Box sx={{ px: { xs: 0.5, md: 1 }, pt: 2, pb: 3 }}>
          <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.75 }}>
            Mon espace / Mes demandes de modification
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={1.5} sx={{ mb: 2.5 }}>
            <Box>
              <Typography level="h2" sx={{ fontSize: { xs: '1.45rem', md: '1.75rem' }, mb: 0.75 }}>
                Mes demandes de modification
              </Typography>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                Retrouvez et suivez les propositions que vous avez créées dans les différents projets auxquels vous participez.
              </Typography>
            </Box>
            <Chip variant="outlined" color="neutral" size="sm">Demandes rattachées à leur processus d’origine</Chip>
          </Stack>

          <Sheet variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden', mb: 2.5 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography level="title-md">Demandes à traiter</Typography>
                  <Typography level="body-xs" sx={{ color: 'text.secondary', mt: 0.35 }}>
                    Demandes qui vous sont affectées et demandes des projets que vous administrez.
                  </Typography>
                </Box>
                <Chip size="sm" color="warning" variant="soft">{reviews.filter(proposal => proposal.status === 'submitted').length} en attente · {reviews.filter(proposal => proposal.status === 'approved').length} à publier</Chip>
              </Stack>
            </Box>
            {reviewsLoading && <Box sx={{ p: 2 }}><Typography level="body-sm">Chargement des demandes…</Typography></Box>}
            {reviewError && <Alert color="danger" sx={{ m: 2 }}>{reviewError}</Alert>}
            {reviewsError && <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
              <Typography level="body-sm" color="danger">Impossibile caricare le richieste da validare.</Typography>
              <Button size="sm" variant="outlined" onClick={() => refetchReviews()}>Réessayer</Button>
            </Stack>}
            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <Box sx={{ p: 2.5 }}><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucune demande en attente de validation.</Typography></Box>
            )}
            {!reviewsLoading && !reviewsError && reviews.length > 0 && (
              <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
                {reviews.map(proposal => (
                  <Box key={proposal.id} sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                          <Typography level="title-sm">{proposal.processName}</Typography>
                          <Chip size="sm" variant="soft" color={proposal.status === 'approved' ? 'success' : 'warning'}>
                            {proposal.status === 'approved' ? 'Approuvée — à publier' : 'En attente de validation'}
                          </Chip>
                        </Stack>
                        <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                          {proposal.projectName} · Proposée par {proposal.authorName} · {formatDate(proposal.submittedAt)}
                        </Typography>
                        {proposal.submissionComment && (
                          <Sheet variant="soft" sx={{ p: 1, mt: 1, borderRadius: 'sm' }}>
                            <Typography level="body-sm">{proposal.submissionComment}</Typography>
                          </Sheet>
                        )}
                      </Box>
                      {(proposal.totalRemarksCount ?? 0) > 0 && (
                        <Typography level="body-xs" color={(proposal.pendingRemarksCount ?? 0) > 0 ? 'warning' : 'success'}>
                          {proposal.pendingRemarksCount ?? 0} remarque(s) en attente sur {proposal.totalRemarksCount}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button size="sm" variant="outlined" color="neutral"
                          disabled={!proposal.submittedContentId}
                          onClick={() => navigate(`/compare-resources/${proposal.sourceResourceId}/${proposal.sourcePublishedContentId}/${proposal.cloneResourceId}/${proposal.submittedContentId}`)}>
                          Comparer les versions
                        </Button>
                        <Button size="sm" variant="solid" color="primary"
                          onClick={() => navigate(`/${proposal.cloneResourceId}/modeler?proposalId=${proposal.id}&reviewRemarks=1${proposal.submittedContentId ? `&contentId=${proposal.submittedContentId}` : ''}`)}>
                          Traiter dans le modeleur
                        </Button>
                      </Stack>
                    </Stack>
                    {proposal.status === 'submitted' ? (
                      <>
                        <Textarea
                          size="sm"
                          minRows={2}
                          value={reviewComments[proposal.id] ?? ''}
                          onChange={event => setReviewComments(previous => ({ ...previous, [proposal.id]: event.target.value }))}
                          placeholder="Commentaire du valideur (obligatoire pour demander des corrections ou refuser)…"
                          sx={{ mt: 1.25 }}
                        />
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                          <Button size="sm" color="success" variant="solid" loading={reviewingId === proposal.id}
                            disabled={reviewingId !== null}
                            onClick={() => decideProposal(proposal, 'approved')}>Approuver</Button>
                          <Button size="sm" color="primary" variant="outlined" loading={reviewingId === proposal.id}
                            disabled={reviewingId !== null || !(reviewComments[proposal.id] ?? '').trim()}
                            onClick={() => decideProposal(proposal, 'changes_requested')}>Demander des corrections</Button>
                          <Button size="sm" color="danger" variant="outlined" loading={reviewingId === proposal.id}
                            disabled={reviewingId !== null || !(reviewComments[proposal.id] ?? '').trim()}
                            onClick={() => decideProposal(proposal, 'rejected')}>Refuser</Button>
                        </Stack>
                      </>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                        <Button size="sm" color="success" variant="solid"
                          onClick={() => navigate(
                            `/${proposal.cloneResourceId}/modeler?proposalId=${proposal.id}&publishApproved=1&sourceResourceId=${proposal.sourceResourceId}${proposal.submittedContentId ? `&contentId=${proposal.submittedContentId}` : ''}`,
                          )}>
                          Publier la version approuvée
                        </Button>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Sheet>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' }, gap: 1.5, mb: 2.5 }}>
            {[
              { label: 'Toutes les demandes', value: data.length, hint: 'Sur l’ensemble de vos projets' },
              { label: 'En attente de validation', value: pending, hint: 'En attente de décision' },
              { label: 'Brouillons à reprendre', value: drafts, hint: 'Non encore soumis ou à corriger' },
              { label: 'Décisions reçues', value: decided, hint: 'Approuvées, publiées ou refusées' },
            ].map(item => (
              <Sheet key={item.label} variant="outlined" sx={{ p: 1.75, borderRadius: '10px', boxShadow: '0 1px 2px rgba(15,23,42,.03)' }}>
                <Typography level="body-xs" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
                <Typography level="h3" sx={{ mt: 0.25, fontSize: '1.6rem' }}>{isLoading ? '—' : item.value}</Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 0.25 }}>{item.hint}</Typography>
              </Sheet>
            ))}
          </Box>

          <Sheet variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,.03)' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography level="title-md">Historique de mes demandes</Typography>
              <Typography level="body-xs" sx={{ color: 'text.secondary', mt: 0.35 }}>
                Vue personnelle et transversale. Les droits d’accès au projet restent applicables.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={1} sx={{ p: 1.5, bgcolor: 'background.level1', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.5}>
                {[
                  ['all', 'Toutes'],
                  ['draft', 'Brouillons'],
                  ['submitted', 'En attente'],
                  ['approved', 'Approuvées'],
                  ['rejected', 'Refusées'],
                ].map(([value, label]) => (
                  <Button key={value} size="sm" variant={filter === value ? 'soft' : 'plain'} color={filter === value ? 'primary' : 'neutral'} onClick={() => setFilter(value as typeof filter)}>{label}</Button>
                ))}
              </Stack>
              <Input
                size="sm"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Rechercher un processus ou projet…"
                startDecorator={<Search />}
                sx={{ minWidth: { md: 260 } }}
              />
            </Stack>

            {isLoading && (
              <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                <CircularProgress size="md" />
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Chargement de vos demandes…</Typography>
              </Stack>
            )}
            {!isLoading && isError && (
              <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
                <Typography color="danger">Impossible de charger vos demandes.</Typography>
                <Button size="sm" variant="outlined" onClick={() => refetch()}>Réessayer</Button>
              </Stack>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                <Typography level="title-md">Aucune demande à afficher</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {data.length > 0
                    ? 'Modifiez les filtres ou la recherche.'
                    : 'Les propositions que vous créerez depuis un processus apparaîtront ici.'}
                </Typography>
              </Box>
            )}
            {!isLoading && !isError && filtered.length > 0 && (
              <Box sx={{ overflowX: 'auto' }}>
                <Table hoverRow size="md" borderAxis="none" sx={{ minWidth: 920, '& th': { bgcolor: 'background.level1', color: 'text.tertiary', fontSize: 'xs', fontWeight: 700 }, '& td': { py: 1.5, verticalAlign: 'middle' } }}>
                  <thead><tr><th>Processus</th><th>Projet</th><th>Créée le</th><th>Validateur</th><th>Dernière activité</th><th>Statut</th><th /></tr></thead>
                  <tbody>
                    {filtered.map(proposal => {
                      const status = statusPresentation[proposal.status] ?? statusPresentation.draft;
                      return (
                        <tr key={proposal.id}>
                          <td>
                            <Typography level="title-sm">{proposal.processName}</Typography>
                            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Demande · {proposal.id.slice(0, 8)}</Typography>
                          </td>
                          <td><Typography level="body-sm">{proposal.projectName}</Typography></td>
                          <td><Typography level="body-sm">{formatDate(proposal.createdAt)}</Typography></td>
                          <td>
                            <Typography level="body-sm">
                              {proposal.validatorName || 'À définir'}
                            </Typography>
                            {proposal.validatorWarning && (
                              <Typography level="body-xs" color="warning">
                                {proposal.validatorWarning}
                              </Typography>
                            )}
                          </td>
                          <td>
                            <Typography level="body-sm">{formatDate(proposal.latestActivityAt)}</Typography>
                            {proposal.latestActivityComment && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{proposal.latestActivityComment}</Typography>}
                          </td>
                          <td><Chip size="sm" variant="soft" color={status.color}>{status.label}</Chip></td>
                          <td>
                            <Button size="sm" variant="outlined" color="primary" startDecorator={['draft', 'changes_requested'].includes(proposal.status) ? <EditOutlined /> : <VisibilityOutlined />} onClick={() => openProposal(proposal)}>
                              {['draft', 'changes_requested'].includes(proposal.status) ? 'Reprendre' : 'Consulter'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Box>
            )}
            <Stack direction="row" justifyContent="space-between" sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.level1' }}>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{filtered.length} demande(s) affichée(s)</Typography>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Données issues du suivi central des propositions</Typography>
            </Stack>
          </Sheet>

          <Sheet variant="soft" color="primary" sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.5, mt: 1.75, borderRadius: '9px' }}>
            <Typography level="title-sm" sx={{ flex: '0 0 auto' }}>ⓘ</Typography>
            <Typography level="body-xs">
              <strong>Un suivi unique, plusieurs points d’accès.</strong> Cette page, le parcours de proposition depuis le viewer et la future boîte de réception des validateurs (#136) exploitent les mêmes demandes et le même historique. Cette page ne remplace pas l’administration et n’accorde aucun droit supplémentaire sur les processus.
            </Typography>
          </Sheet>
        </Box>
      </Box>
    </Box>
  );
};

Component.displayName = 'MyProcessChangeProposalsPage';
