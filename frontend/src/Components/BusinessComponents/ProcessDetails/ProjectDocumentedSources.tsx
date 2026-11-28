import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, FormControl, FormLabel, Input, Modal, ModalDialog, Stack, Typography } from '@mui/joy';
import { AppsRounded, DeleteOutlineRounded, DescriptionOutlined, StorageRounded } from '@mui/icons-material';
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { DocumentedSourcesGrid } from './DocumentedSourcesGrid';
import { apiClient } from '../../../queryClient';

type SourceKind = 'file' | 'database' | 'application';
type SourceReference = { id: string; resourceId: string; elementId: string; elementName: string; elementType: string; processName: string };
type Source = {
  id: string; kind: SourceKind | 'form'; name: string; description: string | null; link: string | null;
  location: string | null; access: string | null; retention: string | null; validUntil: string | null;
  authorizedPeople: string | null; restrictions: string | null; containsPersonalData: boolean; references: SourceReference[];
};
type ResponseData = { sources: Source[] };
type GridRow = {
  id: string; sourceId: string; name: string; kind: SourceKind; description: string;
  link: string; location: string; access: string; retention: string; validUntil: string;
  authorizedPeople: string; restrictions: string; containsPersonalData: boolean; references: SourceReference[];
  processCount: number; elementCount: number;
};

const kindLabels: Record<SourceKind, string> = { file: 'Fichier', database: 'Base de données', application: 'Application' };
const kindIcon = (kind: SourceKind) => {
  if (kind === 'database') return <StorageRounded fontSize="small" />;
  if (kind === 'application') return <AppsRounded fontSize="small" />;
  return <DescriptionOutlined fontSize="small" />;
};

