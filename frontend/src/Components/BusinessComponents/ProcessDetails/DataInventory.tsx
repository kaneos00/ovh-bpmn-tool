import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, Input, Stack, Table, Textarea, Typography } from '@mui/joy';
import { EditOutlined, CenterFocusStrong } from '@mui/icons-material';

export type InventorySource = {
  id: string;
  kind: 'file' | 'database';
  bpmnType: 'dataObjectReference' | 'dataInput' | 'dataOutput' | 'dataStoreReference';
  associations: Array<{ taskId: string; taskName: string; direction: 'input' | 'output' }>;
  name: string;
  description: string;
  location: string;
  access: string;
  retention: string;
  authorizedPeople: string;
  restrictions: string;
};

type Props = {
  xmlContent?: string;
  canEdit: boolean;
  onSave: (xml: string) => Promise<void>;
  onElementSelect?: (elementId: string) => void;
  onShowDiagram?: () => void;
};

const NS = 'https://ovh-bpmn-tool.local/schema/data-inventory';
const emptySource = (): InventorySource => ({
  id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind: 'file',
  bpmnType: 'dataObjectReference',
  associations: [],
  name: '',
  description: '',
  location: '',
  access: '',
  retention: '',
  authorizedPeople: '',
  restrictions: '',
});

const activityTypes = new Set(['task','userTask','manualTask','serviceTask','scriptTask','businessRuleTask','sendTask','receiveTask','callActivity','subProcess','transaction']);
const readSources = (xml?: string): InventorySource[] => {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];
  const elements = Array.from(doc.getElementsByTagName('*'));
  const byId = new Map(elements.map(node => [node.getAttribute('id') || '', node]).filter(([id]) => Boolean(id)));
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
    const s = n.getAttribute('sourceRef') || '', t = n.getAttribute('targetRef') || '';
    if (activityTypes.has(byId.get(s)?.localName || '')) add(t, s, 'output');
    if (activityTypes.has(byId.get(t)?.localName || '')) add(s, t, 'input');
  });
  const hasManifest = doc.getElementsByTagNameNS(NS, 'manifest').length > 0;
  const saved = Array.from(doc.getElementsByTagNameNS(NS, 'source')).map(n => ({
    id: n.getAttribute('id') || emptySource().id,
    kind: n.getAttribute('kind') === 'database' ? 'database' as const : 'file' as const,
    bpmnType: (n.getAttribute('bpmnType') || 'dataObjectReference') as InventorySource['bpmnType'],
    name: n.getAttribute('name') || '', description: n.getAttribute('description') || '',
    location: n.getAttribute('location') || '', access: n.getAttribute('access') || '',
    retention: n.getAttribute('retention') || '', authorizedPeople: n.getAttribute('authorizedPeople') || '',
    restrictions: n.getAttribute('restrictions') || '', associations: links.get(n.getAttribute('id') || '') ?? [],
  }));
  if (hasManifest || saved.length) return saved;
  return elements.filter(n => ['dataObjectReference','dataStoreReference','dataInput','dataOutput'].includes(n.localName)).map(n => {
    const id = n.getAttribute('id') || emptySource().id;
    const bpmnType = n.localName as InventorySource['bpmnType'];
    return { ...emptySource(), id, bpmnType, kind: bpmnType === 'dataStoreReference' ? 'database' as const : 'file' as const,
      name: n.getAttribute('name') || id || 'Source sans nom', associations: links.get(id) ?? [] };
  });
};

