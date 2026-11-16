import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, Chip, DialogActions, DialogContent, DialogTitle, IconButton, Input, Modal, ModalDialog, Option, Select, Stack, Table, Textarea, Typography } from '@mui/joy';
import { EditOutlined, CenterFocusStrong, MergeType } from '@mui/icons-material';

import { apiClient } from '../../../queryClient';

type BpmnDataType = 'dataObjectReference' | 'dataInput' | 'dataOutput' | 'dataStoreReference';
type SourceKind = 'file' | 'database' | 'application' | 'form';

export type InventorySource = {
  id: string;
  kind: SourceKind;
  bpmnType: BpmnDataType;
  associations: Array<{ taskId: string; taskName: string; direction: 'input' | 'output' }>;
  name: string;
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
  references: Array<{ resourceId: string; elementId: string; elementName: string; elementType: string; processName: string }>;
};

type ProjectDocumentedSourcesResponse = {
  sources: ProjectDocumentedSource[];
  unlinkedReferences: Array<{ resourceId: string; processName: string; elementId: string; elementName: string; elementType: string }>;
};

type Props = {
  xmlContent?: string;
  canEdit: boolean;
  projectId?: string | null;
  resourceId: string;
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
  description: '',
  link: '',
  location: '',
  access: '',
  retention: '',
  authorizedPeople: '',
  restrictions: '',
});

const activityTypes = new Set(['task','userTask','manualTask','serviceTask','scriptTask','businessRuleTask','sendTask','receiveTask','callActivity','subProcess','transaction']);
const dataTypes = new Set<BpmnDataType>(['dataObjectReference','dataInput','dataOutput','dataStoreReference']);

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
      description: readDescription(element) || node.getAttribute('description') || '',
      link: readLink(element) || node.getAttribute('link') || '',
      location: node.getAttribute('location') || '',
      access: node.getAttribute('access') || '',
      retention: node.getAttribute('retention') || '',
      authorizedPeople: node.getAttribute('authorizedPeople') || '',
      restrictions: node.getAttribute('restrictions') || '',
      associations: links.get(id) ?? [],
    } as InventorySource;
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
      description: readDescription(node),
      link: readLink(node),
      associations: links.get(id) ?? [],
    };
  }).filter(source => source.id && !savedIds.has(source.id));

  return [...saved, ...discovered];
};

const symbolLabel = (type: BpmnDataType) => ({
  dataObjectReference: 'Objet de données',
  dataInput: 'Entrée de données',
  dataOutput: 'Sortie de données',
  dataStoreReference: 'Magasin de données',
}[type]);

const BpmnDataSymbol = ({ type }: { type: BpmnDataType }) => (
  <svg width="34" height="38" viewBox="0 0 34 38" role="img" aria-label={symbolLabel(type)}>
    {type === 'dataStoreReference'
      ? <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 8 C5 3 29 3 29 8 L29 29 C29 34 5 34 5 29 Z"/><path d="M5 8 C5 13 29 13 29 8 M5 29 C5 24 29 24 29 29"/></g>
      : <g fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3 H22 L29 10 V34 H6 Z"/><path d="M22 3 V10 H29"/>
          {type === 'dataInput' && <path d="M11 22 H24 M11 22 L15 18 M11 22 L15 26"/>}
          {type === 'dataOutput' && <path d="M11 22 H24 M20 18 L24 22 L20 26"/>}
        </g>}
  </svg>
);

