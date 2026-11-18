import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tree } from 'react-d3-tree';
import { useQuery } from 'react-query';
import { Alert, Box, Button, Card, Chip, Stack, Typography } from '@mui/joy';
import { apiClient } from '../../queryClient';
import { OrganizationAdminLayout } from '../OrganizationAdmin/OrganizationAdminLayout';

type Position = {
  id: string;
  code: string;
  title: string;
  assignment: { userId: string } | null;
};
type Relation = { parentPositionId: string; childPositionId: string };
type Overview = { positions: Position[]; relations: Relation[] };
type TreeDatum = { name: string; attributes?: Record<string, string>; children?: TreeDatum[] };

export const Component = () => {
  const navigate = useNavigate();
  const overviewQuery = useQuery<Overview>(
    ['organization-structure'],
    () => apiClient.get('/organization/overview'),
  );
  const positions = overviewQuery.data?.positions ?? [];
  const treeData = useMemo<TreeDatum>(() => {
    const byId = new Map<string, TreeDatum>();
    positions.forEach(position => byId.set(position.id, {
      name: position.title,
      attributes: { code: position.code, holder: position.assignment?.userId ?? 'Poste vacant' },
      children: [],
    }));
    const childIds = new Set<string>();
    (overviewQuery.data?.relations ?? []).forEach(relation => {
      const parent = byId.get(relation.parentPositionId);
      const child = byId.get(relation.childPositionId);
      if (parent && child) {
        parent.children = [...(parent.children ?? []), child];
        childIds.add(relation.childPositionId);
      }
    });
    return {
      name: 'Entreprise',
      attributes: { root: 'true' },
      children: positions.filter(position => !childIds.has(position.id)).map(position => byId.get(position.id)!),
    };
  }, [positions, overviewQuery.data?.relations]);

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
            <Typography level="body-sm" color="neutral">Visualisation des rattachements hiérarchiques et des titulaires actuels.</Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            <Chip variant="soft">{positions.length} poste(s)</Chip>
            <Button onClick={() => navigate('/organization/positions')}>Gérer les postes</Button>
          </Stack>
        </Stack>
        {overviewQuery.isError && <Alert color="danger">Impossible de charger l’organigramme.</Alert>}
        <Card variant="outlined" sx={{ minHeight: 560, overflow: 'hidden', p: 1 }}>
          {overviewQuery.isLoading && <Typography>Chargement de l’organisation…</Typography>}
          {!overviewQuery.isLoading && positions.length > 0 && (
            <Box sx={{ width: '100%', height: 600 }}>
              <Tree
                data={treeData}
                orientation="vertical"
                translate={{ x: Math.max(450, positions.length * 125), y: 65 }}
                nodeSize={{ x: 260, y: 145 }}
                separation={{ siblings: 1.1, nonSiblings: 1.35 }}
                pathFunc="step"
                zoomable
                draggable
                collapsible={false}
                renderCustomNodeElement={({ nodeDatum }: any) => (
                  <g>
                    <rect x="-108" y="-34" width="216" height="72" rx="12"
                      fill={nodeDatum.attributes?.root ? '#183451' : '#ffffff'}
                      stroke={nodeDatum.attributes?.root ? '#183451' : '#cbd5e1'} strokeWidth="1.5" />
                    <text textAnchor="middle" y="-8" fill={nodeDatum.attributes?.root ? '#ffffff' : '#1e293b'} fontSize="12" fontWeight="700">{nodeDatum.name}</text>
                    <text textAnchor="middle" y="12" fill={nodeDatum.attributes?.root ? '#cbd5e1' : '#64748b'} fontSize="10">{nodeDatum.attributes?.root ? 'Organisation permanente' : nodeDatum.attributes?.code}</text>
                    {!nodeDatum.attributes?.root && <text textAnchor="middle" y="27" fill={nodeDatum.attributes?.holder === 'Poste vacant' ? '#b45309' : '#2864d7'} fontSize="10">{nodeDatum.attributes?.holder}</text>}
                  </g>
                )}
              />
            </Box>
          )}
          {!overviewQuery.isLoading && positions.length === 0 && (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 480 }} spacing={1}>
              <Typography level="h3">Aucun poste créé</Typography>
              <Button onClick={() => navigate('/organization/positions')}>Créer les premiers postes</Button>
            </Stack>
          )}
        </Card>
      </Stack>
    </OrganizationAdminLayout>
  );
};
