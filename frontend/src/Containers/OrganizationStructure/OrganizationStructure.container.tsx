import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, type ColDef, type SelectionChangedEvent, type CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Tree } from 'react-d3-tree';
import {
  Alert, Button, Card, Chip, Divider, FormControl, FormLabel,
  Input, Option, Select, Stack, Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { OrganizationAdminLayout } from '../OrganizationAdmin/OrganizationAdminLayout';
import './OrganizationStructure.scss';

type Position = {
  id: string; title: string; description: string | null; functionId: string | null;
  parentPositionId: string | null; sortOrder: number; active: boolean; createdBy: string;
};
type JobFunction = { id: string; code: string; name: string };
type PositionNode = Position & { children: PositionNode[] };
type TreeNode = { name: string; attributes: { id: string; active: string }; children: TreeNode[] };
const toTreeNode = (node: PositionNode): TreeNode => ({
  name: node.title,
  attributes: { id: node.id, active: String(node.active) },
  children: (node.children ?? []).map(toTreeNode),
});
const getNodeTitle = (name: string) => (name.length > 25 ? `${name.slice(0, 23)}…` : name);

const positionsKey = ['organization-positions'];
const functionsKey = ['job-architecture-functions'];

export const Component = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [functionId, setFunctionId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Position[]>([]);
  const [view, setView] = useState<'tree' | 'grid'>('tree');

  const positionsQuery = useQuery<Position[]>(positionsKey, () => apiClient.get('/organization/positions'));
  const treeQuery = useQuery<TreeNode[]>(['organization-positions-tree'], async () => {
    const rows = await apiClient.get('/organization/positions/tree') as PositionNode[];
    return rows.map(toTreeNode);
  });
  const functionsQuery = useQuery<JobFunction[]>(functionsKey, () => apiClient.get('/job-architecture/functions'));
  const positions = positionsQuery.data ?? [];
  const functions = functionsQuery.data ?? [];
  const functionNames = useMemo(() => new Map(functions.map(item => [item.id, item.name])), [functions]);
  const positionNames = useMemo(() => new Map(positions.map(item => [item.id, item.title])), [positions]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries(positionsKey),
      queryClient.invalidateQueries(['organization-positions-tree']),
    ]);
  };
  const createPosition = useMutation(
    () => apiClient.post('/organization/positions', {
      title: title.trim(), description: description.trim() || null,
      functionId, parentPositionId: parentId, sortOrder: positions.length,
    }),
    { onSuccess: async () => { setTitle(''); setDescription(''); setFunctionId(null); setParentId(null); setError(''); await refresh(); },
      onError: (reason: Error) => setError(reason.message) },
  );
  const updatePosition = useMutation(
    ({ id, patch }: { id: string; patch: Partial<Position> }) => apiClient.patch(`/organization/positions/${id}`, patch),
    { onSuccess: refresh, onError: (reason: Error) => setError(reason.message) },
  );

  const bulkDeactivate = async () => {
    setError('');
    try {
      await Promise.all(selectedRows.filter(row => row.active).map(row => apiClient.patch(`/organization/positions/${row.id}/status`, { active: false })));
      setSelectedRows([]);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action groupée impossible.'); }
  };

  const columns = useMemo<ColDef<Position>[]>(() => [
    { field: 'title', headerName: 'Poste', editable: true, minWidth: 190, flex: 1 },
    { field: 'description', headerName: 'Description', editable: true, minWidth: 190, flex: 1 },
    { headerName: 'Fiche de fonction', valueGetter: params => params.data?.functionId ? functionNames.get(params.data.functionId) ?? 'Référence indisponible' : 'Non définie', minWidth: 170 },
    { headerName: 'Rattachement', valueGetter: params => params.data?.parentPositionId ? positionNames.get(params.data.parentPositionId) ?? '—' : 'Direction', minWidth: 150 },
    { field: 'sortOrder', headerName: 'Ordre', editable: true, width: 95 },
    { field: 'active', headerName: 'Actif', valueFormatter: params => params.value ? 'Oui' : 'Non', width: 90 },
  ], [functionNames, positionNames]);

  const onCellValueChanged = (event: CellValueChangedEvent<Position>) => {
    if (!event.data || event.oldValue === event.newValue) return;
    const field = event.colDef.field;
    if (field === 'title' || field === 'description' || field === 'sortOrder') {
      updatePosition.mutate({ id: event.data.id, patch: { [field]: event.newValue } });
    }
  };
  const onSelectionChanged = (event: SelectionChangedEvent<Position>) => setSelectedRows(event.api.getSelectedRows());

  const stats = { total: positions.length, roots: positions.filter(item => !item.parentPositionId).length, withoutFunction: positions.filter(item => !item.functionId).length };
  const breadcrumbs = [
    { id: 'home', label: 'Tous les projets', to: '/projects' },
    { id: 'administration', label: 'Administration', to: '/organization/overview' },
    { id: 'structure', label: 'Organisation permanente', to: '/organization/structure' },
  ];

  return (
    <OrganizationAdminLayout activeSection="structure" title="Organisation permanente" breadcrumbs={breadcrumbs}>
      <div className="org-admin-v2__page-head">
        <div><div className="org-admin-v2__eyebrow">Structure de l’entreprise</div><Typography level="h1">Postes permanents</Typography><Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.5 }}>Construisez la hiérarchie de référence, indépendamment des projets et des titulaires.</Typography></div>
        <Stack direction="row" spacing={1}>
          <Button size="sm" variant={view === 'tree' ? 'solid' : 'outlined'} onClick={() => setView('tree')}>Organigramme</Button>
          <Button size="sm" variant={view === 'grid' ? 'solid' : 'outlined'} onClick={() => setView('grid')}>Grille de gestion</Button>
        </Stack>
      </div>
      {error && <Alert color="danger">{error}</Alert>}
      {(positionsQuery.isError || treeQuery.isError || functionsQuery.isError) && <Alert color="danger">Impossible de charger les données de l’organisation. Vérifiez la migration et les droits administrateur.</Alert>}
      <div className="org-structure__stats">
        <Card><Typography level="body-xs">Postes actifs</Typography><Typography level="h2">{stats.total}</Typography></Card>
        <Card><Typography level="body-xs">Postes racines</Typography><Typography level="h2">{stats.roots}</Typography></Card>
        <Card><Typography level="body-xs">Sans fiche de fonction</Typography><Typography level="h2">{stats.withoutFunction}</Typography></Card>
      </div>
      <div className="org-structure__layout">
        <Card variant="outlined" className="org-structure__main">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography level="title-lg">{view === 'tree' ? 'Organigramme' : 'Tous les postes'}</Typography>
            {view === 'grid' && <Chip size="sm" variant="soft">{positions.length} poste(s)</Chip>}
          </Stack>
          {view === 'tree' ? (
            <div className="org-structure__tree">
              {treeQuery.isLoading ? <Typography>Chargement de l’organigramme…</Typography> :
                (treeQuery.data?.length ?? 0) === 0 ? <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucun poste créé. Ajoutez le premier poste dans le panneau de droite.</Typography> :
                <Tree data={treeQuery.data!} orientation="vertical" translate={{ x: 360, y: 65 }} pathFunc="step" separation={{ siblings: 1.2, nonSiblings: 1.5 }} nodeSize={{ x: 230, y: 105 }} renderCustomNodeElement={({ nodeDatum }) => (
                  <g>
                    <rect x="-92" y="-27" width="184" height="54" rx="9" fill={nodeDatum.attributes?.active === 'false' ? '#eef0f3' : '#eaf1ff'} stroke="#9bb4e8" />
                    <text textAnchor="middle" y="-2" fill="#203047" fontSize="12" fontWeight="700">{getNodeTitle(nodeDatum.name)}</text>
                    <text textAnchor="middle" y="15" fill="#657188" fontSize="10">{nodeDatum.attributes?.active === 'false' ? 'Inactif' : 'Poste vacant'}</text>
                  </g>
                )} />}
            </div>
          ) : (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Édition directe des intitulés, descriptions et ordre d’affichage.</Typography>
                <Button size="sm" color="danger" variant="soft" disabled={!selectedRows.some(row => row.active)} onClick={bulkDeactivate}>Désactiver la sélection ({selectedRows.length})</Button>
              </Stack>
              <div className="org-structure__grid">
                <AgGridReact<Position>
                  theme={themeQuartz}
                  rowData={positions}
                  columnDefs={columns}
                  getRowId={params => params.data.id}
                  rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
                  onSelectionChanged={onSelectionChanged}
                  onCellValueChanged={onCellValueChanged}
                  defaultColDef={{ sortable: true, filter: true, resizable: true }}
                  animateRows
                />
              </div>
            </>
          )}
        </Card>
        <Card variant="outlined" className="org-structure__form">
          <Typography level="title-lg">Créer un poste</Typography>
          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Le poste est permanent et reste indépendant de la personne qui l’occupera.</Typography>
          <Divider />
          <FormControl required><FormLabel>Intitulé du poste</FormLabel><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex. Responsable qualité" /></FormControl>
          <FormControl><FormLabel>Description</FormLabel><Input value={description} onChange={event => setDescription(event.target.value)} placeholder="Mission principale (facultatif)" /></FormControl>
          <FormControl><FormLabel>Fiche de fonction</FormLabel><Select value={functionId} onChange={(_, value) => setFunctionId(value)} placeholder="Aucune fiche associée" >{functions.map(item => <Option key={item.id} value={item.id}>{item.code} · {item.name}</Option>)}</Select></FormControl>
          <FormControl><FormLabel>Rattachement hiérarchique</FormLabel><Select value={parentId} onChange={(_, value) => setParentId(value)} placeholder="Poste racine" >{positions.filter(item => item.active).map(item => <Option key={item.id} value={item.id}>{item.title}</Option>)}</Select></FormControl>
          <Button disabled={!title.trim() || createPosition.isLoading} loading={createPosition.isLoading} onClick={() => createPosition.mutate()}>Ajouter le poste</Button>
          <Divider />
          <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Les postes n’ont pas encore de titulaire. L’affectation nominative sera traitée dans une phase ultérieure.</Typography>
        </Card>
      </div>
    </OrganizationAdminLayout>
  );
};
