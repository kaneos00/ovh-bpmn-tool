import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, FormControl, FormLabel, Input, Modal, ModalDialog, Option, Select, Stack, Typography } from '@mui/joy';
import { AddRounded, DescriptionOutlined, StorageRounded } from '@mui/icons-material';
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { DocumentedSourcesGrid } from './DocumentedSourcesGrid';
import { apiClient } from '../../../queryClient';

type SourceKind = 'file' | 'database' | 'application';
type SourceReference = { id: string; resourceId: string; elementId: string; elementName: string; elementType: string; processName: string };
type Source = {
  id: string; kind: SourceKind | 'form'; name: string; description: string | null; link: string | null;
  location: string | null; access: string | null; retention: string | null; validUntil: string | null;
  authorizedPeople: string | null; restrictions: string | null; references: SourceReference[];
};
type UnlinkedReference = { resourceId: string; processName: string; elementId: string; elementName: string; elementType: string };
type ResponseData = { sources: Source[]; unlinkedReferences: UnlinkedReference[] };
type GridRow = {
  id: string; sourceId: string; kind: SourceKind; name: string; description: string; references: SourceReference[];
  projectStatus: string; link: string; location: string; access: string; validUntil: string;
  authorizedPeople: string; restrictions: string;
};

const kindLabels: Record<SourceKind, string> = { file: 'Fichier', database: 'Base de données', application: 'Application' };
const objectIcon = (type: string) => type === 'dataStoreReference' ? <StorageRounded fontSize="small" /> : <DescriptionOutlined fontSize="small" />;

