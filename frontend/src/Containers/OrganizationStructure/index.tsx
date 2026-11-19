import React, { useMemo, useState } from 'react';
import { Tree } from 'react-d3-tree';
import { useQuery } from 'react-query';
import { Alert, Box, Button, Card, Chip, Divider, Stack, Typography } from '@mui/joy';
import { apiClient } from '../../queryClient';
import { OrganizationAdminLayout } from '../OrganizationAdmin/OrganizationAdminLayout';

type Assignment = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  isActing?: boolean;
};
type Position = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  assignment: Assignment | null;
  parentPositionId?: string | null;
};
type Relation = { id?: string; parentPositionId: string; childPositionId: string };
type Overview = { positions: Position[]; relations: Relation[] };
type PositionDetail = Position & {
  assignments: Assignment[];
  jobFunction?: { name: string } | null;
  children: Array<{ childPositionId: string }>;
};
type TreeDatum = {
  name: string;
  attributes?: Record<string, string>;
  children?: TreeDatum[];
};

export const Component = () => {
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const overviewQuery = useQuery<Overview>(
    ['organization-structure'],
    () => apiClient.get('/organization/overview'),
  );
  const detailQuery = useQuery<PositionDetail>(
    ['organization-position-detail', selectedPositionId],
    () => apiClient.get(`/organization/positions/${selectedPositionId}`),
    { enabled: Boolean(selectedPositionId) },
  );
  const positions = overviewQuery.data?.positions ?? [];
  const treeData = useMemo<TreeDatum>(() => {
    const positionById = new Map(positions.map(position => [position.id, position]));
    const childrenByParent = new Map<string, string[]>();
    const parentByChild = new Map<string, string>();
    (overviewQuery.data?.relations ?? []).forEach(relation => {
      if (!positionById.has(relation.parentPositionId) || !positionById.has(relation.childPositionId)) return;
      if (parentByChild.has(relation.childPositionId)) return;
      parentByChild.set(relation.childPositionId, relation.parentPositionId);
      const children = childrenByParent.get(relation.parentPositionId) ?? [];
      children.push(relation.childPositionId);
      childrenByParent.set(relation.parentPositionId, children);
    });

    const visited = new Set<string>();
    const buildNode = (id: string): TreeDatum | null => {
      if (visited.has(id)) return null;
      const position = positionById.get(id);
      if (!position) return null;
      visited.add(id);
      const children = (childrenByParent.get(id) ?? [])
        .map(childId => buildNode(childId))
        .filter((node): node is TreeDatum => Boolean(node));
      return {
        name: position.title,
        attributes: {
          id: position.id,
          code: position.code,
          holder: position.assignment
            ? `${position.assignment.userId}${position.assignment.isActing ? ' · Intérim' : ''}`
            : 'Poste vacant',
        },
        children,
      };
    };

    const roots = positions
      .filter(position => !parentByChild.has(position.id))
      .map(position => buildNode(position.id))
      .filter((node): node is TreeDatum => Boolean(node));
    // Keep disconnected records visible if legacy or imported data contains an orphan/cycle.
    positions.forEach(position => {
      if (!visited.has(position.id)) {
        const node = buildNode(position.id);
        if (node) roots.push(node);
      }
    });
    return { name: 'Organisation permanente', attributes: { root: 'true' }, children: roots };
  }, [positions, overviewQuery.data?.relations]);

  const selectedPosition = detailQuery.data;

  return (
    <OrganizationAdminLayout
      activeSection="structure"
      title="Organigramme"
      breadcrumbs={[
        { id: 'home', label: 'Accueil', to: '/projects' },
        { id: 'administration', label: 'Administration', to: '/organization/overview' },
        { id: 'structure', label: 'Organigramme', to: '/organization/structure' },
      ]}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
          <Box>
            <Typography level="h1">Structure de l’entreprise</Typography>
            <Typography level="body-sm" color="neutral">Cliquez sur un poste pour consulter sa fiche et son historique d’affectation.</Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            <Chip variant="soft">{positions.length} poste(s)</Chip>
            <Button onClick={() => window.location.assign('/organization/positions')}>Gérer les postes</Button>
          </Stack>
        </Stack>
        {overviewQuery.isError && <Alert color="danger">Impossible de charger l’organigramme.</Alert>}
        <Card variant="outlined" sx={{ minHeight: 560, overflow: 'hidden', p: 1 }}>
          {overviewQuery.isLoading && <Typography>Chargement de l’organisation…</Typography>}
          {!overviewQuery.isLoading && positions.length > 0 && (
            <Box sx={{ width: '100%', height: 'min(72vh, 760px)', minHeight: 560 }}>
              <Tree
                data={treeData}
                orientation="vertical"
                translate={{ x: 170, y: 72 }}
                zoom={1}
                nodeSize={{ x: 260, y: 150 }}
                separation={{ siblings: 1.2, nonSiblings: 1.5 }}
                pathFunc="step"
                zoomable
                draggable
                collapsible={false}
                renderCustomNodeElement={({ nodeDatum }: any) => {
                  const isRoot = Boolean(nodeDatum.attributes?.root);
                  const selected = nodeDatum.attributes?.id === selectedPositionId;
                  return (
                    <g
                      onClick={() => {
                        if (!isRoot && nodeDatum.attributes?.id) setSelectedPositionId(nodeDatum.attributes.id);
                      }}
                      style={{ cursor: isRoot ? 'default' : 'pointer' }}
                    >
                      <rect x="-108" y="-36" width="216" height="76" rx="12"
                        fill={isRoot ? '#183451' : selected ? '#e8efff' : '#ffffff'}
                        stroke={isRoot ? '#183451' : selected ? '#2864d7' : '#cbd5e1'}
                        strokeWidth={selected ? 2.5 : 1.5} />
                      <text textAnchor="middle" y="-9" fill={isRoot ? '#ffffff' : '#1e293b'} fontSize="12" fontWeight="700">{nodeDatum.name}</text>
                      <text textAnchor="middle" y="11" fill={isRoot ? '#cbd5e1' : '#64748b'} fontSize="10">{isRoot ? 'Socle commun' : nodeDatum.attributes?.code}</text>
                      {!isRoot && <text textAnchor="middle" y="27" fill={nodeDatum.attributes?.holder === 'Poste vacant' ? '#b45309' : '#2864d7'} fontSize="10">{nodeDatum.attributes?.holder}</text>}
                    </g>
                  );
                }}
              />
            </Box>
          )}
          {!overviewQuery.isLoading && positions.length === 0 && (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 480 }} spacing={1}>
              <Typography level="h3">Aucun poste créé</Typography>
              <Button onClick={() => window.location.assign('/organization/positions')}>Créer les premiers postes</Button>
            </Stack>
          )}
        </Card>
        {selectedPositionId && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            {detailQuery.isLoading && <Typography>Chargement de la fiche du poste…</Typography>}
            {detailQuery.isError && <Alert color="danger">Impossible de charger la fiche de ce poste.</Alert>}
            {selectedPosition && (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography level="body-xs" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedPosition.code}</Typography>
                    <Typography level="h2">{selectedPosition.title}</Typography>
                    <Typography level="body-sm" color="neutral">{selectedPosition.jobFunction?.name ?? 'Fonction non associée'}</Typography>
                  </Box>
                  <Button size="sm" variant="plain" color="neutral" onClick={() => setSelectedPositionId(null)}>Fermer</Button>
                </Stack>
                {selectedPosition.description && <Typography level="body-sm">{selectedPosition.description}</Typography>}
                <Divider />
                <Typography level="title-md">Affectations</Typography>
                {selectedPosition.assignments.length === 0 && <Typography level="body-sm" color="neutral">Aucune affectation enregistrée.</Typography>}
                {selectedPosition.assignments.map(assignment => (
                  <Stack key={assignment.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5}>
                    <Typography level="body-sm">
                      {assignment.userId}{assignment.isActing ? ' · Intérim' : ''}
                    </Typography>
                    <Typography level="body-xs" color="neutral">
                      Du {assignment.startDate} au {assignment.endDate ?? 'sans date de fin'}
                    </Typography>
                  </Stack>
                ))}
              </>
            )}
          </Card>
        )}
      </Stack>
    </OrganizationAdminLayout>
  );
};
