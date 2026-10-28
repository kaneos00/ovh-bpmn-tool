import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Divider, Input, Stack, Textarea, Typography } from '@mui/joy';
import { DatasetOutlined, InsertDriveFileOutlined } from '@mui/icons-material';

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
  if (saved.length) return saved;
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
      Array.from(extension.children).filter(node => node.namespaceURI === NS && node.localName === 'source').forEach(node => node.remove());
      if (!definitions.lookupNamespaceURI('inventory')) definitions.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:inventory', NS);
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
        {!sources.length && <Card variant="outlined"><Typography level="body-sm" color="neutral">Aucune source d’information n’a été répertoriée. Ajoutez un fichier ou une base pour compléter l’inventaire.</Typography></Card>}
        {sources.map((source, index) => <Card key={source.id} variant="outlined" sx={{ gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {source.kind === 'database' ? <DatasetOutlined /> : <InsertDriveFileOutlined />}
            <Typography level="title-md">{source.name || `Source ${index + 1}`}</Typography>
            <Chip size="sm" variant="soft">{source.kind === 'database' ? 'Base de données' : 'Fichier'}</Chip>
            <Box sx={{ flex: 1 }} />
            {canEdit && <Button size="sm" variant="plain" color="danger" onClick={() => setSources(current => current.filter(item => item.id !== source.id))}>Retirer</Button>}
          </Stack>
          <Divider />
          <Stack spacing={1.25}>
            {canEdit && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Input value={source.name} onChange={e => update(source.id, 'name', e.target.value)} placeholder="Nom de la source" aria-label="Nom de la source" sx={{ flex: 1 }} />
              <select aria-label="Type de source" value={source.kind} onChange={e => update(source.id, 'kind', e.target.value)} style={{ minWidth: 150 }}>
                <option value="file">Fichier</option><option value="database">Base de données</option>
              </select>
            </Stack>}
            {canEdit ? <Textarea minRows={2} value={source.description} onChange={e => update(source.id, 'description', e.target.value)} placeholder="Description et usage de la source" aria-label="Description de la source" /> : <Typography level="body-sm">{source.description || 'Description non renseignée.'}</Typography>}
            <Input value={source.location} onChange={e => update(source.id, 'location', e.target.value)} placeholder="Emplacement / chemin / serveur" aria-label="Emplacement de la source" readOnly={!canEdit} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <Input value={source.access} onChange={e => update(source.id, 'access', e.target.value)} placeholder="Gestion des accès" aria-label="Gestion des accès" readOnly={!canEdit} sx={{ flex: 1 }} />
              <Input value={source.retention} onChange={e => update(source.id, 'retention', e.target.value)} placeholder="Durée de rétention" aria-label="Durée de rétention" readOnly={!canEdit} sx={{ flex: 1 }} />
            </Stack>
            <Input value={source.authorizedPeople} onChange={e => update(source.id, 'authorizedPeople', e.target.value)} placeholder="Personnes / rôles autorisés" aria-label="Personnes autorisées" readOnly={!canEdit} />
            <Textarea minRows={2} value={source.restrictions} onChange={e => update(source.id, 'restrictions', e.target.value)} placeholder="Modalités de restriction (masquage, chiffrement, limitation…)" aria-label="Modalités de restriction" readOnly={!canEdit} />
          </Stack>
        </Card>)}
      </Stack>
    </Box>
  );
};
