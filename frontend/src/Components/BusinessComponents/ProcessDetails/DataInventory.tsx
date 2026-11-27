import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, FormControl, FormLabel, IconButton, Input, Modal, ModalDialog, Option, Select, Stack, Textarea, Typography } from '@mui/joy';
import {
  AppsOutlined,
  AttachFileOutlined,
  DeleteOutlineOutlined,
  LinkOffOutlined,
  StorageOutlined,
} from '@mui/icons-material';
import type { ColDef, ICellRendererParams, NewValueParams } from 'ag-grid-community';
import { DocumentedSourcesGrid } from './DocumentedSourcesGrid';
import { apiClient } from '../../../queryClient';

type SourceKind = 'file' | 'database' | 'application';
type BpmnDataType = 'dataObjectReference' | 'dataStoreReference';

type SourceReference = {
  id: string;
  resourceId: string;
  elementId: string;
  elementName: string;
  elementType: BpmnDataType;
  processName: string;
  bpmnDescription: string;
};

type ProjectDocumentedSource = {
  id: string;
  resourceId?: string | null;
  processName?: string | null;
  kind: SourceKind | 'form';
  name: string;
  description: string | null;
  link: string | null;
  location: string | null;
  access: string | null;
  retention?: string | null;
  validUntil: string | null;
  containsPersonalData: boolean;
  authorizedPeople: string | null;
  restrictions: string | null;
  references: SourceReference[];
};

type UnlinkedBpmnReference = {
  resourceId: string;
  processName: string;
  elementId: string;
  elementName: string;
  elementType: BpmnDataType;
  bpmnDescription?: string;
  link?: string;
  location?: string;
  access?: string;
  retention?: string;
  authorizedPeople?: string;
  restrictions?: string;
};

type ProjectDocumentedSourcesResponse = {
  sources: ProjectDocumentedSource[];
  unlinkedReferences: UnlinkedBpmnReference[];
};

type InventoryGridRow = ProjectDocumentedSource & {
  origin: string;
};

type Props = {
  xmlContent?: string;
  canEdit: boolean;
  projectId?: string | null;
  resourceId: string;
  requestedDocumentedSourceId?: string | null;
  requestedElementId?: string | null;
  canManageSources?: boolean;
  onElementSelect?: (elementId: string) => void;
  onShowDiagram?: () => void;
  onSaveBpmnDescription?: (elementId: string, description: string) => Promise<void>;
};

const isSupportedBpmnDataType = (type: string) => type === 'dataObjectReference' || type === 'dataStoreReference';

const normalizeKind = (kind: ProjectDocumentedSource['kind']): SourceKind => {
  if (kind === 'database') return 'database';
  if (kind === 'application' || kind === 'form') return 'application';
  return 'file';
};

const KindIcon = ({ kind }: { kind: SourceKind }) => {
  if (kind === 'database') return <StorageOutlined />;
  if (kind === 'application') return <AppsOutlined />;
  return <AttachFileOutlined />;
};