const symbolLabel = (type: InventorySource['bpmnType']) => ({ dataObjectReference: 'Objet de données', dataInput: 'Entrée de données', dataOutput: 'Sortie de données', dataStoreReference: 'Magasin de données' }[type]);
const BpmnDataSymbol = ({ type }: { type: InventorySource['bpmnType'] }) => (
  <svg width="34" height="38" viewBox="0 0 34 38" role="img" aria-label={symbolLabel(type)}>
    {type === 'dataStoreReference' ? <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 8 C5 3 29 3 29 8 L29 29 C29 34 5 34 5 29 Z"/><path d="M5 8 C5 13 29 13 29 8 M5 29 C5 24 29 24 29 29"/></g> :
    <g fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3 H22 L29 10 V34 H6 Z"/><path d="M22 3 V10 H29"/>
      {type === 'dataInput' && <path d="M11 22 H24 M11 22 L15 18 M11 22 L15 26"/>}
      {type === 'dataOutput' && <path d="M11 22 H24 M20 18 L24 22 L20 26"/>}
    </g>}
  </svg>
);
export const DataInventory = ({ xmlContent, canEdit, onSave, onElementSelect, onShowDiagram }: Props) => {
  const original = useMemo(() => readSources(xmlContent), [xmlContent]);
  const [sources, setSources] = useState<InventorySource[]>(original);
  const [saving, setSaving] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => setSources(original), [original]);

  const update = (id: string, field: keyof InventorySource, value: string) => {
    setSources(current => current.map(source => source.id === id ? { ...source, [field]: value } : source));
  };

  const save = async () => {
    if (!xmlContent || saving) return;
    setSaving(true);
    setError('');
    try {
      const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
      if (doc.querySelector('parsererror')) throw new Error('Le BPMN publié est illisible.');
      const definitions = doc.documentElement;
      let extension = Array.from(definitions.children).find(node => node.localName === 'extensionElements');
      if (!extension) {
        extension = doc.createElementNS(definitions.namespaceURI, definitions.prefix ? `${definitions.prefix}:extensionElements` : 'extensionElements');
        definitions.insertBefore(extension, definitions.firstChild);
      }
      Array.from(extension.children).filter(node => node.namespaceURI === NS && ['source', 'manifest'].includes(node.localName)).forEach(node => node.remove());
      if (!definitions.lookupNamespaceURI('inventory')) definitions.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:inventory', NS);
      // Persist an explicit marker even for an empty list, otherwise removed
      // entries would reappear from BPMN dataObjectReference/dataStoreReference.
      extension.appendChild(doc.createElementNS(NS, 'inventory:manifest'));
      sources.forEach(source => {
        const node = doc.createElementNS(NS, 'inventory:source');
        (Object.keys(source) as (keyof InventorySource)[]).forEach(key => node.setAttribute(key, String(source[key])));
        extension!.appendChild(node);
      });
      await onSave(new XMLSerializer().serializeToString(doc));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography level="title-lg">Inventaire des données, fichiers et bases</Typography>
            <Typography level="body-sm" color="neutral">Référentiel des sources d’information du processus, de leur emplacement et de leurs règles d’accès.</Typography>
          </Box>
          {canEdit && <Stack direction="row" spacing={1}>
            <Button size="sm" variant="outlined" color="neutral" onClick={() => setSources(current => [...current, emptySource()])}>Ajouter une source</Button>
            <Button size="sm" loading={saving} disabled={saving || !xmlContent} onClick={save}>Enregistrer</Button>
          </Stack>}
        </Stack>
        {error && <Typography level="body-sm" color="danger">{error}</Typography>}
        {!sources.length ? <Typography level="body-sm" color="neutral">Aucune source d’information n’a été répertoriée. Ajoutez un fichier ou une base pour compléter l’inventaire.</Typography> : (
          <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
            <Table size="sm" stickyHeader hoverRow sx={{ minWidth: 1250, '& th': { whiteSpace: 'nowrap' }, '& td': { verticalAlign: 'top' } }}>
              <thead><tr><th>Symbole BPMN</th><th>Source</th><th>Utilisation dans le processus</th><th>Description</th><th>Emplacement</th><th>Accès</th><th>Rétention</th><th>Personnes autorisées</th><th>Restrictions</th><th style={{ width: 84 }}>Actions</th></tr></thead>
              <tbody>{sources.map((source, index) => {
                const editing = canEdit && editingSourceId === source.id;
                const field = (key: keyof InventorySource, placeholder: string) => editing
                  ? <Input size="sm" value={String(source[key])} onChange={e => update(source.id, key, e.target.value)} placeholder={placeholder} aria-label={placeholder} />
                  : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 90 }}>{String(source[key] || '—')}</Typography>;
                const area = (key: 'description' | 'restrictions', placeholder: string) => editing
                  ? <Textarea size="sm" minRows={2} value={source[key]} onChange={e => update(source.id, key, e.target.value)} placeholder={placeholder} aria-label={placeholder} />
                  : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 130 }}>{source[key] || '—'}</Typography>;
                return <tr key={source.id}>
                  <td><Stack direction="row" spacing={0.5} alignItems="center"><BpmnDataSymbol type={source.bpmnType} /><Typography level="body-xs">{symbolLabel(source.bpmnType)}</Typography></Stack></td>
                  <td><Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 180 }}>
                    {editing ? <Input size="sm" value={source.name} onChange={e => update(source.id, 'name', e.target.value)} placeholder="Nom de la source" aria-label="Nom de la source" /> : <Typography level="body-sm">{source.name || `Source ${index + 1}`}</Typography>}
                  </Stack>
                  {editing && <select aria-label="Type de source BPMN" value={source.bpmnType} onChange={e => { const bpmnType = e.target.value as InventorySource['bpmnType']; setSources(current => current.map(item => item.id === source.id ? { ...item, bpmnType, kind: bpmnType === 'dataStoreReference' ? 'database' : 'file' } : item)); }}><option value="dataObjectReference">Objet de données</option><option value="dataInput">Entrée de données</option><option value="dataOutput">Sortie de données</option><option value="dataStoreReference">Magasin de données</option></select>}
                  {!editing && <Box sx={{ mt: 0.5 }}><Chip size="sm" variant="soft">{source.kind === 'database' ? 'Base de données' : 'Fichier'}</Chip></Box>}</td>
                  <td><Stack spacing={0.5} sx={{ minWidth: 190 }}>{source.associations.length ? source.associations.map((a, i) => <Stack key={a.taskId + i} direction="row" spacing={0.5} alignItems="center"><Chip size="sm" color={a.direction === 'input' ? 'primary' : 'success'} variant="soft">{a.direction === 'input' ? 'Entrée' : 'Sortie'}</Chip>{onElementSelect ? <Button size="sm" variant="plain" color="neutral" onClick={() => { onShowDiagram?.(); onElementSelect(a.taskId); }} startDecorator={<CenterFocusStrong />}>{a.taskName}</Button> : <Typography level="body-sm">{a.taskName}</Typography>}</Stack>) : <Typography level="body-sm" textColor="neutral">Aucune association BPMN détectée</Typography>}</Stack></td>
                  <td>{area('description', 'Description et usage')}</td><td>{field('location', 'Chemin / serveur')}</td><td>{field('access', 'Gestion des accès')}</td><td>{field('retention', 'Durée')}</td><td>{field('authorizedPeople', 'Personnes / rôles')}</td><td>{area('restrictions', 'Modalités de restriction (masquage, chiffrement, limitation…)')}</td>
                  <td>{canEdit && <Stack direction="row" spacing={0.25}>
                    <IconButton size="sm" variant="plain" title={editing ? 'Terminer la modification' : 'Modifier la source'} aria-label={editing ? 'Terminer la modification' : 'Modifier la source'} onClick={() => setEditingSourceId(editing ? null : source.id)}><EditOutlined /></IconButton>
                    <Button size="sm" variant="plain" color="danger" onClick={() => { setSources(current => current.filter(item => item.id !== source.id)); if (editing) setEditingSourceId(null); }}>×</Button>
                  </Stack>}</td>
                </tr>;
              })}</tbody>
            </Table>
          </Box>
        )}
      </Stack>
    </Box>
  );
};
