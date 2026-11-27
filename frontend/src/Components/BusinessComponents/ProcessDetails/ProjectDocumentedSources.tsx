import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, FormControl, FormLabel, Input, Modal, ModalDialog, Option, Select, Stack, Typography } from '@mui/joy';
import { AppsRounded, DeleteOutlineRounded, DescriptionOutlined, StorageRounded } from '@mui/icons-material';
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { DocumentedSourcesGrid } from './DocumentedSourcesGrid';
import { apiClient } from '../../../queryClient';

type SourceKind = 'file' | 'database' | 'application';
type SourceReference = { id: string; resourceId: string; elementId: string; elementName: string; elementType: string; processName: string };
type Source = {
  id: string; processName?: string | null; processes?: { resourceId: string; processName: string }[]; kind: SourceKind | 'form'; name: string; description: string | null; link: string | null;
  location: string | null; access: string | null; retention: string | null; validUntil: string | null;
  authorizedPeople: string | null; restrictions: string | null; containsPersonalData: boolean; references: SourceReference[];
};
type UnlinkedReference = { resourceId: string; processName: string; elementId: string; elementName: string; elementType: string; description?: string; link?: string; location?: string; access?: string; retention?: string; authorizedPeople?: string; restrictions?: string };
type ResponseData = { sources: Source[]; unlinkedReferences: UnlinkedReference[]; processes: { resourceId: string; processName: string }[] };
type GridRow = {
  id: string; sourceId: string; name: string; kind: SourceKind; description: string; references: SourceReference[]; processes: { resourceId: string; processName: string }[];
  link: string; location: string; access: string; retention: string; validUntil: string;
  authorizedPeople: string; restrictions: string; containsPersonalData: boolean;
};

const kindLabels: Record<SourceKind, string> = { file: 'Fichier', database: 'Base de données', application: 'Application' };
const objectIcon = (type: string) => type === 'dataStoreReference' ? <StorageRounded fontSize="small" /> : <DescriptionOutlined fontSize="small" />;
const kindIcon = (kind: SourceKind) => {
  if (kind === 'database') return <StorageRounded fontSize="small" />;
  if (kind === 'application') return <AppsRounded fontSize="small" />;
  return <DescriptionOutlined fontSize="small" />;
};

