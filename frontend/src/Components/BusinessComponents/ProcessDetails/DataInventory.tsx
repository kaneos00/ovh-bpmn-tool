import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, DialogActions, DialogContent, DialogTitle, Modal, ModalDialog, Option, Select, Stack, Typography } from '@mui/joy';
import { CenterFocusStrong, MergeType } from '@mui/icons-material';
import type { CellValueChangedEvent, ColDef, EditableCallbackParams, ICellRendererParams, ValueGetterParams, ValueFormatterParams } from 'ag-grid-community';
import { DocumentedSourcesGrid } from './DocumentedSourcesGrid';

import { apiClient } from '../../../queryClient';

type BpmnDataType = 'dataObjectReference' | 'dataStoreReference';
type SourceKind = 'file' | 'database' | 'application' | 'form';

export type InventorySource = {
  id: string;
  kind: SourceKind;
  bpmnType: BpmnDataType;
  associations: Array<{ taskId: string; taskName: string; direction: 'input' | 'output' }>;
  name: string;
  elementName: string;
  description: string;
  link: string;
  location: string;
  access: string;
  retention: string;
  authorizedPeople: string;
  restrictions: string;
};

type ProjectDocumentedSource = {
  id: string;
  kind: SourceKind;
  name: string;
  description: string | null;
  link: string | null;
  location: string | null;
  access: string | null;
  retention: string | null;
  authorizedPeople: string | null;
  restrictions: string | null;
  references: Array<{ id: string; resourceId: string; elementId: string; elementName: string; elementType: string; processName: string }>;
};

type ProjectDocumentedSourcesResponse = {
  sources: ProjectDocumentedSource[];
  unlinkedReferences: Array<{ resourceId: string; processName: string; elementId: string; elementName: string; elementType: string }>;
};

type InventoryGridRow = InventorySource & { associationsLabel: string; projectStatus: string };

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

const NS = 'https://ovh-bpmn-tool.local/schema/data-inventory';
const emptySource = (): InventorySource => ({
  id: '',
  kind: 'file',
  bpmnType: 'dataObjectReference',
  associations: [],
  name: '',
  elementName: '',
  description: '',
  link: '',
  location: '',
  access: '',
  retention: '',
  authorizedPeople: '',
  restrictions: '',
});

const activityTypes = new Set(['task','userTask','manualTask','serviceTask','scriptTask','businessRuleTask','sendTask','receiveTask','callActivity','subProcess','transaction']);
const dataTypes = new Set<BpmnDataType>(['dataObjectReference','dataStoreReference']);

