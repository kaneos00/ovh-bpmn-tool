import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from 'react-query';
import { Box, Button, Card, Chip, Divider, Stack, Table, Typography } from '@mui/joy';

import { contentsQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content } from '../../Types';

export type ProjectOverviewProcess = {
  resourceId: string;
  name: string;
  usage: 'common' | 'variant' | 'project-specific';
};

type ProjectProcessOverviewProps = {
  processes: ProjectOverviewProcess[];
};

type ProcessContentRecord = Content & { processName: string };

const statusLabel: Record<ContentStatusEnum, string> = {
  [ContentStatusEnum.Draft]: 'Brouillon',
  [ContentStatusEnum.Published]: 'Publiée',
  [ContentStatusEnum.Obsolete]: 'Historique',
};

const usageLabel: Record<ProjectOverviewProcess['usage'], string> = {
  common: 'Commun',
  variant: 'Variante',
  'project-specific': 'Spécifique au projet',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getLatestPublished = (contents: Content[] | undefined) =>
  (contents ?? [])
    .filter((content) => content.status === ContentStatusEnum.Published || content.status === ContentStatusEnum.Obsolete)
    .sort((left, right) => (right.version ?? 0) - (left.version ?? 0) ||
      new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime())[0];

export const ProjectProcessOverview = ({ processes }: ProjectProcessOverviewProps) => {
  const navigate = useNavigate();
  const contentQueries = useQueries(processes.map((process) => contentsQuery(process.resourceId)));

  const rows = useMemo(() => processes.map((process, index) => {
    const contents = (contentQueries[index]?.data as Content[] | undefined) ?? [];
    const published = getLatestPublished(contents.filter((content) => content.status === ContentStatusEnum.Published));
    return { ...process, published, loading: contentQueries[index]?.isLoading, error: contentQueries[index]?.isError };
  }), [processes, contentQueries]);

  const recentChanges = useMemo(() => processes.flatMap((process, index) => {
    const contents = (contentQueries[index]?.data as Content[] | undefined) ?? [];
    return contents.map((content) => ({ ...content, processName: process.name } as ProcessContentRecord));
  }).sort((left, right) => {
    const leftDate = new Date(left.updatedAt ?? left.createdAt).getTime() || 0;
    const rightDate = new Date(right.updatedAt ?? right.createdAt).getTime() || 0;
    return rightDate - leftDate;
  }).slice(0, 5), [processes, contentQueries]);

  if (!processes.length) return null;

  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ gap: 1.25 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography level="title-lg">Processus du projet</Typography>
            <Typography level="body-sm" color="neutral">Versions publiées et informations de validation.</Typography>
          </Box>
          <Chip variant="soft">{processes.length} processus</Chip>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="sm" hoverRow stickyHeader>
            <thead>
              <tr>
                <th>Processus</th>
                <th>Type</th>
                <th>Version validée</th>
                <th>Date de validation</th>
                <th>Validé / publié par</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.resourceId}>
                  <td>
                    <Button
                      variant="plain"
                      color="primary"
                      size="sm"
                      sx={{ p: 0, minHeight: 'unset', justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => navigate(`/${row.resourceId}`)}
                    >
                      {row.name}
                    </Button>
                    {row.error && <Typography level="body-xs" color="danger">Métadonnées indisponibles</Typography>}
                  </td>
                  <td>{usageLabel[row.usage]}</td>
                  <td>{row.loading ? '…' : row.published?.version ? `V${row.published.version}` : 'Aucune'}</td>
                  <td>{row.loading ? '…' : formatDate(row.published?.updatedAt ?? row.published?.createdAt)}</td>
                  <td>{row.loading ? '…' : row.published ? (row.published.updatedBy || row.published.createdBy || '—') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      </Card>

      <Card variant="outlined" sx={{ gap: 1.25 }}>
        <Typography level="title-lg">Dernières modifications</Typography>
        <Typography level="body-sm" color="neutral">Les cinq versions ou brouillons récemment modifiés, d’après l’historique disponible.</Typography>
        {contentQueries.some((query) => query.isLoading) && recentChanges.length === 0 && (
          <Typography level="body-sm">Chargement de l’historique…</Typography>
        )}
        {contentQueries.some((query) => query.isError) && recentChanges.length === 0 && (
          <Typography level="body-sm" color="neutral">L’historique des modifications n’est pas disponible.</Typography>
        )}
        {!contentQueries.some((query) => query.isLoading || query.isError) && recentChanges.length === 0 && (
          <Typography level="body-sm" color="neutral">Aucune modification enregistrée pour les processus associés.</Typography>
        )}
        {recentChanges.length > 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="sm">
              <thead>
                <tr><th>Date</th><th>Processus</th><th>Version / état</th><th>Modifié par</th></tr>
              </thead>
              <tbody>
                {recentChanges.map((change) => (
                  <tr key={change.id}>
                    <td>{formatDate(change.updatedAt ?? change.createdAt)}</td>
                    <td>
                      <Button
                        variant="plain"
                        color="primary"
                        size="sm"
                        sx={{ p: 0, minHeight: 'unset', justifyContent: 'flex-start', textAlign: 'left' }}
                        onClick={() => navigate(`/${change.resourceId}`)}
                      >
                        {change.processName}
                      </Button>
                    </td>
                    <td><Chip size="sm" variant="soft" color={change.status === ContentStatusEnum.Published ? 'success' : 'neutral'}>
                      {change.version ? `V${change.version} · ` : ''}{statusLabel[change.status] ?? 'Modification'}
                    </Chip></td>
                    <td>{change.updatedBy || change.createdBy || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Box>
        )}
      </Card>
    </Stack>
  );
};