export const ProjectDocumentedSources = ({ projectId, canManage }: { projectId: string; canManage: boolean }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SourceKind>('file');
  const [error, setError] = useState('');
  const queryKey = ['project-documented-sources', projectId];
  const query = useQuery<ResponseData>(queryKey, () => apiClient.get(`/projects/${projectId}/documented-sources`), { enabled: Boolean(projectId) });
  const data = query.data;
  const rows = useMemo<GridRow[]>(() => (data?.sources ?? []).map(source => ({
    id: source.id, sourceId: source.id, kind: source.kind === 'form' ? 'file' : source.kind,
    name: source.name, description: source.description ?? '', references: source.references,
    projectStatus: source.references.length ? `Associé · ${source.references.length}` : 'Non associé',
    link: source.link ?? '', location: source.location ?? '', access: source.access ?? '',
    validUntil: source.validUntil ?? '', authorizedPeople: source.authorizedPeople ?? '', restrictions: source.restrictions ?? '',
  })), [data?.sources]);

  const saveCell = async (event: CellValueChangedEvent<GridRow>) => {
    const row = event.data;
    if (!row?.sourceId || !canManage || event.newValue === event.oldValue) return;
    const fieldMap: Record<string, string> = { kind: 'kind', name: 'name', description: 'description', link: 'link', location: 'location', access: 'access', validUntil: 'validUntil', authorizedPeople: 'authorizedPeople', restrictions: 'restrictions' };
    const field = fieldMap[String(event.colDef.field ?? '')];
    if (!field) return;
    try {
      await apiClient.put(`/projects/${projectId}/documented-sources/${row.sourceId}`, { [field]: event.newValue });
      await queryClient.invalidateQueries(queryKey);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
      await queryClient.invalidateQueries(queryKey);
    }
  };

  const addSource = async () => {
    const ref = (data?.unlinkedReferences ?? []).find(item => item.resourceId + ':' + item.elementId === selectedReference);
    if (!ref || !newName.trim()) return;
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources`, {
        resourceId: ref.resourceId, elementId: ref.elementId, elementName: ref.elementName,
        elementType: ref.elementType, name: newName.trim(), kind: newKind,
      });
      setAdding(false); setSelectedReference(null); setNewName(''); setNewKind('file'); setError('');
      await queryClient.invalidateQueries(queryKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    }
  };

  const columns: ColDef<GridRow>[] = [
    { headerName: 'Type', field: 'kind', minWidth: 125, editable: canManage, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['file', 'database', 'application'] }, valueFormatter: p => kindLabels[p.value as SourceKind] ?? '' },
    { headerName: 'Nom', field: 'name', minWidth: 180, editable: canManage },
    { headerName: 'Description', field: 'description', minWidth: 220, editable: canManage },
    { headerName: 'Objet BPMN', minWidth: 250, editable: false, autoHeight: true,
      cellRenderer: (p: { data?: GridRow }) => p.data ? <Stack spacing={0.25}>{p.data.references.length ? p.data.references.map(ref => <Button key={ref.id} size="sm" variant="plain" color="neutral" startDecorator={objectIcon(ref.elementType)} sx={{ justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }} onClick={() => navigate(`/${ref.resourceId}?elementId=${encodeURIComponent(ref.elementId)}`)}>{ref.elementName} <Typography level="body-xs" color="neutral">— {ref.processName}</Typography></Button>) : <Typography level="body-sm" color="neutral">Non associé</Typography>}</Stack> : null },
    { headerName: 'Statut projet', field: 'projectStatus', minWidth: 130, editable: false },
    { headerName: 'Lien', field: 'link', minWidth: 170, editable: canManage },
    { headerName: 'Emplacement', field: 'location', minWidth: 150, editable: canManage },
    { headerName: 'Accès', field: 'access', minWidth: 140, editable: canManage },
    { headerName: 'Date limite de validité', field: 'validUntil', minWidth: 175, editable: canManage, cellEditor: 'agTextCellEditor', valueFormatter: p => p.value || 'Sans limite' },
    { headerName: 'Personne autorisée', field: 'authorizedPeople', minWidth: 170, editable: canManage },
    { headerName: 'Restrictions', field: 'restrictions', minWidth: 190, editable: canManage },
  ];

  if (query.isLoading) return <Typography level="body-sm" color="neutral">Chargement des informations documentées…</Typography>;
  if (query.isError) return <Alert color="danger">Impossible de charger le référentiel des informations documentées.</Alert>;

  return <Stack spacing={1.25} sx={{ minWidth: 0 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
      <Box><Typography level="title-lg">Informations documentées</Typography><Typography level="body-sm" color="neutral">Référentiel documentaire central du projet, lié aux objets et magasins de données BPMN.</Typography></Box>
      {canManage && <Button size="sm" startDecorator={<AddRounded />} onClick={() => setAdding(true)} disabled={!data?.unlinkedReferences.length}>Ajouter une ligne</Button>}
    </Stack>
    {error && <Alert color="danger" variant="soft">{error}</Alert>}
    {canManage && !data?.unlinkedReferences.length && <Alert color="info" variant="soft">Tous les objets et magasins de données détectés sont déjà associés. Pour ajouter une ligne, créez d’abord un objet de données ou un magasin de données dans un diagramme BPMN.</Alert>}
    <DocumentedSourcesGrid<GridRow> rowData={rows} columnDefs={columns} getRowId={row => row.id} height={560} onCellValueChanged={saveCell} />
    <Modal open={adding} onClose={() => setAdding(false)}>
      <ModalDialog sx={{ width: 'min(560px, calc(100vw - 32px))' }}>
        <Typography level="title-lg">Ajouter une information documentée</Typography>
        <Stack spacing={1.5}>
          <FormControl required><FormLabel>Objet BPMN à associer</FormLabel><Select value={selectedReference} onChange={(_, value) => { setSelectedReference(value); const ref = data?.unlinkedReferences.find(item => item.resourceId + ':' + item.elementId === value); if (ref && !newName) setNewName(ref.elementName); }} placeholder="Sélectionner un objet ou magasin de données">{(data?.unlinkedReferences ?? []).map(ref => <Option key={ref.resourceId + ':' + ref.elementId} value={ref.resourceId + ':' + ref.elementId}>{ref.elementName} — {ref.processName}</Option>)}</Select></FormControl>
          <FormControl required><FormLabel>Nom</FormLabel><Input value={newName} onChange={e => setNewName(e.target.value)} /></FormControl>
          <FormControl><FormLabel>Type</FormLabel><Select value={newKind} onChange={(_, value) => value && setNewKind(value as SourceKind)}><Option value="file">Fichier</Option><Option value="database">Base de données</Option><Option value="application">Application</Option></Select></FormControl>
          <Stack direction="row" justifyContent="flex-end" spacing={1}><Button variant="outlined" color="neutral" onClick={() => setAdding(false)}>Annuler</Button><Button onClick={addSource} disabled={!selectedReference || !newName.trim()}>Ajouter</Button></Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  </Stack>;
};