const readSources = (xml?: string): InventorySource[] => {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];
  const elements = Array.from(doc.getElementsByTagName('*'));
  const byId = new Map<string, Element>();
  elements.forEach(node => { const id = node.getAttribute('id'); if (id) byId.set(id, node); });

  const links = new Map<string, InventorySource['associations']>();
  const add = (dataId: string, taskId: string, direction: 'input' | 'output') => {
    const task = byId.get(taskId);
    if (!dataId || !task || !activityTypes.has(task.localName)) return;
    const rows = links.get(dataId) ?? [];
    if (!rows.some(row => row.taskId === taskId && row.direction === direction)) rows.push({ taskId, taskName: task.getAttribute('name') || taskId, direction });
    links.set(dataId, rows);
  };
  elements.filter(n => ['dataInputAssociation','dataOutputAssociation'].includes(n.localName)).forEach(n => {
    const refs = Array.from(n.children).filter(c => ['sourceRef','targetRef'].includes(c.localName)).map(c => c.textContent?.trim() || '');
    refs.forEach(ref => add(ref, n.parentElement?.getAttribute('id') || '', n.localName === 'dataInputAssociation' ? 'input' : 'output'));
  });
  elements.filter(n => n.localName === 'association').forEach(n => {
    const sourceId = n.getAttribute('sourceRef') || '';
    const targetId = n.getAttribute('targetRef') || '';
    if (activityTypes.has(byId.get(sourceId)?.localName || '')) add(targetId, sourceId, 'output');
    if (activityTypes.has(byId.get(targetId)?.localName || '')) add(sourceId, targetId, 'input');
  });

  const getReferencedElement = (node?: Element | null) => {
    if (!node) return undefined;
    const referenceAttribute = node.localName === 'dataStoreReference' ? 'dataStoreRef' : 'dataObjectRef';
    const referenceId = node.getAttribute(referenceAttribute) || '';
    return referenceId ? byId.get(referenceId) : undefined;
  };
  const readDescription = (node?: Element | null) => {
    const candidates = [node, getReferencedElement(node)].filter(Boolean) as Element[];
    for (const candidate of candidates) {
      const value = Array.from(candidate.children)
        .filter(child => child.localName === 'documentation')
        .map(child => child.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n\n');
      if (value) return value;
    }
    return '';
  };
  const readLink = (node?: Element | null) => {
    const candidates = [node, getReferencedElement(node)].filter(Boolean) as Element[];
    for (const candidate of candidates) {
      const value = Array.from(candidate.attributes).find(attribute => attribute.localName === 'link')?.value?.trim() || '';
      if (value) return value;
    }
    return '';
  };
  const readName = (node: Element) => {
    const referenced = getReferencedElement(node);
    return node.getAttribute('name') || referenced?.getAttribute('name') || node.getAttribute('id') || 'Source sans nom';
  };
  const savedNodes = Array.from(doc.getElementsByTagNameNS(NS, 'source'));
  const saved = savedNodes.map(node => {
    const id = node.getAttribute('id') || '';
    const element = byId.get(id);
    const bpmnType = (node.getAttribute('bpmnType') || element?.localName || 'dataObjectReference') as BpmnDataType;
    const kind = node.getAttribute('kind') === 'database' || bpmnType === 'dataStoreReference' ? 'database' : 'file';
    return {
      ...emptySource(),
      id,
      kind,
      bpmnType,
      name: node.getAttribute('name') || (element ? readName(element) : id),
      elementName: element ? readName(element) : node.getAttribute('name') || id,
      description: readDescription(element) || node.getAttribute('description') || '',
      link: readLink(element) || node.getAttribute('link') || '',
      location: node.getAttribute('location') || '',
      access: node.getAttribute('access') || '',
      retention: node.getAttribute('retention') || '',
      authorizedPeople: node.getAttribute('authorizedPeople') || '',
      restrictions: node.getAttribute('restrictions') || '',
      associations: links.get(id) ?? [],
    } as InventorySource;
  }).filter(source => {
    const element = byId.get(source.id);
    return Boolean(element && dataTypes.has(element.localName as BpmnDataType));
  });

  // Always reconcile the saved manifest with the actual BPMN model. A new
  // Data Store or Data Object added after the manifest was created must appear
  // immediately as an unlinked "new" entry instead of being silently hidden.
  const savedIds = new Set(saved.map(source => source.id));
  const discovered = elements.filter(node => dataTypes.has(node.localName as BpmnDataType)).map(node => {
    const id = node.getAttribute('id') || '';
    const bpmnType = node.localName as BpmnDataType;
    return {
      ...emptySource(),
      id,
      bpmnType,
      kind: bpmnType === 'dataStoreReference' ? 'database' as const : 'file' as const,
      name: readName(node),
      elementName: readName(node),
      description: readDescription(node),
      link: readLink(node),
      associations: links.get(id) ?? [],
    };
  }).filter(source => source.id && !savedIds.has(source.id));

  return [...saved, ...discovered];
};

const symbolLabel = (type: BpmnDataType) => ({
  dataObjectReference: 'Objet de données',
  dataStoreReference: 'Magasin de données',
}[type]);

const BpmnDataSymbol = ({ type }: { type: BpmnDataType }) => (
  <svg width="34" height="38" viewBox="0 0 34 38" role="img" aria-label={symbolLabel(type)}>
    {type === 'dataStoreReference'
      ? <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 8 C5 3 29 3 29 8 L29 29 C29 34 5 34 5 29 Z"/><path d="M5 8 C5 13 29 13 29 8 M5 29 C5 24 29 24 29 29"/></g>
      : <g fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3 H22 L29 10 V34 H6 Z"/><path d="M22 3 V10 H29"/>
        </g>}
  </svg>
);

