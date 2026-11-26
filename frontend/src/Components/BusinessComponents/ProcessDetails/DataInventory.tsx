import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, IconButton, Modal, ModalDialog, Option, Select, Stack, Typography } from '@mui/joy';
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
};

type ProjectDocumentedSource = {
  id: string;
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
  description?: string;
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
  isNew?: boolean;
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
};

const emptySource = (id: string): ProjectDocumentedSource => ({
  id,
  kind: 'file',
  name: '',
  description: '',
  link: '',
  location: '',
  access: '',
  retention: '',
  validUntil: null,
  containsPersonalData: false,
  authorizedPeople: '',
  restrictions: '',
  references: [],
});

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
}: Props) => {
  const queryClient = useQueryClient();
  const [sources, setSources] = useState<ProjectDocumentedSource[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [associatingId, setAssociatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ProjectDocumentedSource | null>(null);

  const projectSourcesQuery = useQuery<ProjectDocumentedSourcesResponse>(
    ['project-documented-sources', projectId],
    () => apiClient.get(`/projects/${projectId}/documented-sources`),
    { enabled: Boolean(projectId), refetchOnMount: 'always' },
  );
  const projectSources = projectSourcesQuery.data?.sources ?? [];
  const unlinkedReferences = useMemo(
    () => (projectSourcesQuery.data?.unlinkedReferences ?? []).filter(reference => reference.resourceId === resourceId),
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
    if (projectId) await queryClient.invalidateQueries(['project-documented-sources', projectId]);
  };

  const updateRow = (id: string, field: keyof ProjectDocumentedSource, value: string | null | boolean) => {
    setSources(current => current.map(source => source.id === id ? { ...source, [field]: value } : source));
  };

  const saveRow = async (row: ProjectDocumentedSource) => {
    if (!projectId || !canManageSources || savingId) return;
    // A newly added row stays local until its required name is entered.
    if (!row.name.trim()) return;
    setSavingId(row.id);
    setError('');
    const payload = {
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
      if (row.id.startsWith('new-')) {
        await apiClient.post(`/projects/${projectId}/documented-sources`, payload);
      } else {
        await apiClient.put(`/projects/${projectId}/documented-sources/${row.id}`, payload);
      }
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

  const addRow = () => {
    const id = `new-${Date.now()}`;
    setSources(current => [...current, emptySource(id)]);
  };

  const associate = async (row: ProjectDocumentedSource, elementId: string) => {
    if (!projectId || !canManageSources || associatingId) return;
    if (row.id.startsWith('new-')) {
      setError('Enregistre d’abord l’information documentée avant de lui associer un objet BPMN.');
      return;
    }
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

  const deleteSource = async (row: ProjectDocumentedSource) => {
    if (!projectId || !canManageSources || row.references.length > 0) return;
        setError('');
    try {
      await apiClient.remove(`/projects/${projectId}/documented-sources/${row.id}`);
      await refresh();
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de supprimer cette information documentée.');
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
    origin: 'Projet',
    isNew: source.id.startsWith('new-'),
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
      headerName: 'Objet BPMN',
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
                placeholder="Associer un objet BPMN…"
                disabled={row.id.startsWith('new-') || Boolean(associatingId)}
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
        if (!row || !canManageSources || row.references.length > 0 || row.id.startsWith('new-')) return null;
        return (
          <IconButton size="sm" variant="plain" color="danger" title="Supprimer cette information documentée non associée" aria-label={`Supprimer ${row.name}`} onClick={event => {
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
              Référentiel des fichiers, bases de données et applications utilisés par le processus.
            </Typography>
          </Box>
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
        <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
          <ModalDialog>
            <Typography level="title-lg">Confirmer la suppression</Typography>
            <Typography>Supprimer définitivement « {pendingDelete?.name} » ?</Typography>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button variant="outlined" color="neutral" onClick={() => setPendingDelete(null)}>Annuler</Button>
              <Button color="danger" onClick={() => pendingDelete && void deleteSource(pendingDelete)}>Supprimer</Button>
            </Stack>
          </ModalDialog>
        </Modal>
        <DocumentedSourcesGrid<InventoryGridRow>
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={row => row.id}
          selectedRowId={requestedDocumentedSourceId ?? undefined}
          onAdd={canManageSources ? addRow : undefined}
          addLabel="Ajouter une ligne : information documentée"
          height={560}
        />

      </Stack>
    </Box>
  );
};