export const DataInventory = ({ xmlContent, canEdit, projectId, resourceId, canManageSources = false, onElementSelect, onShowDiagram }: Props) => {
  const original = useMemo(() => readSources(xmlContent), [xmlContent]);
  const [sources, setSources] = useState<InventorySource[]>(original);
  const [saving, setSaving] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
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

  const update = (id: string, field: keyof InventorySource, value: string) => {
    setSources(current => current.map(source => source.id === id ? { ...source, [field]: value } : source));
  };

  const getLinkedSource = (elementId: string) => projectSources.find(source =>
    source.references.some(reference => reference.resourceId === resourceId && reference.elementId === elementId),
  );

  const sourceOptionLabel = (source: ProjectDocumentedSource) => {
    const processNames = [...new Set(source.references.map(reference => reference.processName))];
    return processNames.length
      ? `${source.name} — ${processNames.join(', ')}`
      : source.name;
  };

  const refreshProjectSources = async () => {
    if (projectId) await queryClient.invalidateQueries(['project-documented-sources', projectId]);
  };

  const associate = async (source: InventorySource, sourceId: string) => {
    if (!projectId || !canManageSources || !sourceId) return;
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources/${sourceId}/references`, {
        resourceId,
        elementId: source.id,
        elementName: source.name,
        elementType: source.bpmnType,
      });
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de rattacher cette référence.');
    }
  };

  const createCanonicalSource = async (source: InventorySource) => {
    if (!projectId || !canManageSources || !source.id) return;
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources`, {
        resourceId,
        elementId: source.id,
        elementName: source.name,
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
    if (!source || !linked) {
      setError('Cette nouvelle référence doit être créée ou rattachée à une source du projet.');
      return;
    }
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
          {canEdit && editingSourceId && sources.some(source => source.id === editingSourceId && getLinkedSource(source.id)) && <Button size="sm" loading={saving} disabled={saving} onClick={save}>Enregistrer la source</Button>}
        </Stack>
        {error && <Alert color="danger" variant="soft">{error}</Alert>}
        {projectSourcesQuery.isError && <Alert color="warning" variant="soft">Le référentiel documentaire du projet est momentanément indisponible. Les informations BPMN locales restent consultables.</Alert>}
        {!sources.length ? <Typography level="body-sm" color="neutral">Aucune information documentée. Ajoutez un objet de données ou un magasin de données dans le diagramme BPMN pour le faire apparaître ici.</Typography> : (
          <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
            <Table size="sm" stickyHeader hoverRow sx={{ minWidth: 1500, '& th': { whiteSpace: 'nowrap' }, '& td': { verticalAlign: 'top' } }}>
              <thead><tr><th>Symbole BPMN</th><th>Source</th><th>Références dans le processus</th><th>Statut projet</th><th>Description</th><th>Lien</th><th>Emplacement</th><th>Accès</th><th>Rétention</th><th>Personnes autorisées</th><th>Restrictions</th><th>Actions</th></tr></thead>
              <tbody>{sources.map((source, index) => {
                const linked = getLinkedSource(source.id);
                const editing = canEdit && (canManageSources || !linked) && editingSourceId === source.id;
                const display = (field: keyof ProjectDocumentedSource) => linked ? linked[field] ?? '' : source[field as keyof InventorySource] ?? '';
                const textField = (key: keyof InventorySource, label: string) => editing
                  ? <Input size="sm" value={String(source[key])} onChange={e => update(source.id, key, e.target.value)} placeholder={label} aria-label={label} />
                  : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 90 }}>{String(display(key as keyof ProjectDocumentedSource) || '—')}</Typography>;
                const areaField = (key: 'description' | 'restrictions', label: string) => editing
                  ? <Textarea size="sm" minRows={2} value={source[key]} onChange={e => update(source.id, key, e.target.value)} placeholder={label} aria-label={label} />
                  : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 130 }}>{String(display(key) || '—')}</Typography>;
                const otherSources = projectSources.filter(item => item.id !== linked?.id);
                const sourceKind = linked?.kind ?? source.kind;
                const sourceKindLabel = sourceKind === 'database' ? 'Base de données' : 'Fichier';
                const sourceLink = display('link');
                let linkCell: React.ReactNode = <Typography level="body-sm">—</Typography>;
                if (editing) {
                  linkCell = <Input size="sm" value={source.link} onChange={e => update(source.id, 'link', e.target.value)} placeholder="https://…" aria-label="Lien de la source" />;
                } else if (sourceLink) {
                  linkCell = <a href={String(sourceLink)} target="_blank" rel="noopener noreferrer">{String(sourceLink)}</a>;
                }
                return <tr key={source.id || `source-${index}`}>
                  <td><Stack direction="row" spacing={0.5} alignItems="center"><BpmnDataSymbol type={source.bpmnType} /><Typography level="body-xs">{symbolLabel(source.bpmnType)}</Typography></Stack></td>
                  <td><Stack spacing={0.5} sx={{ minWidth: 180 }}>
                    {editing ? <Input size="sm" value={source.name} onChange={e => update(source.id, 'name', e.target.value)} placeholder="Nom de la source" aria-label="Nom de la source" /> : <Typography level="body-sm">{linked?.name || source.name || `Source ${index + 1}`}</Typography>}
                    {!editing && <Chip size="sm" variant="soft">{sourceKindLabel}</Chip>}
                  </Stack></td>
                  <td><Stack spacing={0.5} sx={{ minWidth: 190 }}>{source.associations.length ? source.associations.map((association, i) => <Stack key={`${association.taskId}-${i}`} direction="row" spacing={0.5} alignItems="center"><Chip size="sm" color={association.direction === 'input' ? 'primary' : 'success'} variant="soft">{association.direction === 'input' ? 'Entrée' : 'Sortie'}</Chip>{onElementSelect ? <Button size="sm" variant="plain" color="neutral" onClick={() => { onShowDiagram?.(); onElementSelect(association.taskId); }} startDecorator={<CenterFocusStrong />}>{association.taskName}</Button> : <Typography level="body-sm">{association.taskName}</Typography>}</Stack>) : <Typography level="body-sm" textColor="neutral">Aucune association BPMN détectée</Typography>}</Stack></td>
                  <td><Stack spacing={0.75} sx={{ minWidth: 210 }}>
                    <Chip size="sm" color={linked ? 'success' : 'warning'} variant="soft">{linked ? 'Rattaché au projet' : 'Nouveau'}</Chip>
                    {linked && <Typography level="body-xs" color="neutral">{linked.references.length} référence(s) dans le projet</Typography>}
                    {!linked && canManageSources && projectSources.length > 0 && <Select size="sm" placeholder="Associer à une source…" value="" onChange={(_, value) => { if (value) void associate(source, value); }}>
                      {projectSources.map(item => <Option key={item.id} value={item.id}>{sourceOptionLabel(item)}</Option>)}
                    </Select>}
                    {!linked && canManageSources && <Button size="sm" variant="outlined" color="neutral" onClick={() => void createCanonicalSource(source)}>Créer la source du projet</Button>}
                  </Stack></td>
                  <td>{areaField('description', 'Description')}</td>
                  <td>{linkCell}</td>
                  <td>{textField('location', 'Emplacement / chemin')}</td>
                  <td>{textField('access', 'Accès')}</td>
                  <td>{textField('retention', 'Rétention')}</td>
                  <td>{textField('authorizedPeople', 'Personnes autorisées')}</td>
                  <td>{areaField('restrictions', 'Restrictions')}</td>
                  <td><Stack spacing={0.5}>
                    {canEdit && linked && <IconButton size="sm" variant="plain" title={editing ? 'Terminer la modification' : 'Modifier les informations'} aria-label={editing ? 'Terminer la modification' : 'Modifier les informations'} onClick={() => {
                      if (!editing && linked) {
                        setSources(current => current.map(item => item.id === source.id ? {
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
                      setEditingSourceId(editing ? null : source.id);
                    }}><EditOutlined /></IconButton>}
                    {canManageSources && linked && otherSources.length > 0 && <Select size="sm" placeholder="Fusionner avec…" value={mergeTargets[linked.id] ?? ''} onChange={(_, value) => setMergeTargets(current => ({ ...current, [linked.id]: value ?? '' }))}>
                      {otherSources.map(item => <Option key={item.id} value={item.id}>{sourceOptionLabel(item)}</Option>)}
                    </Select>}
                    {canManageSources && linked && mergeTargets[linked.id] && <Button size="sm" color="warning" variant="soft" startDecorator={<MergeType />} onClick={() => setPendingMerge({ sourceId: linked.id, targetId: mergeTargets[linked.id] })}>Fusionner</Button>}
                  </Stack></td>
                </tr>;
              })}</tbody>
            </Table>
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
