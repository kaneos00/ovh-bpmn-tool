import React, { useMemo, useState } from 'react';
import Tree from 'react-d3-tree';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert, Box, Button, Card, Chip, FormControl, FormLabel, Input,
  Option, Select, Stack, Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { OrganizationAdminLayout } from '../OrganizationAdmin/OrganizationAdminLayout';

type Account = { id: string; username: string; email: string | null; active: boolean };
type Assignment = { id: string; userId: string; startDate: string; endDate: string | null; note: string | null };
type Position = {
  id: string; code: string; title: string; description: string | null;
  functionId: string | null; active: boolean; assignment: Assignment | null;
  parentPositionId: string | null;
};
type Relation = { id: string; parentPositionId: string; childPositionId: string; sortOrder: number };
type Overview = { positions: Position[]; relations: Relation[] };
type FunctionOption = { id: string; code: string; name: string };

type TreeDatum = {
  name: string;
  attributes?: Record<string, string>;
  children?: TreeDatum[];
};

export const Component = () => {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [functionId, setFunctionId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [childPositionId, setChildPositionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const overviewQuery = useQuery<Overview>(
    ['organization-structure'],
    () => apiClient.get('/organization/overview'),
  );
  const accountsQuery = useQuery<Account[]>(
    ['organization-active-users'],
    () => apiClient.get('/auth/users'),
  );
  const functionsQuery = useQuery<FunctionOption[]>(
    ['job-architecture-functions'],
    () => apiClient.get('/job-architecture/functions'),
  );
  const overview = overviewQuery.data;
  const positions = overview?.positions ?? [];
  const selectedPosition = positions.find(position => position.id === selectedPositionId) ?? null;
  const activeAccounts = (accountsQuery.data ?? []).filter(account => account.active);

  const treeData = useMemo<TreeDatum>(() => {
    const byId = new Map<string, TreeDatum>();
    positions.forEach(position => byId.set(position.id, {
      name: position.title,
      attributes: {
        id: position.id,
        code: position.code,
        holder: position.assignment?.userId ?? 'Poste vacant',
      },
      children: [],
    }));
    const childIds = new Set<string>();
    (overview?.relations ?? []).forEach(relation => {
      const parent = byId.get(relation.parentPositionId);
      const child = byId.get(relation.childPositionId);
      if (parent && child) {
        parent.children = [...(parent.children ?? []), child];
        childIds.add(relation.childPositionId);
      }
    });
    const roots = positions.filter(position => !childIds.has(position.id)).map(position => byId.get(position.id)!);
    return { name: 'Entreprise', attributes: { root: 'true' }, children: roots };
  }, [positions, overview?.relations]);

  const refresh = async () => {
    await queryClient.invalidateQueries(['organization-structure']);
    await queryClient.invalidateQueries(['organization-active-users']);
  };

  const createPosition = useMutation(
    () => apiClient.post('/organization/positions', {
      code: code.trim(), title: title.trim(), description: description.trim() || null,
      functionId: functionId || null,
    }),
    {
      onSuccess: async (created: Position) => {
        setError(''); setCode(''); setTitle(''); setDescription('');
        setFunctionId(null); setSelectedPositionId(created.id);
        await refresh();
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const assignUser = useMutation(
    () => {
      if (!selectedPositionId || !userId) throw new Error('Sélectionnez un poste et un utilisateur.');
      return apiClient.post(`/organization/positions/${selectedPositionId}/assignments`, {
        userId, startDate, endDate: null,
      });
    },
    {
      onSuccess: async () => { setError(''); setUserId(null); await refresh(); },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const addRelation = useMutation(
    () => {
      if (!selectedPositionId || !childPositionId) throw new Error('Sélectionnez les deux postes.');
      return apiClient.post(`/organization/positions/${selectedPositionId}/relations`, { childPositionId });
    },
    {
      onSuccess: async () => { setError(''); setChildPositionId(null); await refresh(); },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const treeWidth = Math.max(900, positions.length * 250);
  const selectedAssignment = selectedPosition?.assignment;

  return (
    <OrganizationAdminLayout
      activeSection="structure"
      title="Organigramme de l’entreprise"
      breadcrumbs={[
        { id: 'home', label: 'Tous les projets', to: '/projects' },
        { id: 'administration', label: 'Administration', to: '/organization/overview' },
        { id: 'structure', label: 'Organigramme', to: '/organization/structure' },
      ]}
    >
      <Stack spacing={2.5}>
        <Box className="org-admin-v2__page-head">
          <Box>
            <div className="org-admin-v2__eyebrow">Organisation permanente</div>
            <Typography level="h1">Organigramme</Typography>
            <Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 760, mt: 0.5 }}>
              Les postes structurent l’entreprise indépendamment de leurs titulaires. Les rôles propres aux projets restent gérés dans chaque projet.
            </Typography>
          </Box>
          <Chip color="primary" variant="soft">{positions.length} poste(s)</Chip>
        </Box>

        {error && <Alert color="danger" onClose={() => setError('')}>{error}</Alert>}
        {overviewQuery.isLoading && <Typography>Chargement de l’organisation…</Typography>}
        {overviewQuery.isError && <Alert color="danger">Impossible de charger l’organigramme.</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 330px' }, gap: 2 }}>
          <Card variant="outlined" sx={{ minHeight: 520, overflow: 'hidden', p: 1 }}>
            {positions.length > 0 ? (
              <Box sx={{ width: '100%', height: 560 }}>
                <Tree
                  data={treeData}
                  orientation="vertical"
                  translate={{ x: treeWidth / 2 - 110, y: 70 }}
                  nodeSize={{ x: 260, y: 145 }}
                  separation={{ siblings: 1.1, nonSiblings: 1.35 }}
                  pathFunc="step"
                  zoomable
                  draggable
                  collapsible={false}
                  onNodeClick={(node: any) => {
                    const id = node?.data?.attributes?.id;
                    if (id) setSelectedPositionId(id);
                  }}
                  renderCustomNodeElement={({ nodeDatum }: any) => (
                    <g>
                      <rect x="-108" y="-34" width="216" height="72" rx="12" fill={nodeDatum.attributes?.root ? '#183451' : '#ffffff'} stroke={nodeDatum.attributes?.root ? '#183451' : '#cbd5e1'} strokeWidth="1.5" />
                      <text textAnchor="middle" y="-8" fill={nodeDatum.attributes?.root ? '#ffffff' : '#1e293b'} fontSize="12" fontWeight="700">{nodeDatum.name.length > 27 ? nodeDatum.name.slice(0, 25) + '…' : nodeDatum.name}</text>
                      <text textAnchor="middle" y="12" fill={nodeDatum.attributes?.root ? '#cbd5e1' : '#64748b'} fontSize="10">{nodeDatum.attributes?.root ? 'Structure permanente' : nodeDatum.attributes?.code}</text>
                      {!nodeDatum.attributes?.root && <text textAnchor="middle" y="27" fill={nodeDatum.attributes?.holder === 'Poste vacant' ? '#b45309' : '#2864d7'} fontSize="10">{nodeDatum.attributes?.holder}</text>}
                    </g>
                  )}
                />
              </Box>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 480 }} spacing={1}>
                <Typography level="h3">Votre organigramme commence ici</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Créez les premiers postes permanents dans le panneau de droite.</Typography>
              </Stack>
            )}
          </Card>

          <Stack spacing={2}>
            <Card variant="outlined">
              <Typography level="title-lg">Créer un poste</Typography>
              <FormControl required><FormLabel>Code</FormLabel><Input value={code} onChange={event => setCode(event.target.value)} placeholder="Ex. DIR-GEN" /></FormControl>
              <FormControl required><FormLabel>Intitulé</FormLabel><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex. Direction générale" /></FormControl>
              <FormControl><FormLabel>Fonction de référence</FormLabel>
                <Select value={functionId} onChange={(_event, value) => setFunctionId(value)} placeholder="Aucune fonction liée">
                  {(functionsQuery.data ?? []).map(item => <Option key={item.id} value={item.id}>{item.code} — {item.name}</Option>)}
                </Select>
              </FormControl>
              <FormControl><FormLabel>Description</FormLabel><Input value={description} onChange={event => setDescription(event.target.value)} /></FormControl>
              <Button disabled={!code.trim() || !title.trim() || createPosition.isLoading} loading={createPosition.isLoading} onClick={() => createPosition.mutate()}>＋ Ajouter le poste</Button>
            </Card>

            <Card variant="outlined">
              <Typography level="title-lg">Détail du poste</Typography>
              <FormControl><FormLabel>Poste sélectionné</FormLabel>
                <Select value={selectedPositionId || null} onChange={(_event, value) => setSelectedPositionId(value ?? '')} placeholder="Choisir un poste">
                  {positions.map(position => <Option key={position.id} value={position.id}>{position.title}</Option>)}
                </Select>
              </FormControl>
              {selectedPosition && (
                <>
                  <Typography level="body-sm"><strong>{selectedPosition.code}</strong> · {selectedPosition.description || 'Aucune description'}</Typography>
                  <Chip color={selectedAssignment ? 'success' : 'warning'} variant="soft">{selectedAssignment ? `Titulaire : ${selectedAssignment.userId}` : 'Poste vacant'}</Chip>
                  <FormControl><FormLabel>Affecter un titulaire</FormLabel>
                    <Select value={userId} onChange={(_event, value) => setUserId(value)} placeholder="Choisir un utilisateur">
                      {activeAccounts.map(account => <Option key={account.id} value={account.username}>{account.username}{account.email ? ` — ${account.email}` : ''}</Option>)}
                    </Select>
                  </FormControl>
                  <FormControl><FormLabel>Date de début</FormLabel><Input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></FormControl>
                  <Button disabled={!userId || assignUser.isLoading} loading={assignUser.isLoading} onClick={() => assignUser.mutate()}>Affecter la personne</Button>
                  <FormControl><FormLabel>Rattacher un poste enfant</FormLabel>
                    <Select value={childPositionId} onChange={(_event, value) => setChildPositionId(value)} placeholder="Choisir un poste">
                      {positions.filter(position => position.id !== selectedPositionId && position.parentPositionId !== selectedPositionId).map(position => <Option key={position.id} value={position.id}>{position.title}</Option>)}
                    </Select>
                  </FormControl>
                  <Button variant="outlined" disabled={!childPositionId || addRelation.isLoading} loading={addRelation.isLoading} onClick={() => addRelation.mutate()}>Ajouter le rattachement</Button>
                </>
              )}
            </Card>
          </Stack>
        </Box>
      </Stack>
    </OrganizationAdminLayout>
  );
};
