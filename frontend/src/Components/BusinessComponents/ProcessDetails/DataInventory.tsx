import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, Input, Stack, Table, Textarea, Typography } from '@mui/joy';
import { DatasetOutlined, EditOutlined, InsertDriveFileOutlined } from '@mui/icons-material';

export type InventorySource = {
  id: string;
  kind: 'file' | 'database';
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
};

const NS = 'https://ovh-bpmn-tool.local/schema/data-inventory';
const emptySource = (): InventorySource => ({
  id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind: 'file',
  name: '',
  description: '',
  location: '',
  access: '',
  retention: '',
  authorizedPeople: '',
  restrictions: '',
});

const readSources = (xml?: string): InventorySource[] => {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];
  const hasInventoryManifest = doc.getElementsByTagNameNS(NS, 'manifest').length > 0;
  const saved = Array.from(doc.getElementsByTagNameNS(NS, 'source')).map(node => ({
    id: node.getAttribute('id') || emptySource().id,
    kind: node.getAttribute('kind') === 'database' ? 'database' as const : 'file' as const,
    name: node.getAttribute('name') || '',
    description: node.getAttribute('description') || '',
    location: node.getAttribute('location') || '',
    access: node.getAttribute('access') || '',
    retention: node.getAttribute('retention') || '',
    authorizedPeople: node.getAttribute('authorizedPeople') || '',
    restrictions: node.getAttribute('restrictions') || '',
  }));
  // The manifest distinguishes an intentionally empty inventory from an older
  // BPMN file that has no inventory metadata yet and should be prefilled.
  if (hasInventoryManifest || saved.length) return saved;
  return Array.from(doc.getElementsByTagName('*'))
    .filter(node => ['dataObjectReference', 'dataStoreReference'].includes(node.localName))
    .map(node => ({
      ...emptySource(),
      id: node.getAttribute('id') || emptySource().id,
      kind: node.localName === 'dataStoreReference' ? 'database' as const : 'file' as const,
      name: node.getAttribute('name') || node.getAttribute('id') || 'Source sans nom',
    }));
};

export const DataInventory = ({ xmlContent, canEdit, onSave }: Props) => {
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
            <Table size="sm" stickyHeader hoverRow sx={{ minWidth: 1050, '& th': { whiteSpace: 'nowrap' }, '& td': { verticalAlign: 'top' } }}>
              <thead><tr><th>Source</th><th>Description</th><th>Emplacement</th><th>Accès</th><th>Rétention</th><th>Personnes autorisées</th><th>Restrictions</th><th style={{ width: 84 }}>Actions</th></tr></thead>
              <tbody>{sources.map((source, index) => {
                const editing = canEdit && editingSourceId === source.id;
                const field = (key: keyof InventorySource, placeholder: string) => editing
                  ? <Input size="sm" value={String(source[key])} onChange={e => update(source.id, key, e.target.value)} placeholder={placeholder} aria-label={placeholder} />
                  : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 90 }}>{String(source[key] || '—')}</Typography>;
                const area = (key: 'description' | 'restrictions', placeholder: string) => editing
                  ? <Textarea size="sm" minRows={2} value={source[key]} onChange={e => update(source.id, key, e.target.value)} placeholder={placeholder} aria-label={placeholder} />
                  : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 130 }}>{source[key] || '—'}</Typography>;
                return <tr key={source.id}>
                  <td><Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 180 }}>
                    {source.kind === 'database' ? <DatasetOutlined fontSize="small" /> : <InsertDriveFileOutlined fontSize="small" />}
                    {editing ? <Input size="sm" value={source.name} onChange={e => update(source.id, 'name', e.target.value)} placeholder="Nom de la source" aria-label="Nom de la source" /> : <Typography level="body-sm">{source.name || `Source ${index + 1}`}</Typography>}
                  </Stack>
                  {editing && <select aria-label="Type de source" value={source.kind} onChange={e => update(source.id, 'kind', e.target.value)} style={{ marginTop: 6, maxWidth: '100%' }}><option value="file">Fichier</option><option value="database">Base de données</option></select>}
                  {!editing && <Box sx={{ mt: 0.5 }}><Chip size="sm" variant="soft">{source.kind === 'database' ? 'Base de données' : 'Fichier'}</Chip></Box>}</td>
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