export const ProjectDocumentedSources = ({ projectId, canManage }: { projectId: string; canManage: boolean }) => {
  const navigate = useNavigate();
  const [selectedDetail, setSelectedDetail] = useState<GridRow | null>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<GridRow | null>(null);
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [mergeName, setMergeName] = useState('');
  const [mergeDescription, setMergeDescription] = useState('');
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const queryKey = ['project-documented-sources', projectId];
  const query = useQuery<ResponseData>(queryKey, () => apiClient.get(`/projects/${projectId}/documented-sources`), { enabled: Boolean(projectId) });
  const data = query.data;
  const rows = useMemo<GridRow[]>(() => (data?.sources ?? []).map(source => ({
    id: source.id, sourceId: source.id,
    kind: source.kind === 'form' ? 'file' : source.kind,
    name: source.name, description: source.description ?? '',
    link: source.link ?? '', location: source.location ?? '', access: source.access ?? '',
    retention: source.retention ?? '', validUntil: source.validUntil ?? '', authorizedPeople: source.authorizedPeople ?? '', restrictions: source.restrictions ?? '',
    containsPersonalData: source.containsPersonalData ?? false, references: source.references ?? [],
    processCount: new Set((source.references ?? []).map(reference => reference.resourceId)).size,
    elementCount: (source.references ?? []).length,
  })), [data?.sources]);

  const refresh = async () => {
    await queryClient.invalidateQueries(queryKey);
  };

  const saveCell = async (event: CellValueChangedEvent<GridRow>) => {
    const row = event.data;
    if (!row?.sourceId || !canManage || event.newValue === event.oldValue) return;
    const fieldMap: Record<string, string> = { kind: 'kind', name: 'name', description: 'description', link: 'link', location: 'location', access: 'access', retention: 'retention', validUntil: 'validUntil', authorizedPeople: 'authorizedPeople', restrictions: 'restrictions', containsPersonalData: 'containsPersonalData' };
    const field = fieldMap[String(event.colDef.field ?? '')];
    if (!field) return;
    try {
      await apiClient.put(`/projects/${projectId}/documented-sources/${row.sourceId}`, { [field]: event.newValue });
      await refresh();
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
      await refresh();
    }
  };

  const columns: ColDef<GridRow>[] = [
    { headerName: 'Nom', field: 'name', minWidth: 220, editable: canManage },
    { headerName: 'Type', field: 'kind', minWidth: 145, editable: canManage, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['file', 'database', 'application'] }, valueFormatter: p => kindLabels[p.value as SourceKind] ?? '', cellRenderer: (p: { value?: SourceKind }) => p.value ? <Stack direction="row" spacing={0.75} alignItems="center">{kindIcon(p.value)}<span>{kindLabels[p.value]}</span></Stack> : null },
    { headerName: 'Description', field: 'description', minWidth: 220, editable: canManage },
    { headerName: 'Processus', field: 'processCount', minWidth: 105, cellDataType: 'number' },
    { headerName: 'Éléments BPMN', field: 'elementCount', minWidth: 125, cellDataType: 'number' },
    { headerName: 'Lien', field: 'link', minWidth: 170, editable: canManage },
    { headerName: 'Emplacement', field: 'location', minWidth: 150, editable: canManage, hide: true },
    { headerName: 'Accès', field: 'access', minWidth: 140, editable: canManage, hide: true },
    { headerName: 'Durée de conservation', field: 'retention', minWidth: 180, editable: canManage, hide: true },
    { headerName: 'Date limite de validité', field: 'validUntil', minWidth: 175, editable: canManage, hide: true, cellEditor: 'agDateStringCellEditor', valueFormatter: p => p.value || 'Illimitée' },
    { headerName: 'Données personnelles', field: 'containsPersonalData', minWidth: 175, editable: canManage, hide: true, cellDataType: 'boolean', cellRenderer: 'agCheckboxCellRenderer', cellEditor: 'agCheckboxCellEditor' },
    { headerName: 'Personnes autorisées', field: 'authorizedPeople', minWidth: 190, editable: canManage, hide: true },
    { headerName: 'Restrictions', field: 'restrictions', minWidth: 190, editable: canManage, hide: true },
    { headerName: 'Actions', minWidth: 130, sortable: false, filter: false, cellRenderer: (p: { data?: GridRow }) => p.data && canManage && p.data.references.length === 0 ? <Button size="sm" variant="plain" color="danger" startDecorator={<DeleteOutlineRounded />} onClick={() => setPendingDelete(p.data!)}>Supprimer</Button> : null },
  ];

  if (query.isLoading) return <Typography level="body-sm" color="neutral">Chargement des informations documentées…</Typography>;
  if (query.isError) return <Alert color="danger">Impossible de charger le référentiel des informations documentées.</Alert>;

  return <Stack spacing={1.25} sx={{ minWidth: 0 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
      <Box><Typography level="title-lg">Référentiel des informations documentées</Typography><Typography level="body-sm" color="neutral">Toutes les informations documentées du projet, qu’elles soient associées ou non à un processus ou à un élément BPMN.</Typography></Box>
      {canManage && selectedMergeIds.length >= 2 && <Button size="sm" variant="outlined" onClick={() => { const selected = rows.filter(row => selectedMergeIds.includes(row.sourceId)); setMergeName(selected[0]?.name ?? ''); setMergeDescription(selected[0]?.description ?? ''); setMergeDialogOpen(true); }}>Fusionner ({selectedMergeIds.length})</Button>}
    </Stack>
    {error && <Alert color="danger" variant="soft">{error}</Alert>}
    <DocumentedSourcesGrid<GridRow>
      rowData={rows} columnDefs={columns} getRowId={row => row.id}
      preferenceKey={'project-documented-sources-' + projectId}
      mode={canManage ? 'edit' : 'read'} selection={canManage ? 'multiple' : 'single'} advancedFilter
      height={560} onCellValueChanged={saveCell} onRowSelected={row => setSelectedDetail(row)}
      onSelectionChanged={selected => setSelectedMergeIds(selected.map(row => row.sourceId))}
    />
    <Modal open={Boolean(selectedDetail)} onClose={() => setSelectedDetail(null)}>
      <ModalDialog sx={{ width: 'min(900px, calc(100vw - 32px))', maxHeight: '85vh', overflow: 'auto' }}>
        <Typography level="title-lg">{selectedDetail?.name}</Typography>
        <Typography level="body-sm" color="neutral">Associations BPMN de cette fiche documentaire. Chaque association est indépendante.</Typography>
        <DocumentedSourcesGrid<SourceReference>
          rowData={selectedDetail?.references ?? []}
          columnDefs={[
            { headerName: 'Processus', field: 'processName', minWidth: 180 },
            { headerName: 'Élément BPMN', field: 'elementName', minWidth: 220 },
            { headerName: 'Type', field: 'elementType', minWidth: 150, valueFormatter: p => p.value === 'dataStoreReference' ? 'Data Store' : 'Data Object' },
            { headerName: 'Ouvrir', minWidth: 130, sortable: false, filter: false, cellRenderer: (p: { data?: SourceReference }) => p.data ? <Button size="sm" variant="plain" onClick={() => { navigate('/' + p.data!.resourceId + '?elementId=' + encodeURIComponent(p.data!.elementId)); setSelectedDetail(null); }}>Voir le processus</Button> : null },
          ]}
          getRowId={row => row.id} preferenceKey={'project-documented-source-associations-' + (selectedDetail?.id ?? 'none')}
          mode="read" selection={false} advancedFilter={false} height={320}
        />
        <Stack direction="row" justifyContent="flex-end"><Button variant="outlined" color="neutral" onClick={() => setSelectedDetail(null)}>Fermer</Button></Stack>
      </ModalDialog>
    </Modal>
    <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
      <ModalDialog>
        <Typography level="title-lg">Confirmer la suppression</Typography>
        <Typography>Supprimer définitivement « {pendingDelete?.name} » ?</Typography>
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button variant="outlined" color="neutral" onClick={() => setPendingDelete(null)}>Annuler</Button>
          <Button color="danger" onClick={async () => {
            if (!pendingDelete) return;
            try { await apiClient.remove(`/projects/${projectId}/documented-sources/${pendingDelete.sourceId}`); await refresh(); setError(''); setPendingDelete(null); }
            catch (e) { setError(e instanceof Error ? e.message : 'Suppression impossible.'); }
          }}>Supprimer</Button>
        </Stack>
      </ModalDialog>
    </Modal>
    <Modal open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)}>
      <ModalDialog sx={{ width: 'min(560px, calc(100vw - 32px))' }}>
        <Typography level="title-lg">Fusionner les informations documentées</Typography>
        <Typography level="body-sm" color="neutral">Les {selectedMergeIds.length} lignes sélectionnées seront regroupées en une seule information documentée. Toutes les associations BPMN seront conservées.</Typography>
        <Stack spacing={1.5}>
          <FormControl required><FormLabel>Nom de l’information fusionnée</FormLabel><Input value={mergeName} onChange={event => setMergeName(event.target.value)} /></FormControl>
          <FormControl><FormLabel>Description de l’information fusionnée</FormLabel><Input value={mergeDescription} onChange={event => setMergeDescription(event.target.value)} /></FormControl>
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button variant="outlined" color="neutral" onClick={() => setMergeDialogOpen(false)}>Annuler</Button>
            <Button disabled={!mergeName.trim() || selectedMergeIds.length < 2} onClick={async () => {
              const selected = rows.filter(row => selectedMergeIds.includes(row.sourceId));
              if (selected.length < 2) return;
              const target = selected[0];
              try {
                for (const source of selected.slice(1)) {
                  await apiClient.post(`/projects/${projectId}/documented-sources/${source.sourceId}/merge`, { targetSourceId: target.sourceId, name: mergeName.trim(), description: mergeDescription });
                }
                await refresh(); setError(''); setSelectedMergeIds([]); setMergeDialogOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Fusion impossible. Les fusions déjà effectuées ont été conservées.');
                await refresh();
              }
            }}>Fusionner les éléments</Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>

  </Stack>;
};