const BpmnDataSymbol = ({ type }: { type: BpmnDataType }) => (
  <svg width="30" height="32" viewBox="0 0 34 38" role="img" aria-label={type === 'dataStoreReference' ? 'Base de données BPMN' : 'Objet de données BPMN'}>
    {type === 'dataStoreReference'
      ? <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 8 C5 3 29 3 29 8 L29 29 C29 34 5 34 5 29 Z" /><path d="M5 8 C5 13 29 13 29 8 M5 29 C5 24 29 24 29 29" /></g>
      : <g fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3 H22 L29 10 V34 H6 Z" /><path d="M22 3 V10 H29" /></g>}
  </svg>
);

export const DataInventory = ({
  projectId,
  resourceId,
  requestedDocumentedSourceId,
  canManageSources = false,
  onElementSelect,
  onShowDiagram,
  onSaveBpmnDescription,
}: Props) => {
  const queryClient = useQueryClient();
  const [sources, setSources] = useState<ProjectDocumentedSource[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [associatingId, setAssociatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ProjectDocumentedSource | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SourceKind>('file');

  const projectSourcesQuery = useQuery<ProjectDocumentedSourcesResponse>(
    ['project-documented-sources', projectId, resourceId],
    () => apiClient.get(`/projects/${projectId}/documented-sources?resourceId=${encodeURIComponent(resourceId)}`),
    { enabled: Boolean(projectId), refetchOnMount: 'always' },
  );
  const projectSources = projectSourcesQuery.data?.sources ?? [];
  const unlinkedReferences = useMemo(
    () => (projectSourcesQuery.data?.unlinkedReferences ?? []).filter(reference => reference.resourceId === resourceId && isSupportedBpmnDataType(reference.elementType)),
    [projectSourcesQuery.data?.unlinkedReferences, resourceId],
  );

  useEffect(() => {
    setSources(projectSources.map(source => ({
      ...source,
      kind: normalizeKind(source.kind),
      validUntil: source.validUntil ?? null,
      containsPersonalData: source.containsPersonalData ?? false,
      references: source.references ?? [],
    })));
  }, [projectSourcesQuery.data]);


  const refresh = async () => {
    if (projectId) await queryClient.invalidateQueries(['project-documented-sources', projectId, resourceId]);
  };

  const updateRow = (id: string, field: keyof ProjectDocumentedSource, value: string | null | boolean) => {
    setSources(current => current.map(source => source.id === id ? { ...source, [field]: value } : source));
  };

  const saveRow = async (row: ProjectDocumentedSource) => {
    if (!projectId || !canManageSources || savingId) return;
    if (!row.name.trim()) return;
    setSavingId(row.id);
    setError('');
    const payload = {
      resourceId,
      kind: normalizeKind(row.kind),
      name: row.name.trim(),
      description: row.description ?? '',
      link: row.link ?? '',
      location: row.location ?? '',
      access: row.access ?? '',
      retention: row.retention ?? '',
      validUntil: row.validUntil || null,
      containsPersonalData: row.containsPersonalData,
      authorizedPeople: row.authorizedPeople ?? '',
      restrictions: row.restrictions ?? '',
    };
    try {
      await apiClient.put(`/projects/${projectId}/documented-sources/${row.id}`, payload);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer cette information documentée.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCellChange = async (
    params: NewValueParams<InventoryGridRow>,
    field: keyof ProjectDocumentedSource,
  ) => {
    if (!params.data) return;
    let value: string | null | boolean;
    if (field === 'containsPersonalData') {
      value = Boolean(params.newValue);
    } else if (field === 'validUntil') {
      value = String(params.newValue ?? '').trim() || null;
    } else {
      value = String(params.newValue ?? '');
    }
    const updated = { ...params.data, [field]: value };
    updateRow(params.data.id, field, value);
    await saveRow(updated);
  };

  const addSource = async () => {
    if (!projectId || !canManageSources || !newName.trim()) return;
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources`, {
        resourceId,
        name: newName.trim(),
        kind: newKind,
      });
      setAdding(false);
      setNewName('');
      setNewKind('file');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer cette information documentée.');
    }
  };

  const associate = async (row: ProjectDocumentedSource, elementId: string) => {
    if (!projectId || !canManageSources || associatingId) return;
    const reference = unlinkedReferences.find(item => item.elementId === elementId);
    if (!reference) return;
    setAssociatingId(row.id);
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources/${row.id}/references`, {
        resourceId: reference.resourceId,
        elementId: reference.elementId,
        elementName: reference.elementName,
        elementType: reference.elementType,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’associer cet objet BPMN.');
    } finally {
      setAssociatingId(null);
    }
  };

  const removeFromProcess = async (row: ProjectDocumentedSource) => {
    if (!projectId || !canManageSources || row.references.length > 0) return;
    setError('');
    try {
      await apiClient.remove(`/projects/${projectId}/documented-sources/${row.id}/processes/${resourceId}`);
      await refresh();
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de retirer cette information de ce processus.');
    }
  };

  const unlink = async (row: ProjectDocumentedSource, reference: SourceReference) => {
    if (!projectId || !canManageSources || associatingId) return;
    setAssociatingId(row.id);
    setError('');
    try {
      await apiClient.remove(`/projects/${projectId}/documented-sources/${row.id}/references/${reference.id}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de supprimer cette association BPMN.');
    } finally {
      setAssociatingId(null);
    }
  };

  const rows: InventoryGridRow[] = sources.map(source => ({
    ...source,
    origin: source.processName ?? 'Processus',
  }));

  const textColumn = (
    field: 'name' | 'description' | 'link' | 'location' | 'access' | 'retention' | 'authorizedPeople' | 'restrictions',
    headerName: string,
    minWidth: number,
  ): ColDef<InventoryGridRow> => ({
    headerName,
    field,
    minWidth,
    editable: canManageSources && !savingId,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    onCellValueChanged: (params: NewValueParams<InventoryGridRow>) => {
      void handleCellChange(params, field);
    },
  });

  const columnDefs: ColDef<InventoryGridRow>[] = [
    textColumn('name', 'Nom', 220),
    { headerName: 'Origine', field: 'origin', minWidth: 120, editable: false },
    {
      headerName: 'Type',
      field: 'kind',
      minWidth: 150,
      editable: canManageSources && !savingId,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['file', 'database', 'application'] },
      valueFormatter: params => ({
        file: 'Fichier',
        database: 'Base de données',
        application: 'Application',
      }[normalizeKind(params.value)]),
      cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => params.data ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <KindIcon kind={normalizeKind(params.data.kind)} />
          <Typography level="body-sm">{({
            file: 'Fichier',
            database: 'Base de données',
            application: 'Application',
          }[normalizeKind(params.data.kind)])}</Typography>
        </Stack>
      ) : null,
      onCellValueChanged: (params: NewValueParams<InventoryGridRow>) => {
        void handleCellChange(params, 'kind');
      },
    },
    textColumn('description', 'Description', 240),
    {
      headerName: 'Description BPMN',
      minWidth: 280,
      sortable: false,
      editable: false,
      autoHeight: true,
      cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => {
        const row = params.data;
        if (!row) return null;
        const references = row.references.filter(item => item.resourceId === resourceId);
        if (!references.length) return <Typography level="body-sm" color="neutral">—</Typography>;
        return (
          <Stack spacing={1} sx={{ py: 0.5 }}>
            {references.map(reference => (
              <Box key={reference.id}>
                <Typography level="body-xs" color="neutral">{reference.elementName}</Typography>
                <Textarea
                  size="sm"
                  minRows={1}
                  maxRows={4}
                  value={reference.bpmnDescription ?? ''}
                  disabled={!canManageSources || !onSaveBpmnDescription}
                  onChange={event => {
                    const value = event.target.value;
                    setSources(current => current.map(source => source.id !== row.id ? source : ({
                      ...source,
                      references: source.references.map(item => item.id === reference.id ? { ...item, bpmnDescription: value } : item),
                    })));
                  }}
                  onBlur={event => {
                    const value = event.target.value;
                    if (value !== (reference.bpmnDescription ?? '')) {
                      void onSaveBpmnDescription?.(reference.elementId, value).then(refresh).catch(error => {
                        setError(error instanceof Error ? error.message : 'Impossible d’enregistrer la description BPMN.');
                        void refresh();
                      });
                    }
                  }}
                  aria-label={`Description BPMN de ${reference.elementName}`}
                />
              </Box>
            ))}
          </Stack>
        );
      },
    },
    {
      headerName: 'Données personnelles',
      field: 'containsPersonalData',
      minWidth: 175,
      editable: canManageSources && !savingId,
      cellDataType: 'boolean',
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      tooltipValueGetter: params => params.value
        ? 'La source contient des données personnelles'
        : 'La source ne contient pas de données personnelles',
      onCellValueChanged: (params: NewValueParams<InventoryGridRow>) => {
        void handleCellChange(params, 'containsPersonalData');
      },
    },
    {
      headerName: 'Association BPMN',
      minWidth: 240,
      sortable: false,
      cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => {
        const row = params.data;
        if (!row) return null;
        const references = row.references.filter(item => item.resourceId === resourceId);
        return (
          <Stack spacing={0.5}>
            {references.length === 0 && <Typography level="body-sm" color="neutral">Non associé</Typography>}
            {references.map(reference => (
              <Stack key={reference.id} direction="row" spacing={0.5} alignItems="center">
                <IconButton
                  size="sm"
                  variant="plain"
                  color="primary"
                  title="Ouvrir l’élément BPMN associé"
                  aria-label={`Ouvrir ${reference.elementName} dans le diagramme BPMN`}
                  onClick={event => {
                    event.stopPropagation();
                    onShowDiagram?.();
                    onElementSelect?.(reference.elementId);
                  }}
                >
                  <BpmnDataSymbol type={reference.elementType} />
                </IconButton>
                <Button
                  size="sm"
                  variant="plain"
                  color="primary"
                  sx={{ flex: 1, justifyContent: 'flex-start', minWidth: 0, px: 0.5, textAlign: 'left' }}
                  title="Ouvrir cet objet dans le diagramme BPMN"
                  onClick={event => {
                    event.stopPropagation();
                    onShowDiagram?.();
                    onElementSelect?.(reference.elementId);
                  }}
                >
                  {reference.elementName}
                </Button>
                {canManageSources && (
                  <IconButton
                    size="sm"
                    variant="plain"
                    color="danger"
                    title="Supprimer l’association BPMN"
                    aria-label="Supprimer l’association BPMN"
                    disabled={associatingId === row.id}
                    onClick={event => {
                      event.stopPropagation();
                      void unlink(row, reference);
                    }}
                  >
                    <LinkOffOutlined />
                  </IconButton>
                )}
              </Stack>
            ))}
            {canManageSources && unlinkedReferences.length > 0 && (
              <Select
                size="sm"
                value={null}
                placeholder="Associer un Data Object / Data Store…"
                disabled={Boolean(associatingId)}
                onClick={event => event.stopPropagation()}
                onChange={(_, value) => { if (typeof value === 'string') void associate(row, value); }}
                aria-label="Associer un objet BPMN non encore associé"
              >
                {unlinkedReferences.map(item => (
                  <Option key={item.elementId} value={item.elementId}>
                    {item.elementName} — {item.elementType === 'dataStoreReference' ? 'Base de données' : 'Objet de données'}
                  </Option>
                ))}
              </Select>
            )}
          </Stack>
        );
      },
    },
    textColumn('link', 'Lien', 190),
    textColumn('location', 'Emplacement', 160),
    textColumn('access', 'Accès', 150),
    textColumn('retention', 'Durée de conservation', 190),
    {
      headerName: 'Date limite de validité',
      field: 'validUntil',
      minWidth: 175,
      editable: canManageSources && !savingId,
      cellEditor: 'agDateStringCellEditor',
      valueFormatter: params => params.value || 'Illimitée',
      tooltipValueGetter: params => params.value ? `Valable jusqu’au ${params.value}` : 'Validité sans limite de durée',
      onCellValueChanged: (params: NewValueParams<InventoryGridRow>) => {
        void handleCellChange(params, 'validUntil');
      },
    },
    textColumn('authorizedPeople', 'Personnes autorisées', 190),
    textColumn('restrictions', 'Restrictions', 200),
    {
      headerName: 'Actions',
      minWidth: 125,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => {
        const row = params.data;
        if (!row || !canManageSources || row.references.length > 0) return null;
        return (
          <IconButton size="sm" variant="plain" color="danger" title="Retirer cette information de ce processus" aria-label={`Retirer ${row.name} de ce processus`} onClick={event => {
            event.stopPropagation();
            setPendingDelete(row);
          }}>
            <DeleteOutlineOutlined />
          </IconButton>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography level="title-lg">Informations documentées</Typography>
            <Typography level="body-sm" color="neutral">
              Fiches utilisées par ce processus. Créez une fiche ici, puis associez-la si besoin à un Data Object ou un Data Store. Les fiches peuvent être réutilisées dans d’autres processus.
            </Typography>
          </Box>
          {canManageSources && <Button size="sm" onClick={() => setAdding(true)}>Créer une information documentée</Button>}
        </Stack>
        {error && <Alert color="danger" variant="soft">{error}</Alert>}
        {projectSourcesQuery.isError && (
          <Alert color="warning" variant="soft">
            Le référentiel documentaire du projet est momentanément indisponible.
          </Alert>
        )}
        {!projectId && (
          <Alert color="warning" variant="soft">
            Aucun projet actif : le référentiel des informations documentées n’est pas disponible.
          </Alert>
        )}
        <Modal open={adding} onClose={() => setAdding(false)}>
          <ModalDialog sx={{ width: 'min(520px, calc(100vw - 32px))' }}>
            <Typography level="title-lg">Créer une information documentée</Typography>
            <Typography level="body-sm" color="neutral">
              La fiche sera ajoutée au référentiel du projet et rattachée à ce processus. Son association à un élément BPMN est facultative.
            </Typography>
            <Stack spacing={1.5}>
              <FormControl required>
                <FormLabel>Nom de l’information</FormLabel>
                <Input value={newName} onChange={event => setNewName(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select value={newKind} onChange={(_, value) => value && setNewKind(value as SourceKind)}>
                  <Option value="file">Fichier / document</Option>
                  <Option value="database">Base de données</Option>
                  <Option value="application">Application</Option>
                </Select>
              </FormControl>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button variant="outlined" color="neutral" onClick={() => setAdding(false)}>Annuler</Button>
                <Button onClick={() => void addSource()} disabled={!newName.trim()}>Créer la fiche</Button>
              </Stack>
            </Stack>
          </ModalDialog>
        </Modal>
        <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
          <ModalDialog>
            <Typography level="title-lg">Confirmer la suppression</Typography>
            <Typography>Retirer « {pendingDelete?.name} » de ce processus ? (La fiche restera dans le référentiel du projet.)</Typography>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button variant="outlined" color="neutral" onClick={() => setPendingDelete(null)}>Annuler</Button>
              <Button color="danger" onClick={() => pendingDelete && void removeFromProcess(pendingDelete)}>Retirer</Button>
            </Stack>
          </ModalDialog>
        </Modal>
        <DocumentedSourcesGrid<InventoryGridRow>
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={row => row.id}
          selectedRowId={requestedDocumentedSourceId ?? undefined}
          height={560}
        />
        {unlinkedReferences.length > 0 && (
          <Typography level="body-xs" color="neutral">
            {unlinkedReferences.length} objet(s) BPMN disponible(s) pour une association dans ce processus.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
