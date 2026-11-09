import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Sheet,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';
import { DragIndicator, ExpandLess, ExpandMore } from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import Modeler from 'camunda-bpmn-js/lib/base/Modeler';
import { apiClient } from '../../../queryClient';

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
  canRespond?: boolean;
  awaitingAuthorResponse?: boolean;
  thread?: Array<{ id: string; eventType: string; actorUserId: string | null; actorName?: string | null; comment: string | null; createdAt: string }>;
};

type ProposalRemarksPanelProps = {
  modeler: Modeler;
  proposalId: string;
  isModelerReady: boolean;
  canDecide: boolean;
};

const statusLabel: Record<ProposalRemark['status'], string> = {
  pending: 'À traiter',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const statusColor: Record<ProposalRemark['status'], 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

export const ProposalRemarksPanel = ({
  modeler,
  proposalId,
  isModelerReady,
  canDecide,
}: ProposalRemarksPanelProps) => {
  const queryClient = useQueryClient();
  const queryKey = ['process-change-proposal-comments', proposalId];
  const {
    data: remarks = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ProposalRemark[]>(
    queryKey,
    () => apiClient.get(`/projects/process-change-proposals/${proposalId}/comments`),
    { enabled: Boolean(proposalId) },
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [decisionComments, setDecisionComments] = useState<Record<string, string>>({});
  const [clarificationComments, setClarificationComments] = useState<Record<string, string>>({});
  const [responseComments, setResponseComments] = useState<Record<string, string>>({});
  const [busyRemarkId, setBusyRemarkId] = useState<string | null>(null);
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ top: 16, right: 16 });
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    top: number;
    right: number;
  } | null>(null);
  const overlayIdsRef = useRef<Array<string | number>>([]);

  const pendingCount = remarks.filter(remark => remark.status === 'pending').length;

  useEffect(() => {
    if (!dragStart) return undefined;
    const onMove = (event: MouseEvent) => {
      setPosition({
        top: Math.max(0, dragStart.top + event.clientY - dragStart.y),
        right: Math.max(0, dragStart.right - (event.clientX - dragStart.x)),
      });
    };
    const onUp = () => setDragStart(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragStart]);

  useEffect(() => {
    if (!isModelerReady) return undefined;
    const eventBus = modeler.get('eventBus') as any;
    const selection = modeler.get('selection') as any;
    const syncSelection = () => {
      const selected = selection?.get?.() ?? [];
      setSelectedElementId(selected[0]?.id ?? null);
    };
    eventBus.on('selection.changed', syncSelection);
    syncSelection();
    return () => eventBus.off('selection.changed', syncSelection);
  }, [modeler, isModelerReady]);

  useEffect(() => {
    if (!isModelerReady) return undefined;
    const overlays = modeler.get('overlays') as any;
    const registry = modeler.get('elementRegistry') as any;
    const eventBus = modeler.get('eventBus') as any;
    const selection = modeler.get('selection') as any;

    const applyOverlays = () => {
      overlayIdsRef.current.forEach(id => {
        try {
          overlays.remove(id);
        } catch {
          // The BPMN import may already have cleared the overlay.
        }
      });
      overlayIdsRef.current = [];

      const counts = new Map<string, { total: number; pending: number }>();
      remarks
        .filter(remark => registry.get(remark.elementId))
        .forEach(remark => {
          const current = counts.get(remark.elementId) ?? { total: 0, pending: 0 };
          current.total += 1;
          if (remark.status === 'pending') current.pending += 1;
          counts.set(remark.elementId, current);
        });

      counts.forEach(({ total, pending }, elementId) => {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.textContent = String(total);
        badge.title = pending > 0
          ? `${total} commentaire(s) sur cet élément, dont ${pending} à traiter`
          : `${total} commentaire(s) sur cet élément`;
        badge.setAttribute('aria-label', badge.title);
        Object.assign(badge.style, {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '20px',
          height: '20px',
          padding: '0 5px',
          border: '2px solid #fff',
          borderRadius: '12px',
          background: '#2459a6',
          color: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
          fontSize: '11px',
          fontWeight: '700',
          lineHeight: '16px',
          cursor: 'pointer',
        });
        badge.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const element = registry.get(elementId);
          if (element) selection.select([element]);
        });
        const overlayId = overlays.add(elementId, 'contextual-remarks', {
          position: { top: -9, right: -9 },
          html: badge,
        });
        if (overlayId !== undefined && overlayId !== null) {
          overlayIdsRef.current.push(overlayId);
        }
      });
    };

    eventBus.on('import.done', applyOverlays);
    applyOverlays();
    return () => {
      eventBus.off('import.done', applyOverlays);
      overlayIdsRef.current.forEach(id => {
        try {
          overlays.remove(id);
        } catch {
          // Ignore overlays already removed by the modeler.
        }
      });
      overlayIdsRef.current = [];
    };
  }, [modeler, isModelerReady, remarks]);

  const selectRemarkElement = (elementId: string) => {
    const registry = modeler.get('elementRegistry') as any;
    const element = registry.get(elementId);
    if (!element) {
      setError(`L’élément BPMN « ${elementId} » n’existe plus dans le diagramme courant.`);
      return;
    }
    (modeler.get('selection') as any).select([element]);
    setError(null);
  };

  const addRemark = async () => {
    if (!selectedElementId || !newRemarkText.trim() || submittingRemark) return;
    setSubmittingRemark(true);
    setError(null);
    try {
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/comments`,
        { elementId: selectedElementId, comment: newRemarkText.trim() },
      );
      setNewRemarkText('');
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] }),
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’ajouter la remarque.');
    } finally {
      setSubmittingRemark(false);
    }
  };

  const decideRemark = async (
    remark: ProposalRemark,
    decision: 'accepted' | 'rejected',
  ) => {
    if (busyRemarkId) return;
    setBusyRemarkId(remark.id);
    setError(null);
    try {
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/comments/${remark.id}/decision`,
        {
          decision,
          comment: decisionComments[remark.id]?.trim() || undefined,
        },
      );
      setDecisionComments(previous => ({ ...previous, [remark.id]: '' }));
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] }),
      ]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La décision sur la remarque a échoué.');
    } finally {
      setBusyRemarkId(null);
    }
  };

  const requestClarification = async (remark: ProposalRemark) => {
    const comment = clarificationComments[remark.id]?.trim();
    if (!comment || busyRemarkId) return;
    setBusyRemarkId(remark.id);
    setError(null);
    try {
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/comments/${remark.id}/clarification`,
        { comment },
      );
      setClarificationComments(previous => ({ ...previous, [remark.id]: '' }));
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de demander une précision.');
    } finally {
      setBusyRemarkId(null);
    }
  };

  const respondToClarification = async (remark: ProposalRemark) => {
    const comment = responseComments[remark.id]?.trim();
    if (!comment || busyRemarkId) return;
    setBusyRemarkId(remark.id);
    setError(null);
    try {
      await apiClient.post(
        `/projects/process-change-proposals/${proposalId}/comments/${remark.id}/response`,
        { comment },
      );
      setResponseComments(previous => ({ ...previous, [remark.id]: '' }));
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’envoyer la réponse.');
    } finally {
      setBusyRemarkId(null);
    }
  };

  return (
    <Sheet
      variant="outlined"
      sx={{
        position: 'absolute',
        top: position.top,
        right: position.right,
        zIndex: 1200,
        width: collapsed ? 245 : 380,
        maxWidth: 'calc(100% - 24px)',
        maxHeight: 'calc(90vh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'md',
        boxShadow: 'lg',
        bgcolor: 'background.surface',
      }}
    >
      <Box
        onMouseDown={event => {
          if ((event.target as HTMLElement).closest('button')) return;
          event.preventDefault();
          setDragStart({
            x: event.clientX,
            y: event.clientY,
            top: position.top,
            right: position.right,
          });
        }}
        sx={{
          px: 1.25,
          py: 1,
          borderBottom: collapsed ? 0 : '1px solid',
          borderColor: 'divider',
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <DragIndicator fontSize="small" color="action" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography level="title-sm">Remarques BPMN</Typography>
            <Typography level="body-xs" color="neutral">
              {pendingCount} en attente · {remarks.length} au total
            </Typography>
          </Box>
          <IconButton
            size="sm"
            variant="plain"
            color="neutral"
            aria-label={collapsed ? 'Déplier les remarques' : 'Replier les remarques'}
            onClick={() => setCollapsed(value => !value)}
          >
            {collapsed ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Stack>
      </Box>
      {!collapsed && (
        <Box sx={{ p: 1.25, overflowY: 'auto', minHeight: 0 }}>
          {error && <Alert color="danger" sx={{ mb: 1 }}>{error}</Alert>}
          {isError && (
            <Alert color="danger" sx={{ mb: 1 }}>
              Impossible de charger les remarques de cette demande.
              <Button size="sm" variant="plain" onClick={() => refetch()}>Réessayer</Button>
            </Alert>
          )}
          <Stack spacing={1.25}>
            <Sheet variant="soft" sx={{ p: 1.25, borderRadius: 'sm' }}>
              <Stack spacing={1}>
                <Typography level="title-sm">Ajouter une remarque</Typography>
                <Typography level="body-xs" color="neutral">
                  Élément sélectionné : {selectedElementId || 'sélectionnez un élément du diagramme'}
                </Typography>
                <Textarea
                  size="sm"
                  minRows={2}
                  value={newRemarkText}
                  onChange={event => setNewRemarkText(event.target.value)}
                  placeholder="Décrivez le point à corriger…"
                />
                <Button
                  size="sm"
                  onClick={addRemark}
                  loading={submittingRemark}
                  disabled={!selectedElementId || !newRemarkText.trim() || submittingRemark}
                >
                  Ajouter au dossier
                </Button>
              </Stack>
            </Sheet>
            {isLoading && <Typography level="body-sm">Chargement des remarques…</Typography>}
            {!isLoading && remarks.length === 0 && (
              <Typography level="body-sm" color="neutral">
                Aucune remarque associée à cette demande.
              </Typography>
            )}
            {remarks.map(remark => (
              <Sheet key={remark.id} variant="soft" sx={{ p: 1.25, borderRadius: 'sm' }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography level="title-sm">{remark.elementId}</Typography>
                    <Chip size="sm" variant="soft" color={statusColor[remark.status]}>
                      {statusLabel[remark.status]}
                    </Chip>
                  </Stack>
                  <Typography level="body-sm">{remark.comment}</Typography>
                  <Typography level="body-xs" color="neutral">
                    {formatDate(remark.createdAt)} · {remark.authorName || remark.authorUserId}
                  </Typography>
                  <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    onClick={() => selectRemarkElement(remark.elementId)}
                  >
                    Localiser dans le diagramme
                  </Button>
                  {(remark.thread ?? []).filter(item =>
                    item.eventType === 'remark_clarification_requested' ||
                    item.eventType === 'remark_author_responded'
                  ).map(item => (
                    <Sheet key={item.id} variant="outlined" sx={{ p: 1, borderRadius: 'sm' }}>
                      <Typography level="body-xs" color="neutral">
                        {item.eventType === 'remark_clarification_requested' ? 'Précision demandée' : 'Réponse de l’auteur'}
                        {' · '}{item.actorName || item.actorUserId || 'Utilisateur'} · {formatDate(item.createdAt)}
                      </Typography>
                      <Typography level="body-sm">{item.comment}</Typography>
                    </Sheet>
                  ))}
                  {remark.canRespond && remark.status === 'pending' && (
                    <Stack spacing={0.75}>
                      <Textarea
                        size="sm"
                        minRows={2}
                        value={responseComments[remark.id] ?? ''}
                        onChange={event => setResponseComments(previous => ({
                          ...previous,
                          [remark.id]: event.target.value,
                        }))}
                        placeholder="Votre réponse à la demande de précision…"
                      />
                      <Button
                        size="sm"
                        loading={busyRemarkId === remark.id}
                        disabled={busyRemarkId !== null || !responseComments[remark.id]?.trim()}
                        onClick={() => respondToClarification(remark)}
                      >
                        Répondre à la précision
                      </Button>
                    </Stack>
                  )}
                  {canDecide && remark.status === 'pending' && remark.awaitingAuthorResponse && (
                    <Typography level="body-xs" color="warning">
                      En attente de la réponse de l’auteur avant la décision finale.
                    </Typography>
                  )}
                  {canDecide && remark.status === 'pending' && !remark.awaitingAuthorResponse && (
                    <>
                      <Textarea
                        size="sm"
                        minRows={1}
                        value={clarificationComments[remark.id] ?? ''}
                        onChange={event => setClarificationComments(previous => ({
                          ...previous,
                          [remark.id]: event.target.value,
                        }))}
                        placeholder="Demander une précision à l’auteur…"
                      />
                      <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        loading={busyRemarkId === remark.id}
                        disabled={busyRemarkId !== null || !clarificationComments[remark.id]?.trim()}
                        onClick={() => requestClarification(remark)}
                      >
                        Demander une précision
                      </Button>
                      <Textarea
                        size="sm"
                        minRows={1}
                        value={decisionComments[remark.id] ?? ''}
                        onChange={event => setDecisionComments(previous => ({
                          ...previous,
                          [remark.id]: event.target.value,
                        }))}
                        placeholder="Motif de décision (obligatoire pour refuser)…"
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="sm"
                          color="success"
                          loading={busyRemarkId === remark.id}
                          disabled={busyRemarkId !== null}
                          onClick={() => decideRemark(remark, 'accepted')}
                        >
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="outlined"
                          loading={busyRemarkId === remark.id}
                          disabled={
                            busyRemarkId !== null ||
                            !decisionComments[remark.id]?.trim()
                          }
                          onClick={() => decideRemark(remark, 'rejected')}
                        >
                          Refuser
                        </Button>
                      </Stack>
                    </>
                  )}
                  {remark.status !== 'pending' && (
                    <Typography level="body-xs" color="neutral">
                      Décidée le {formatDate(remark.decidedAt)}
                      {(remark.decisionByName || remark.decisionBy) &&
                        ` · par ${remark.decisionByName || remark.decisionBy}`}
                      {remark.decisionComment ? ` · ${remark.decisionComment}` : ''}
                    </Typography>
                  )}
                </Stack>
              </Sheet>
            ))}
          </Stack>
        </Box>
      )}
    </Sheet>
  );
};