export const DataInventory = ({ xmlContent, canEdit, projectId, resourceId, requestedDocumentedSourceId, requestedElementId, canManageSources = false, onElementSelect, onShowDiagram }: Props) => {
  const original = useMemo(() => readSources(xmlContent), [xmlContent]);
  const [sources, setSources] = useState<InventorySource[]>(original);
  const [saving, setSaving] = useState(false);
  const [associatingElementId, setAssociatingElementId] = useState<string | null>(null);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [pendingMerge, setPendingMerge] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const projectSourcesQuery = useQuery<ProjectDocumentedSourcesResponse>(
    ['project-documented-sources', projectId],
    () => apiClient.get(`/projects/${projectId}/documented-sources`),
    { enabled: Boolean(projectId) },
  );
  const projectSources = projectSourcesQuery.data?.sources ?? [];

  useEffect(() => setSources(original), [original]);

  useEffect(() => {
    if (!requestedDocumentedSourceId) return;
    const source = projectSources.find(item => item.id === requestedDocumentedSourceId);
    const reference = source?.references.find(item => item.resourceId === resourceId);
    const targetElementId = reference?.elementId ?? requestedElementId;
    if (targetElementId) setSelectedElementId(targetElementId);
  }, [requestedDocumentedSourceId, requestedElementId, projectSources, resourceId]);

  const update = (id: string, field: keyof InventorySource, value: string) => {
    setSources(current => current.map(source => source.id === id ? { ...source, [field]: value } : source));
  };

  const getLinkedSource = (elementId: string) => projectSources.find(source =>
    source.references.some(reference => reference.resourceId === resourceId && reference.elementId === elementId),
  );

  const selectedSource = sources.find(source => source.id === selectedElementId);
  const selectedLinkedSource = selectedSource ? getLinkedSource(selectedSource.id) : undefined;
  const associationTargets = projectSources.filter(item =>
    item.id !== selectedLinkedSource?.id &&
    !item.references.some(reference => reference.resourceId === resourceId),
  );
  const mergeCandidates = selectedLinkedSource
    ? projectSources.filter(item =>
        item.id !== selectedLinkedSource.id &&
        !item.references.some(reference => reference.resourceId === resourceId),
      )
    : [];

  const startEditing = (row: InventorySource) => {
    const linked = getLinkedSource(row.id);
    if (linked) {
      setSources(current => current.map(item => item.id === row.id ? {
        ...item,
        name: linked.name,
        kind: linked.kind,
        description: linked.description ?? '',
        link: linked.link ?? '',
        location: linked.location ?? '',
        access: linked.access ?? '',
        retention: linked.retention ?? '',
        authorizedPeople: linked.authorizedPeople ?? '',
        restrictions: linked.restrictions ?? '',
      } : item));
    }
    setEditingSourceId(row.id);
  };

  const sourceOptionLabel = (source: ProjectDocumentedSource) => {
    const processNames = Array.from(new Set(source.references.map(reference => reference.processName)));
    return processNames.length
      ? `${source.name} — ${processNames.join(', ')}`
      : source.name;
  };

  const refreshProjectSources = async () => {
    if (projectId) await queryClient.invalidateQueries(['project-documented-sources', projectId]);
  };

  const associate = async (source: InventorySource, sourceId: string) => {
    if (!projectId || !canManageSources || !sourceId || associatingElementId) return;
    setAssociatingElementId(source.id);
    setError('');
    try {
      // A documented source is reusable: this endpoint adds one BPMN reference
      // to the selected project source; it does not consume or remove the option.
      await apiClient.post(`/projects/${projectId}/documented-sources/${sourceId}/references`, {
        resourceId,
        elementId: source.id,
        elementName: source.elementName || source.name,
        elementType: source.bpmnType,
        description: source.description,
        link: source.link,
        location: source.location,
        access: source.access,
        retention: source.retention,
        authorizedPeople: source.authorizedPeople,
        restrictions: source.restrictions,
      });
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de rattacher cette référence.');
    } finally {
      setAssociatingElementId(null);
    }
  };

  const changeAssociation = async (source: InventorySource, targetSourceId: string) => {
    if (!projectId || !canManageSources || !targetSourceId || associatingElementId) return;
    const linked = getLinkedSource(source.id);
    const reference = linked?.references.find(item => item.resourceId === resourceId && item.elementId === source.id);
    if (!linked || !reference) return;
    setAssociatingElementId(source.id);
    setError('');
    try {
      await apiClient.put(`/projects/${projectId}/documented-sources/${linked.id}/references/${reference.id}`, { targetSourceId });
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de changer la source associée.');
    } finally {
      setAssociatingElementId(null);
    }
  };

  const unlink = async (source: InventorySource) => {
    if (!projectId || !canManageSources || associatingElementId) return;
    const linked = getLinkedSource(source.id);
    const reference = linked?.references.find(item => item.resourceId === resourceId && item.elementId === source.id);
    if (!linked || !reference) return;
    setAssociatingElementId(source.id);
    setError('');
    try {
      await apiClient.remove(`/projects/${projectId}/documented-sources/${linked.id}/references/${reference.id}`);
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de délier cet objet BPMN.');
    } finally {
      setAssociatingElementId(null);
    }
  };

  const createCanonicalSource = async (source: InventorySource) => {
    if (!projectId || !canManageSources || !source.id || saving) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources`, {
        resourceId,
        elementId: source.id,
        elementName: source.elementName || source.name,
        elementType: source.bpmnType,
        kind: source.kind,
        name: source.name,
        description: source.description,
        link: source.link,
        location: source.location,
        access: source.access,
        retention: source.retention,
        authorizedPeople: source.authorizedPeople,
        restrictions: source.restrictions,
      });
      setEditingSourceId(null);
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer la source documentaire.');
    } finally {
      setSaving(false);
    }
  };

  const mergeSources = async () => {
    if (!projectId || !canManageSources || !pendingMerge) return;
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources/${pendingMerge.sourceId}/merge`, {
        targetSourceId: pendingMerge.targetId,
      });
      setMergeTargets(current => ({ ...current, [pendingMerge.sourceId]: '' }));
      setPendingMerge(null);
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de fusionner les sources.');
    }
  };

  const save = async () => {
    if (!projectId || !canManageSources || !editingSourceId || saving) return;
    const source = sources.find(item => item.id === editingSourceId);
    const linked = source ? getLinkedSource(source.id) : undefined;
    if (!source) return;
    if (!linked) { await createCanonicalSource(source); return; }
    setSaving(true);
    setError('');
    try {
      await apiClient.put(`/projects/${projectId}/documented-sources/${linked.id}`, {
        kind: source.kind,
        name: source.name,
        description: source.description,
        link: source.link,
        location: source.location,
        access: source.access,
        retention: source.retention,
        authorizedPeople: source.authorizedPeople,
        restrictions: source.restrictions,
      });
      setEditingSourceId(null);
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer la source documentaire.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography level="title-lg">Informations documentées</Typography>
            <Typography level="body-sm" color="neutral">Sources utilisées par ce processus, informations de référence et règles d’accès à l’échelle du projet.</Typography>
          </Box>
          {canEdit && editingSourceId && <Button size="sm" loading={saving} disabled={saving} onClick={save}>{getLinkedSource(editingSourceId) ? 'Enregistrer la source' : 'Créer la source du projet'}</Button>}
        </Stack>
        {error && <Alert color="danger" variant="soft">{error}</Alert>}
        {projectSourcesQuery.isError && <Alert color="warning" variant="soft">Le référentiel documentaire du projet est momentanément indisponible. Les informations BPMN locales restent consultables.</Alert>}
        {selectedSource && (
          <Stack spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
            <Typography level="title-sm">Actions pour : {selectedSource.elementName}</Typography>
            {canManageSources ? (
              <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} flexWrap="wrap" gap={1}>
                <Button size="sm" variant="outlined" disabled={saving || Boolean(associatingElementId)} onClick={() => startEditing(selectedSource)}>
                  Modifier
                </Button>
                {selectedLinkedSource && (
                  <Button size="sm" color="danger" variant="outlined" disabled={Boolean(associatingElementId)} onClick={() => void unlink(selectedSource)}>
                    Délier la source
                  </Button>
                )}
                {associationTargets.length > 0 && (
                  <Select size="sm" sx={{ minWidth: 230 }} placeholder={selectedLinkedSource ? 'Changer la source…' : 'Associer une source…'} value={null} disabled={Boolean(associatingElementId)} onChange={(_, value) => {
                    if (typeof value === 'string' && value.length > 0) {
                      void (selectedLinkedSource ? changeAssociation(selectedSource, value) : associate(selectedSource, value));
                    }
                  }}>
                    {associationTargets.map(item => <Option key={item.id} value={item.id}>{sourceOptionLabel(item)}</Option>)}
                  </Select>
                )}
                {selectedLinkedSource && mergeCandidates.length > 0 && (
                  <>
                    <Select size="sm" sx={{ minWidth: 230 }} placeholder="Fusionner avec…" value={mergeTargets[selectedLinkedSource.id] ?? ''} onChange={(_, value) => setMergeTargets(current => ({ ...current, [selectedLinkedSource.id]: value ?? '' }))}>
                      {mergeCandidates.map(item => <Option key={item.id} value={item.id}>{sourceOptionLabel(item)}</Option>)}
                    </Select>
                    {mergeTargets[selectedLinkedSource.id] && (
                      <Button size="sm" color="warning" variant="soft" startDecorator={<MergeType />} onClick={() => setPendingMerge({ sourceId: selectedLinkedSource.id, targetId: mergeTargets[selectedLinkedSource.id] })}>
                        Fusionner
                      </Button>
                    )}
                  </>
                )}
                {editingSourceId === selectedSource.id && (
                  <Button size="sm" variant="plain" color="neutral" disabled={saving} onClick={() => setEditingSourceId(null)}>
                    Annuler la modification
                  </Button>
                )}
              </Stack>
            ) : (
              <Typography level="body-sm" color="neutral">Sélection en lecture seule : les modifications du référentiel sont réservées aux administrateurs du projet.</Typography>
            )}
          </Stack>
        )}
        {!sources.length ? <Typography level="body-sm" color="neutral">Aucune information documentée. Ajoutez un objet de données ou un magasin de données dans le diagramme BPMN pour le faire apparaître ici.</Typography> : (
          <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
            <DocumentedSourcesGrid<InventoryGridRow>
              rowData={sources.map(source => {
                const linked = getLinkedSource(source.id);
                return {
                  ...source,
                  name: editingSourceId === source.id ? source.name : linked?.name ?? source.name,
                  kind: editingSourceId === source.id ? source.kind : linked?.kind ?? source.kind,
                  description: editingSourceId === source.id ? source.description : linked?.description ?? source.description,
                  link: editingSourceId === source.id ? source.link : linked?.link ?? source.link,
                  location: editingSourceId === source.id ? source.location : linked?.location ?? source.location,
                  access: editingSourceId === source.id ? source.access : linked?.access ?? source.access,
                  retention: editingSourceId === source.id ? source.retention : linked?.retention ?? source.retention,
                  authorizedPeople: editingSourceId === source.id ? source.authorizedPeople : linked?.authorizedPeople ?? source.authorizedPeople,
                  restrictions: editingSourceId === source.id ? source.restrictions : linked?.restrictions ?? source.restrictions,
                  projectStatus: linked ? `Rattaché au projet (${linked.references.length} référence(s))` : 'À créer',
                  associationsLabel: source.associations.length
                    ? source.associations.map(association => `${association.direction === 'input' ? 'Entrée' : 'Sortie'} : ${association.taskName}`).join(' • ')
                    : 'Aucune association BPMN détectée',
                };
              })}
              getRowId={row => row.id}
              columnDefs={[
                {
                  headerName: 'Objet BPMN',
                  minWidth: 210,
                  valueGetter: (params: ValueGetterParams<InventoryGridRow>) => params.data ? `${symbolLabel(params.data.bpmnType)} — ${params.data.elementName}` : '',
                  cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => params.data ? (
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <BpmnDataSymbol type={params.data.bpmnType} />
                      <Typography level="body-sm" sx={{ flex: 1, minWidth: 0 }}>{params.data.elementName}</Typography>
                      {onElementSelect && (
                        <Button
                          size="sm"
                          variant="plain"
                          color="primary"
                          title="Ouvrir cet élément dans le diagramme BPMN"
                          aria-label={`Voir l’élément BPMN ${params.data.elementName} dans le diagramme`}
                          startDecorator={<CenterFocusStrong />}
                          onClick={event => {
                            event.stopPropagation();
                            onShowDiagram?.();
                            onElementSelect(params.data!.id);
                          }}
                        >
                          Voir
                        </Button>
                      )}
                    </Stack>
                  ) : null,
                },
                {
                  headerName: 'Associations',
                  field: 'associationsLabel',
                  minWidth: 230,
                  cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => params.data?.associations.length ? (
                    <Stack spacing={0.25}>
                      {params.data.associations.map((association, index) => (
                        onElementSelect ? (
                          <Button key={`${association.taskId}-${index}`} size="sm" variant="plain" color="neutral" onClick={() => { onShowDiagram?.(); onElementSelect(association.taskId); }} startDecorator={<CenterFocusStrong />}>
                            {association.taskName}
                          </Button>
                        ) : <Typography key={`${association.taskId}-${index}`} level="body-sm">{association.taskName}</Typography>
                      ))}
                    </Stack>
                  ) : <Typography level="body-sm" textColor="neutral">Aucune association BPMN détectée</Typography>,
                },
                {
                  headerName: 'Source documentaire',
                  field: 'name',
                  minWidth: 190,
                  editable: (params: EditableCallbackParams<InventoryGridRow>) => Boolean(params.data && editingSourceId === params.data.id),
                  onCellValueChanged: (params: CellValueChangedEvent<InventoryGridRow>) => { if (params.data) update(params.data.id, 'name', String(params.newValue ?? '')); },
                },
                {
                  headerName: 'Type',
                  field: 'kind',
                  minWidth: 140,
                  editable: (params: EditableCallbackParams<InventoryGridRow>) => Boolean(params.data && editingSourceId === params.data.id),
                  cellEditor: 'agSelectCellEditor',
                  cellEditorParams: { values: ['file', 'database', 'application', 'form'] },
                  valueFormatter: (params: ValueFormatterParams<InventoryGridRow>) => ({ file: 'Fichier', database: 'Base de données', application: 'Application', form: 'Formulaire' } as Record<SourceKind, string>)[params.value as SourceKind] ?? '',
                  onCellValueChanged: (params: CellValueChangedEvent<InventoryGridRow>) => { if (params.data) update(params.data.id, 'kind', String(params.newValue ?? 'file')); },
                },
                { headerName: 'Statut projet', field: 'projectStatus', minWidth: 180 },
                ...([
                  ['description', 'Description', 230],
                  ['link', 'Lien', 180],
                  ['location', 'Emplacement', 160],
                  ['access', 'Accès', 150],
                  ['retention', 'Rétention', 140],
                  ['authorizedPeople', 'Personnes autorisées', 180],
                  ['restrictions', 'Restrictions', 200],
                ] as Array<[keyof InventorySource, string, number]>).map(([field, headerName, minWidth]) => ({
                  headerName,
                  field: field as keyof InventoryGridRow,
                  minWidth,
                  editable: (params: EditableCallbackParams<InventoryGridRow>) => Boolean(params.data && editingSourceId === params.data.id),
                  onCellValueChanged: (params: CellValueChangedEvent<InventoryGridRow>) => {
                    if (params.data) update(params.data.id, field, String(params.newValue ?? ''));
                  },
                })),
              ] as ColDef<InventoryGridRow>[]}
              selectedRowId={selectedElementId ?? undefined}
              onRowSelected={row => setSelectedElementId(row?.id ?? null)}
              onAdd={canManageSources ? () => { if (selectedSource) setEditingSourceId(selectedSource.id); } : undefined}
              addLabel="Créer la source du projet"
              addDisabled={!canManageSources || !selectedSource || Boolean(selectedLinkedSource) || Boolean(editingSourceId)}
            />
          </Box>
        )}
      </Stack>
      <Modal open={Boolean(pendingMerge)} onClose={() => setPendingMerge(null)}>
        <ModalDialog>
          <DialogTitle>Confirmer la fusion des sources</DialogTitle>
          <DialogContent>
            {(() => {
              const absorbed = projectSources.find(item => item.id === pendingMerge?.sourceId);
              const retained = projectSources.find(item => item.id === pendingMerge?.targetId);
              return (
                <Stack spacing={1}>
                  <Typography level="body-sm">Source absorbée :</Typography>
                  <Typography level="title-md">{absorbed?.name ?? 'Source à fusionner'}</Typography>
                  <Typography level="body-sm">Source conservée :</Typography>
                  <Typography level="title-md">{retained?.name ?? 'Source cible'}</Typography>
                  <Typography level="body-sm" color="warning">Les références BPMN seront transférées vers la source conservée. Les champs descriptifs vides seront complétés et les valeurs différentes seront conservées ensemble. Si les liens diffèrent, choisissez d’abord le lien à garder. Le nom de la source conservée reste inchangé. Les diagrammes BPMN ne seront pas modifiés.</Typography>
                </Stack>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={() => setPendingMerge(null)}>Annuler</Button>
            <Button color="warning" onClick={() => void mergeSources()}>Confirmer la fusion</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
};
