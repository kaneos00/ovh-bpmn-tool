import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Alert, Box, Button, Option, Select, Stack, Typography } from '@mui/joy';
import { CenterFocusStrong } from '@mui/icons-material';
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
import { DocumentedSourcesGrid } from './DocumentedSourcesGrid';

import { apiClient } from '../../../queryClient';

type BpmnDataType = 'dataObjectReference' | 'dataStoreReference';
type SourceKind = 'file' | 'database' | 'application';

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
  authorizedPeople: string | null;
  restrictions: string | null;
  references: Array<{ id: string; resourceId: string; elementId: string; elementName: string; elementType: string; processName: string }>;
};

type ProjectDocumentedSourcesResponse = {
  sources: ProjectDocumentedSource[];
  unlinkedReferences: Array<{ resourceId: string; processName: string; elementId: string; elementName: string; elementType: string }>;
};

type InventoryGridRow = InventorySource & { associationsLabel: string; sourceName: string; sourceKind: string; status: string };

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

export const DataInventory = ({
  xmlContent,
  projectId,
  resourceId,
  requestedDocumentedSourceId,
  requestedElementId,
  canManageSources = false,
  onElementSelect,
  onShowDiagram,
}: Props) => {
  const sources = useMemo(() => readSources(xmlContent), [xmlContent]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(requestedElementId ?? null);
  const [associatingElementId, setAssociatingElementId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const projectSourcesQuery = useQuery<ProjectDocumentedSourcesResponse>(
    ['project-documented-sources', projectId],
    () => apiClient.get(`/projects/${projectId}/documented-sources`),
    { enabled: Boolean(projectId) },
  );
  const projectSources = projectSourcesQuery.data?.sources ?? [];

  useEffect(() => {
    if (requestedElementId) setSelectedElementId(requestedElementId);
    if (!requestedDocumentedSourceId) return;
    const source = projectSources.find(item => item.id === requestedDocumentedSourceId);
    const reference = source?.references.find(item => item.resourceId === resourceId);
    const target = reference?.elementId ?? requestedElementId;
    if (target) setSelectedElementId(target);
  }, [requestedDocumentedSourceId, requestedElementId, projectSources, resourceId]);

  const getLinkedSource = (elementId: string) => projectSources.find(source =>
    source.references.some(reference => reference.resourceId === resourceId && reference.elementId === elementId),
  );
  const selectedSource = sources.find(source => source.id === selectedElementId);
  const selectedLinkedSource = selectedSource ? getLinkedSource(selectedSource.id) : undefined;
  const associationTargets = projectSources.filter(source =>
    source.id !== selectedLinkedSource?.id &&
    !source.references.some(reference => reference.resourceId === resourceId),
  );
  const sourceOptionLabel = (source: ProjectDocumentedSource) => {
    const processNames = Array.from(new Set(source.references
      .filter(reference => reference.resourceId !== resourceId)
      .map(reference => reference.processName)));
    return processNames.length ? `${source.name} — ${processNames.join(', ')}` : source.name;
  };
  const refreshProjectSources = async () => {
    if (projectId) await queryClient.invalidateQueries(['project-documented-sources', projectId]);
  };

  const associate = async (source: InventorySource, sourceId: string) => {
    if (!projectId || !canManageSources || !sourceId || associatingElementId) return;
    setAssociatingElementId(source.id);
    setError('');
    try {
      await apiClient.post(`/projects/${projectId}/documented-sources/${sourceId}/references`, {
        resourceId,
        elementId: source.id,
        elementName: source.elementName || source.name,
        elementType: source.bpmnType,
        description: source.description,
        link: source.link,
      });
      await refreshProjectSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’associer cette information documentée.');
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
      setError(e instanceof Error ? e.message : 'Impossible de supprimer cette association.');
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
      setError(e instanceof Error ? e.message : 'Impossible de modifier cette association.');
    } finally {
      setAssociatingElementId(null);
    }
  };

  const rows = sources.map(source => {
    const linked = getLinkedSource(source.id);
    return {
      ...source,
      sourceName: linked?.name ?? 'Aucune information associée',
      sourceKind: linked?.kind ?? '',
      status: linked ? 'Associée' : 'Non associée',
      associationsLabel: source.associations.length
        ? source.associations.map(association =>
            `${association.direction === 'input' ? 'Entrée' : 'Sortie'} : ${association.taskName}`,
          ).join(' • ')
        : 'Aucune association à une activité détectée',
    };
  });

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography level="title-lg">Informations documentées</Typography>
            <Typography level="body-sm" color="neutral">
              Éléments de données du processus et informations documentées qui leur sont associées.
            </Typography>
          </Box>
          <Typography level="body-xs" color="neutral">
            {projectSources.length} information(s) documentée(s) dans le projet
          </Typography>
        </Stack>
        {error && <Alert color="danger" variant="soft">{error}</Alert>}
        {projectSourcesQuery.isError && (
          <Alert color="warning" variant="soft">
            Le référentiel documentaire du projet est momentanément indisponible. Les éléments BPMN restent consultables.
          </Alert>
        )}
        {selectedSource && (
          <Stack spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
            <Typography level="title-sm">Élément sélectionné : {selectedSource.elementName}</Typography>
            {canManageSources ? (
              <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} flexWrap="wrap" gap={1}>
                {selectedLinkedSource && (
                  <Button
                    size="sm"
                    color="danger"
                    variant="outlined"
                    disabled={Boolean(associatingElementId)}
                    loading={associatingElementId === selectedSource.id}
                    onClick={() => void unlink(selectedSource)}
                  >
                    Dissocier
                  </Button>
                )}
                {associationTargets.length > 0 && (
                  <Select
                    size="sm"
                    sx={{ minWidth: 260 }}
                    placeholder={selectedLinkedSource ? 'Remplacer l’information associée…' : 'Associer une information documentée…'}
                    value={null}
                    disabled={Boolean(associatingElementId)}
                    onChange={(_, value) => {
                      if (typeof value === 'string' && value) {
                        if (selectedLinkedSource) void changeAssociation(selectedSource, value);
                        else void associate(selectedSource, value);
                      }
                    }}
                  >
                    {associationTargets.map(item => (
                      <Option key={item.id} value={item.id}>{sourceOptionLabel(item)}</Option>
                    ))}
                  </Select>
                )}
                {!selectedLinkedSource && associationTargets.length === 0 && (
                  <Typography level="body-sm" color="neutral">
                    Aucune autre information documentée disponible à associer.
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography level="body-sm" color="neutral">
                Les associations sont réservées aux administrateurs du projet.
              </Typography>
            )}
          </Stack>
        )}
        {!rows.length ? (
          <Typography level="body-sm" color="neutral">
            Aucun objet de données ou magasin de données dans ce processus.
          </Typography>
        ) : (
          <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
            <DocumentedSourcesGrid<InventoryGridRow>
              rowData={rows}
              getRowId={row => row.id}
              selectedRowId={selectedElementId ?? undefined}
              onRowSelected={row => setSelectedElementId(row?.id ?? null)}
              columnDefs={[
                {
                  headerName: 'Élément BPMN',
                  minWidth: 220,
                  valueGetter: (params: ValueGetterParams<InventoryGridRow>) =>
                    params.data ? `${symbolLabel(params.data.bpmnType)} — ${params.data.elementName}` : '',
                  cellRenderer: (params: ICellRendererParams<InventoryGridRow>) => params.data ? (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <BpmnDataSymbol type={params.data.bpmnType} />
                      {onElementSelect ? (
                        <Button size="sm" variant="plain" color="neutral" onClick={() => { onShowDiagram?.(); onElementSelect(params.data!.id); }}>
                          {params.data.elementName}
                        </Button>
                      ) : <Typography level="body-sm">{params.data.elementName}</Typography>}
                    </Stack>
                  ) : null,
                },
                { headerName: 'Activités liées', field: 'associationsLabel', minWidth: 240 },
                { headerName: 'Information documentée associée', field: 'sourceName', minWidth: 260 },
                {
                  headerName: 'Type',
                  field: 'sourceKind',
                  minWidth: 140,
                  valueFormatter: (params) => ({
                    file: 'Fichier',
                    database: 'Base de données',
                    application: 'Application',
                  } as Record<string, string>)[String(params.value)] ?? '—',
                },
                { headerName: 'Association', field: 'status', minWidth: 130 },
              ] as ColDef<InventoryGridRow>[]}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
};