export const ProjectDocumentedSources = ({ projectId, canManage }: { projectId: string; canManage: boolean }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SourceKind>('file');
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
    processes: source.processes ?? [],
    kind: source.kind === 'form' ? 'file' : source.kind,
    name: source.name, description: source.description ?? '', references: source.references ?? [],
    link: source.link ?? '', location: source.location ?? '', access: source.access ?? '',
    retention: source.retention ?? '', validUntil: source.validUntil ?? '', authorizedPeople: source.authorizedPeople ?? '', restrictions: source.restrictions ?? '',
    containsPersonalData: source.containsPersonalData ?? false,
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

  const addSource = async () => {
    if (!newName.trim()) return;
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources`, {
        name: newName.trim(),
        kind: newKind,
      });
      setAdding(false);
      setNewName('');
      setNewKind('file');
      setError('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible.');
    }
  };

  const columns: ColDef<GridRow>[] = [
    { headerName: 'Nom', field: 'name', minWidth: 220, editable: canManage },
    {
      headerName: 'Processus',
      minWidth: 260,
      sortable: false,
      editable: false,
      autoHeight: true,
      cellRenderer: (p: { data?: GridRow }) => p.data ? (
        <Stack spacing={0.5}>
          {p.data.processes.map(process => (
            <Stack key={process.resourceId} direction="row" spacing={0.5} alignItems="center">
              <Button size="sm" variant="plain" color="neutral" sx={{ flex: 1, justifyContent: 'flex-start' }} onClick={() => navigate(`/${process.resourceId}`)}>{process.processName}</Button>
              {canManage && !p.data!.references.some(reference => reference.resourceId === process.resourceId) && (
                <Button size="sm" variant="plain" color="danger" onClick={async () => {
                  try {
                    await apiClient.remove(`/projects/${projectId}/documented-sources/${p.data!.sourceId}/processes/${process.resourceId}`);
                    await refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Impossible de retirer ce processus.');
                  }
                }}>Retirer</Button>
              )}
            </Stack>
          ))}
          {canManage && (data?.processes ?? []).some(process => !p.data!.processes.some(current => current.resourceId === process.resourceId)) && (
            <Select size="sm" placeholder="Ajouter à un processus…" value={null} onChange={async (_, value) => {
              if (typeof value !== 'string' || !value) return;
              try {
                await apiClient.post(`/projects/${projectId}/documented-sources/${p.data!.sourceId}/processes`, { resourceId: value });
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Impossible d’ajouter cette information au processus.');
              }
            }}>
              {(data?.processes ?? []).filter(process => !p.data!.processes.some(current => current.resourceId === process.resourceId)).map(process => (
                <Option key={process.resourceId} value={process.resourceId}>{process.processName}</Option>
              ))}
            </Select>
          )}
          {p.data.processes.length === 0 && <Typography level="body-xs" color="neutral">Aucun processus</Typography>}
        </Stack>
      ) : null,
    },
    { headerName: 'Type', field: 'kind', minWidth: 145, editable: canManage, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['file', 'database', 'application'] }, valueFormatter: p => kindLabels[p.value as SourceKind] ?? '', cellRenderer: (p: { value?: SourceKind }) => p.value ? <Stack direction="row" spacing={0.75} alignItems="center">{kindIcon(p.value)}<span>{kindLabels[p.value]}</span></Stack> : null },
    { headerName: 'Description', field: 'description', minWidth: 220, editable: canManage },
    {
      headerName: 'Objet BPMN',
      minWidth: 300,
      editable: false,
      autoHeight: true,
      cellRenderer: (p: { data?: GridRow }) => p.data ? (
        <Stack spacing={0.5}>
          {p.data.references.length ? p.data.references.map(ref => (
            <Stack key={ref.id} spacing={0.25}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Button
                  size="sm"
                  variant="plain"
                  color="neutral"
                  startDecorator={objectIcon(ref.elementType)}
                  sx={{ justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left', flex: 1 }}
                  onClick={() => navigate(`/${ref.resourceId}?elementId=${encodeURIComponent(ref.elementId)}`)}
                >
                  {ref.elementName} <Typography level="body-xs" color="neutral">— {ref.processName}</Typography>
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="plain"
                    color="danger"
                    onClick={async () => {
                      try {
                        await apiClient.remove(`/projects/${projectId}/documented-sources/${p.data!.sourceId}/references/${ref.id}`);
                        await refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Impossible de délier cet objet BPMN.');
                      }
                    }}
                  >
                    Délier
                  </Button>
                )}
              </Stack>
              {canManage && (data?.sources ?? []).some(source => source.id !== p.data!.sourceId) && (
                <Select
                  size="sm"
                  value={null}
                  placeholder="Rattacher à une fiche existante…"
                  onChange={async (_, value) => {
                    if (typeof value !== 'string' || !value) return;
                    try {
                      await apiClient.put(
                        `/projects/${projectId}/documented-sources/${p.data!.sourceId}/references/${ref.id}`,
                        { targetSourceId: value },
                      );
                      await refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Impossible de rattacher cet objet à cette information documentée.');
                    }
                  }}
                >
                  {(data?.sources ?? [])
                    .filter(source => source.id !== p.data!.sourceId)
                    .map(source => (
                      <Option key={source.id} value={source.id}>{source.name}</Option>
                    ))}
                </Select>
              )}
            </Stack>
          )) : <Typography level="body-sm" color="neutral">Non associé</Typography>}
          {canManage && (data?.unlinkedReferences ?? []).some(candidate => !p.data!.references.some(ref => ref.resourceId === candidate.resourceId && ref.elementId === candidate.elementId)) && (
            <Select
              size="sm"
              placeholder="Associer un objet BPMN du projet…"
              value={null}
              onChange={async (_, value) => {
                const candidate = (data?.unlinkedReferences ?? []).find(item => `${item.resourceId}:${item.elementId}` === value);
                if (!candidate) return;
                try {
                  await apiClient.post(`/projects/${projectId}/documented-sources/${p.data!.sourceId}/references`, {
                    resourceId: candidate.resourceId,
                    elementId: candidate.elementId,
                    elementName: candidate.elementName,
                    elementType: candidate.elementType,
                  });
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Impossible d’associer cet objet BPMN.');
                }
              }}
            >
              <Option value="" disabled>Choisir un objet BPMN</Option>
              {(data?.unlinkedReferences ?? [])
                .filter(candidate => !p.data!.references.some(ref => ref.resourceId === candidate.resourceId && ref.elementId === candidate.elementId))
                .map(candidate => (
                  <Option key={`${candidate.resourceId}:${candidate.elementId}`} value={`${candidate.resourceId}:${candidate.elementId}`}>
                    {candidate.elementName} — {candidate.processName}
                  </Option>
                ))}
            </Select>
          )}
        </Stack>
      ) : null,
    },
    { headerName: 'Lien', field: 'link', minWidth: 170, editable: canManage },
    { headerName: 'Emplacement', field: 'location', minWidth: 150, editable: canManage },
    { headerName: 'Accès', field: 'access', minWidth: 140, editable: canManage },
    { headerName: 'Durée de conservation', field: 'retention', minWidth: 180, editable: canManage },
    { headerName: 'Date limite de validité', field: 'validUntil', minWidth: 175, editable: canManage, cellEditor: 'agDateStringCellEditor', valueFormatter: p => p.value || 'Illimitée' },
    { headerName: 'Données personnelles', field: 'containsPersonalData', minWidth: 175, editable: canManage, cellDataType: 'boolean', cellRenderer: 'agCheckboxCellRenderer', cellEditor: 'agCheckboxCellEditor' },
    { headerName: 'Personnes autorisées', field: 'authorizedPeople', minWidth: 190, editable: canManage },
    { headerName: 'Restrictions', field: 'restrictions', minWidth: 190, editable: canManage },
    { headerName: 'Actions', minWidth: 130, sortable: false, filter: false, cellRenderer: (p: { data?: GridRow }) => p.data && canManage && p.data.references.length === 0 ? <Button size="sm" variant="plain" color="danger" startDecorator={<DeleteOutlineRounded />} onClick={() => setPendingDelete(p.data!)}>Supprimer</Button> : null },
  ];

  if (query.isLoading) return <Typography level="body-sm" color="neutral">Chargement des informations documentées…</Typography>;
  if (query.isError) return <Alert color="danger">Impossible de charger le référentiel des informations documentées.</Alert>;

  return <Stack spacing={1.25} sx={{ minWidth: 0 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
      <Box><Typography level="title-lg">Informations documentées</Typography><Typography level="body-sm" color="neutral">Référentiel documentaire central du projet, lié aux objets et magasins de données BPMN.</Typography></Box>
      {canManage && <Stack direction="row" spacing={1}>
        <Button size="sm" onClick={() => setAdding(true)}>Ajouter une information documentée</Button>
        {selectedMergeIds.length >= 2 && <Button size="sm" variant="outlined" onClick={() => { const selected = rows.filter(row => selectedMergeIds.includes(row.sourceId)); setMergeName(selected[0]?.name ?? ''); setMergeDescription(selected[0]?.description ?? ''); setMergeDialogOpen(true); }}>Fusionner ({selectedMergeIds.length})</Button>}
      </Stack>}
    </Stack>
    {error && <Alert color="danger" variant="soft">{error}</Alert>}
    <DocumentedSourcesGrid<GridRow> rowData={rows} columnDefs={columns} getRowId={row => row.id} height={560} onCellValueChanged={saveCell} multiSelect={canManage} onSelectionChanged={selected => setSelectedMergeIds(selected.map(row => row.sourceId))} />
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
    <Modal open={adding} onClose={() => setAdding(false)}>
      <ModalDialog sx={{ width: 'min(560px, calc(100vw - 32px))' }}>
        <Typography level="title-lg">Ajouter une information documentée</Typography>
        <Stack spacing={1.5}>
          <FormControl required><FormLabel>Nom</FormLabel><Input value={newName} onChange={e => setNewName(e.target.value)} /></FormControl>
          <FormControl><FormLabel>Type</FormLabel><Select value={newKind} onChange={(_, value) => value && setNewKind(value as SourceKind)}><Option value="file">Fichier</Option><Option value="database">Base de données</Option><Option value="application">Application</Option></Select></FormControl>
          <Stack direction="row" justifyContent="flex-end" spacing={1}><Button variant="outlined" color="neutral" onClick={() => setAdding(false)}>Annuler</Button><Button onClick={() => void addSource()} disabled={!newName.trim()}>Créer</Button></Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  </Stack>;
};
