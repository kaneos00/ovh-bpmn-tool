import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Stack,
  Textarea,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { OrganizationAdminLayout } from '../OrganizationAdmin/OrganizationAdminLayout';

type CompetencyCategory = 'technical' | 'methodological' | 'behavioral';

const competencyCategoryLabels: Array<{ value: CompetencyCategory; label: string }> = [
  { value: 'technical', label: 'Compétences techniques' },
  { value: 'methodological', label: 'Compétences méthodologiques' },
  { value: 'behavioral', label: 'Savoir-être' },
];

type JobFunction = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  competencyBlocks?: Array<{ id: string; code: string; name: string; description: string | null; competencies: Array<{ id: string; code: string; name: string; description: string | null; referenceLevel: number | null; category: CompetencyCategory }> }>;
};

type ActivitySection = {
  id: string;
  code: string;
  title: string;
  tasks: string[];
  sortOrder: number;
};

type CustomSection = {
  id: string;
  sectionKey: string;
  title: string;
  content: Record<string, unknown>;
  sortOrder: number;
};

type FunctionDocument = JobFunction & {
  reportingLine: string | null;
  otherTitles: string[];
  documentDate: string | null;
  documentVersion: string | null;
  establishedBy: string | null;
  validatedBy: string | null;
  mission: string | null;
  activitySections: ActivitySection[];
  customSections: CustomSection[];
};

const documentUrl = (id: string) => `/job-architecture/functions/${id}/document`;

export const Component = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [documentDraft, setDocumentDraft] = useState({
    reportingLine: '',
    otherTitles: '',
    documentDate: '',
    documentVersion: 'V01',
    establishedBy: '',
    validatedBy: '',
    mission: '',
  });
  const [activityDraft, setActivityDraft] = useState({ code: '', title: '', tasks: '' });
  const [blockDraft, setBlockDraft] = useState({ code: '', name: '', description: '' });
  const [competencyDraft, setCompetencyDraft] = useState<{ blockId: string; code: string; name: string; description: string; referenceLevel: string; category: CompetencyCategory }>({ blockId: '', code: '', name: '', description: '', referenceLevel: '', category: 'technical' });
  const [editingActivity, setEditingActivity] = useState<ActivitySection | null>(null);
  const [customDraft, setCustomDraft] = useState({ sectionKey: '', title: '', content: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState('');
  const [customContentDraft, setCustomContentDraft] = useState('');
  const [error, setError] = useState('');

  const functionsQuery = useQuery<JobFunction[]>(
    ['job-architecture-functions'],
    () => apiClient.get('/job-architecture/functions'),
  );
  const documentQuery = useQuery<FunctionDocument>(
    ['job-function-document', selectedId],
    () => apiClient.get(documentUrl(selectedId)),
    { enabled: Boolean(selectedId) },
  );
  const selectedFunction = useMemo(
    () => (functionsQuery.data ?? []).find((item) => item.id === selectedId) ?? null,
    [functionsQuery.data, selectedId],
  );

  useEffect(() => {
    const document = documentQuery.data;
    if (!document) return;
    setDocumentDraft({
      reportingLine: document.reportingLine ?? '',
      otherTitles: (document.otherTitles ?? []).join('\n'),
      documentDate: document.documentDate?.slice(0, 10) ?? '',
      documentVersion: document.documentVersion ?? 'V01',
      establishedBy: document.establishedBy ?? '',
      validatedBy: document.validatedBy ?? '',
      mission: document.mission ?? '',
    });
  }, [documentQuery.data]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries(['job-architecture-functions']),
      queryClient.invalidateQueries(['job-function-document', selectedId]),
    ]);
  };

  const createFunction = useMutation(
    () => apiClient.post('/job-architecture/functions', {
      code: newCode.trim(),
      name: newName.trim(),
      description: newDescription.trim() || null,
    }),
    {
      onSuccess: async (created: JobFunction) => {
        setError('');
        setNewCode('');
        setNewName('');
        setNewDescription('');
        await queryClient.invalidateQueries(['job-architecture-functions']);
        setSelectedId(created.id);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const createBlock = useMutation(
    async () => {
      const block = await apiClient.post('/job-architecture/competency-blocks', {
        code: blockDraft.code.trim(),
        name: blockDraft.name.trim(),
        description: blockDraft.description.trim() || null,
      });
      await apiClient.post(`/job-architecture/functions/${selectedId}/blocks/${block.id}`, {});
      return block;
    },
    {
      onSuccess: async () => {
        setBlockDraft({ code: '', name: '', description: '' });
        setError('');
        await queryClient.invalidateQueries(['job-architecture-functions']);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const createCompetency = useMutation(
    () => apiClient.post(`/job-architecture/competency-blocks/${competencyDraft.blockId}/competencies`, {
      code: competencyDraft.code.trim(),
      name: competencyDraft.name.trim(),
      description: competencyDraft.description.trim() || null,
      referenceLevel: competencyDraft.referenceLevel === '' ? null : Number(competencyDraft.referenceLevel),
      category: competencyDraft.category,
    }),
    {
      onSuccess: async () => {
        setCompetencyDraft({ blockId: '', code: '', name: '', description: '', referenceLevel: '', category: 'technical' });
        setError('');
        await queryClient.invalidateQueries(['job-architecture-functions']);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const saveDocument = useMutation(
    () => apiClient.patch(documentUrl(selectedId), {
      reportingLine: documentDraft.reportingLine || null,
      otherTitles: documentDraft.otherTitles.split('\n').map((title) => title.trim()).filter(Boolean),
      documentDate: documentDraft.documentDate || null,
      documentVersion: documentDraft.documentVersion || null,
      establishedBy: documentDraft.establishedBy || null,
      validatedBy: documentDraft.validatedBy || null,
      mission: documentDraft.mission || null,
    }),
    {
      onSuccess: refresh,
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const createActivity = useMutation(
    () => apiClient.post(`${documentUrl(selectedId)}/activity-sections`, {
      code: activityDraft.code.trim(),
      title: activityDraft.title.trim(),
      tasks: activityDraft.tasks.split('\n').map((task) => task.trim()).filter(Boolean),
      sortOrder: documentQuery.data?.activitySections.length ?? 0,
    }),
    {
      onSuccess: async () => {
        setActivityDraft({ code: '', title: '', tasks: '' });
        setError('');
        await queryClient.invalidateQueries(['job-function-document', selectedId]);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const updateActivity = useMutation(
    (section: ActivitySection) => apiClient.patch(
      `${documentUrl(selectedId)}/activity-sections/${section.id}`,
      {
        code: section.code,
        title: section.title,
        tasks: section.tasks,
        sortOrder: section.sortOrder,
      },
    ),
    {
      onSuccess: async () => {
        setEditingActivity(null);
        setError('');
        await queryClient.invalidateQueries(['job-function-document', selectedId]);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const reorderActivity = useMutation(
    ({ sectionId, direction }: { sectionId: string; direction: -1 | 1 }) => {
      const rows = [...(documentQuery.data?.activitySections ?? [])];
      const from = rows.findIndex((item) => item.id === sectionId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= rows.length) return Promise.resolve([]);
      [rows[from], rows[to]] = [rows[to], rows[from]];
      return Promise.all(rows.map((item, index) => apiClient.patch(
        `${documentUrl(selectedId)}/activity-sections/${item.id}`,
        { sortOrder: index },
      )));
    },
    {
      onSuccess: () => queryClient.invalidateQueries(['job-function-document', selectedId]),
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const deleteActivity = useMutation(
    (sectionId: string) => apiClient.remove(`${documentUrl(selectedId)}/activity-sections/${sectionId}`),
    {
      onSuccess: () => queryClient.invalidateQueries(['job-function-document', selectedId]),
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const createCustom = useMutation(
    () => {
      const content: Record<string, unknown> = { text: customDraft.content.trim() };
      return apiClient.post(`${documentUrl(selectedId)}/sections`, {
        sectionKey: customDraft.sectionKey.trim(),
        title: customDraft.title.trim(),
        content,
        sortOrder: documentQuery.data?.customSections.length ?? 0,
      });
    },
    {
      onSuccess: async () => {
        setCustomDraft({ sectionKey: '', title: '', content: '' });
        setError('');
        await queryClient.invalidateQueries(['job-function-document', selectedId]);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const updateCustom = useMutation(
    ({ sectionId, content }: { sectionId: string; content: Record<string, unknown> }) =>
      apiClient.patch(`${documentUrl(selectedId)}/sections/${sectionId}`, { content }),
    {
      onSuccess: async () => {
        setEditingCustomId('');
        setError('');
        await queryClient.invalidateQueries(['job-function-document', selectedId]);
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const customSections = documentQuery.data?.customSections ?? [];

  const reorderCustom = useMutation(
    ({ sectionId, direction }: { sectionId: string; direction: -1 | 1 }) => {
      const rows = [...customSections];
      const from = rows.findIndex((item) => item.id === sectionId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= rows.length) return Promise.resolve([]);
      [rows[from], rows[to]] = [rows[to], rows[from]];
      return Promise.all(rows.map((item, index) => apiClient.patch(
        `${documentUrl(selectedId)}/sections/${item.id}`, { sortOrder: index },
      )));
    },
    { onSuccess: () => queryClient.invalidateQueries(['job-function-document', selectedId]), onError: (reason: Error) => setError(reason.message) },
  );

  const deleteCustom = useMutation(
    (sectionId: string) => apiClient.remove(`${documentUrl(selectedId)}/sections/${sectionId}`),
    {
      onSuccess: () => queryClient.invalidateQueries(['job-function-document', selectedId]),
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const activities = documentQuery.data?.activitySections ?? [];
  const competencyBlocks = selectedFunction?.competencyBlocks ?? [];

  return (
    <OrganizationAdminLayout
      activeSection="functions"
      title="Référentiel des fonctions"
      breadcrumbs={[
        { id: 'organization', to: '/organization/overview', label: 'Organisation' },
        { id: 'functions', to: '/organization/functions', label: 'Fiches de fonction' },
      ]}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography level="h1">Fiches de fonction</Typography>
          <Typography level="body-md" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Un modèle documentaire commun, avec des rubriques et des sections d’activités extensibles.
          </Typography>
        </Box>

        {error && (
          <Alert color="danger">
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
              <Typography level="body-sm">{error}</Typography>
              <Button size="sm" variant="plain" color="danger" onClick={() => setError('')}>
                Fermer
              </Button>
            </Stack>
          </Alert>
        )}
        {functionsQuery.isError && <Alert color="danger">Impossible de charger le référentiel des fonctions.</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(250px, 0.8fr) minmax(0, 2fr)' }, gap: 2, alignItems: 'start' }}>
          <Stack spacing={2}>
            <Card variant="outlined" sx={{ gap: 1.25 }}>
              <Typography level="title-lg">Référentiel</Typography>
              {functionsQuery.isLoading && <Typography level="body-sm">Chargement…</Typography>}
              {(functionsQuery.data ?? []).map((jobFunction) => (
                <Button
                  key={jobFunction.id}
                  variant={selectedId === jobFunction.id ? 'soft' : 'plain'}
                  color={selectedId === jobFunction.id ? 'primary' : 'neutral'}
                  sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => { setSelectedId(jobFunction.id); setEditingActivity(null); setEditingCustomId(''); }}
                >
                  <Stack sx={{ alignItems: 'flex-start', gap: 0 }}>
                    <Typography level="title-sm">{jobFunction.name}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{jobFunction.code}</Typography>
                  </Stack>
                </Button>
              ))}
              {!functionsQuery.isLoading && (functionsQuery.data ?? []).length === 0 && (
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucune fiche de fonction pour le moment.</Typography>
              )}
            </Card>
            <Card variant="outlined" sx={{ gap: 1.25 }}>
              <Typography level="title-lg">Créer une fonction</Typography>
              <FormControl><FormLabel>Code</FormLabel><Input value={newCode} onChange={(event) => setNewCode(event.target.value)} placeholder="CHEF-PROJET" /></FormControl>
              <FormControl><FormLabel>Intitulé</FormLabel><Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Chef de projet" /></FormControl>
              <FormControl><FormLabel>Description</FormLabel><Textarea minRows={2} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} /></FormControl>
              <Button disabled={!newCode.trim() || !newName.trim() || createFunction.isLoading} loading={createFunction.isLoading} onClick={() => createFunction.mutate()}>
                Créer la fiche
              </Button>
            </Card>
          </Stack>

          <Stack spacing={2}>
            {!selectedId && (
              <Card variant="outlined">
                <Typography level="title-md">Sélectionnez une fonction</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Choisissez une fiche dans le référentiel ou créez-en une nouvelle.</Typography>
              </Card>
            )}
            {selectedFunction && (
              <>
                <Card variant="outlined" sx={{ gap: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                    <Box>
                      <Typography level="h2">{selectedFunction.name}</Typography>
                      <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Fiche de fonction · {selectedFunction.code}</Typography>
                    </Box>
                    <Stack direction="row" gap={1} alignItems="center"><Chip color="primary" variant="soft">Modèle commun</Chip><Button size="sm" variant={showPreview ? 'solid' : 'outlined'} onClick={() => setShowPreview(!showPreview)}>{showPreview ? 'Masquer l’aperçu' : 'Aperçu de la fiche'}</Button></Stack>
                  </Stack>
                  {documentQuery.isLoading && <Typography level="body-sm">Chargement de la fiche…</Typography>}
                  {documentQuery.isError && <Alert color="danger">Impossible de charger le document de fonction.</Alert>}
                  {documentQuery.data && (
                    <>
                      <Divider />
                      <Typography level="title-lg">Identification et suivi documentaire</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                        <FormControl><FormLabel>Rattachement / entité</FormLabel><Input value={documentDraft.reportingLine} onChange={(event) => setDocumentDraft({ ...documentDraft, reportingLine: event.target.value })} placeholder="Direction des Opérations" /></FormControl>
                        <FormControl><FormLabel>Date</FormLabel><Input type="date" value={documentDraft.documentDate} onChange={(event) => setDocumentDraft({ ...documentDraft, documentDate: event.target.value })} /></FormControl>
                        <FormControl><FormLabel>Autres intitulés (un par ligne)</FormLabel><Textarea minRows={2} value={documentDraft.otherTitles} onChange={(event) => setDocumentDraft({ ...documentDraft, otherTitles: event.target.value })} placeholder="Project Manager\nPM" /></FormControl>
                        <FormControl><FormLabel>Version</FormLabel><Input value={documentDraft.documentVersion} onChange={(event) => setDocumentDraft({ ...documentDraft, documentVersion: event.target.value })} placeholder="V01" /></FormControl>
                        <FormControl><FormLabel>Établie par</FormLabel><Input value={documentDraft.establishedBy} onChange={(event) => setDocumentDraft({ ...documentDraft, establishedBy: event.target.value })} /></FormControl>
                        <FormControl><FormLabel>Validée par</FormLabel><Input value={documentDraft.validatedBy} onChange={(event) => setDocumentDraft({ ...documentDraft, validatedBy: event.target.value })} /></FormControl>
                      </Box>
                      <FormControl><FormLabel>Mission(s)</FormLabel><Textarea minRows={4} value={documentDraft.mission} onChange={(event) => setDocumentDraft({ ...documentDraft, mission: event.target.value })} placeholder="Décrire la finalité et le périmètre de la fonction…" /></FormControl>
                      <Stack direction="row" justifyContent="flex-end">
                        <Button loading={saveDocument.isLoading} disabled={saveDocument.isLoading} onClick={() => saveDocument.mutate()}>Enregistrer les informations</Button>
                      </Stack>
                    </>
                  )}
                </Card>

                {documentQuery.data && (
                  <Card variant="outlined" sx={{ gap: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                      <Box><Typography level="title-lg">Activités et tâches</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Chaque bloc est une section indépendante avec son propre code et son contenu.</Typography></Box>
                      <Chip variant="soft">{activities.length} section(s)</Chip>
                    </Stack>
                    {activities.map((section, index) => (
                      <Card key={section.id} variant="soft" sx={{ gap: 1 }}>
                        {editingActivity?.id === section.id ? (
                          <>
                            <Input value={editingActivity.code} onChange={(event) => setEditingActivity({ ...editingActivity, code: event.target.value })} aria-label="Code de section" />
                            <Input value={editingActivity.title} onChange={(event) => setEditingActivity({ ...editingActivity, title: event.target.value })} aria-label="Titre de section" />
                            <Textarea minRows={4} value={editingActivity.tasks.join('\n')} onChange={(event) => setEditingActivity({ ...editingActivity, tasks: event.target.value.split('\n') })} aria-label="Tâches, une par ligne" />
                            <Stack direction="row" gap={1} justifyContent="flex-end">
                              <Button size="sm" variant="plain" color="neutral" onClick={() => setEditingActivity(null)}>Annuler</Button>
                              <Button size="sm" loading={updateActivity.isLoading} onClick={() => updateActivity.mutate(editingActivity)}>Enregistrer</Button>
                            </Stack>
                          </>
                        ) : (
                          <>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box><Chip size="sm" color="primary" variant="soft">{section.code}</Chip><Typography level="title-md" sx={{ mt: 0.5 }}>{section.title}</Typography></Box>
                              <Stack direction="row" gap={0.5}>
                                <Button size="sm" variant="plain" disabled={index === 0 || reorderActivity.isLoading} onClick={() => reorderActivity.mutate({ sectionId: section.id, direction: -1 })}>↑</Button>
                                <Button size="sm" variant="plain" disabled={index === activities.length - 1 || reorderActivity.isLoading} onClick={() => reorderActivity.mutate({ sectionId: section.id, direction: 1 })}>↓</Button>
                                <Button size="sm" variant="plain" onClick={() => setEditingActivity(section)}>Modifier</Button>
                                <Button size="sm" variant="plain" color="danger" onClick={() => deleteActivity.mutate(section.id)}>Supprimer</Button>
                              </Stack>
                            </Stack>
                            <Stack component="ol" sx={{ m: 0, pl: 3, gap: 0.5 }}>
                              {section.tasks.map((task, taskIndex) => <Typography component="li" level="body-sm" key={taskIndex}>{task}</Typography>)}
                            </Stack>
                          </>
                        )}
                      </Card>
                    ))}
                    <Divider />
                    <Typography level="title-md">Ajouter une section d’activité</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '160px minmax(0, 1fr)' }, gap: 1 }}>
                      <FormControl><FormLabel>Code</FormLabel><Input value={activityDraft.code} onChange={(event) => setActivityDraft({ ...activityDraft, code: event.target.value })} placeholder="CDP-1" /></FormControl>
                      <FormControl><FormLabel>Titre</FormLabel><Input value={activityDraft.title} onChange={(event) => setActivityDraft({ ...activityDraft, title: event.target.value })} placeholder="Organiser et planifier le projet" /></FormControl>
                    </Box>
                    <FormControl><FormLabel>Tâches (une par ligne)</FormLabel><Textarea minRows={4} value={activityDraft.tasks} onChange={(event) => setActivityDraft({ ...activityDraft, tasks: event.target.value })} placeholder="Analyser les objectifs et exigences…&#10;Définir et maintenir le planning…" /></FormControl>
                    <Stack direction="row" justifyContent="flex-end"><Button disabled={!activityDraft.code.trim() || !activityDraft.title.trim() || !activityDraft.tasks.trim()} loading={createActivity.isLoading} onClick={() => createActivity.mutate()}>Ajouter la section</Button></Stack>
                  </Card>
                )}

                {documentQuery.data && (
                  <Card variant="outlined" sx={{ gap: 1.5 }}>
                    <Typography level="title-lg">Compétences de référence</Typography>
                    <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Blocs et compétences rattachés à cette fonction dans le référentiel commun.</Typography>
                    {competencyBlocks.length === 0 && <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucun bloc de compétences n’est encore associé à cette fonction.</Typography>}
                    {competencyBlocks.map((block) => (
                      <Card key={block.id} variant="soft" sx={{ gap: 0.75 }}>
                        <Typography level="title-md">{block.code} · {block.name}</Typography>
                        {block.description && <Typography level="body-xs" sx={{ color: 'text.secondary' }}>{block.description}</Typography>}
                        {competencyCategoryLabels.map((category) => {
                          const items = block.competencies.filter((competency) => competency.category === category.value);
                          if (!items.length) return null;
                          return (
                            <Box key={category.value} sx={{ gap: 0.5, mt: 0.5 }}>
                              <Typography level="title-sm">{category.label}</Typography>
                              {items.map((competency) => (
                                <Box key={competency.id} sx={{ pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
                                  <Typography level="body-sm">{competency.code} · {competency.name}{competency.referenceLevel ? ` (niveau de référence ${competency.referenceLevel}/5)` : ''}</Typography>
                                  {competency.description && <Typography level="body-xs" sx={{ color: 'text.secondary' }}>{competency.description}</Typography>}
                                </Box>
                              ))}
                            </Box>
                          );
                        })}
                        {block.competencies.length === 0 && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Aucune compétence détaillée dans ce bloc.</Typography>}
                        {competencyDraft.blockId === block.id ? (
                          <Stack spacing={1} sx={{ mt: 1 }}>
                            <Typography level="body-sm">Nouvelle compétence</Typography>
                            <Select value={competencyDraft.category} onChange={(_event, value) => value && setCompetencyDraft({ ...competencyDraft, category: value as CompetencyCategory })} aria-label="Catégorie de compétence">
                              {competencyCategoryLabels.map((category) => <Option key={category.value} value={category.value}>{category.label}</Option>)}
                            </Select>
<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '150px minmax(0, 1fr) 110px' }, gap: 1 }}>
                              <Input value={competencyDraft.code} onChange={(event) => setCompetencyDraft({ ...competencyDraft, code: event.target.value })} placeholder="COMP-01" aria-label="Code de compétence" />
                              <Input value={competencyDraft.name} onChange={(event) => setCompetencyDraft({ ...competencyDraft, name: event.target.value })} placeholder="Intitulé de la compétence" aria-label="Intitulé de compétence" />
                              <Input type="number" slotProps={{ input: { min: 1, max: 5 } }} value={competencyDraft.referenceLevel} onChange={(event) => setCompetencyDraft({ ...competencyDraft, referenceLevel: event.target.value })} placeholder="Niveau /5" aria-label="Niveau de référence" />
                            </Box>
                            <Input value={competencyDraft.description} onChange={(event) => setCompetencyDraft({ ...competencyDraft, description: event.target.value })} placeholder="Description (facultative)" aria-label="Description de compétence" />
                            <Stack direction="row" gap={1} justifyContent="flex-end">
                              <Button size="sm" variant="plain" color="neutral" onClick={() => setCompetencyDraft({ blockId: '', code: '', name: '', description: '', referenceLevel: '', category: 'technical' })}>Annuler</Button>
                              <Button size="sm" disabled={!competencyDraft.code.trim() || !competencyDraft.name.trim() || (competencyDraft.referenceLevel !== '' && (Number(competencyDraft.referenceLevel) < 1 || Number(competencyDraft.referenceLevel) > 5))} loading={createCompetency.isLoading} onClick={() => createCompetency.mutate()}>Enregistrer la compétence</Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Button size="sm" variant="soft" color="neutral" sx={{ alignSelf: 'flex-start', mt: 1 }} onClick={() => setCompetencyDraft({ blockId: block.id, code: '', name: '', description: '', referenceLevel: '', category: 'technical' })}>Ajouter une compétence</Button>
                        )}
                      </Card>
                    ))}
                    <Divider />
                    <Typography level="title-md">Créer et associer un bloc de compétences</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Le bloc est créé dans le référentiel commun puis rattaché à cette fiche de fonction.</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '150px minmax(0, 1fr)' }, gap: 1 }}>
                      <Input value={blockDraft.code} onChange={(event) => setBlockDraft({ ...blockDraft, code: event.target.value })} placeholder="CDP-COMP" aria-label="Code du bloc" />
                      <Input value={blockDraft.name} onChange={(event) => setBlockDraft({ ...blockDraft, name: event.target.value })} placeholder="Compétences de pilotage" aria-label="Nom du bloc" />
                    </Box>
                    <Input value={blockDraft.description} onChange={(event) => setBlockDraft({ ...blockDraft, description: event.target.value })} placeholder="Description du bloc (facultative)" aria-label="Description du bloc" />
                    <Stack direction="row" justifyContent="flex-end"><Button disabled={!blockDraft.code.trim() || !blockDraft.name.trim()} loading={createBlock.isLoading} onClick={() => createBlock.mutate()}>Créer et associer le bloc</Button></Stack>
                  </Card>
                )}

                {documentQuery.data && (
                  <Card variant="outlined" sx={{ gap: 1.5 }}>
                    <Typography level="title-lg">Rubriques complémentaires</Typography>
                    <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Ajoutez des rubriques spécifiques sans modifier le modèle documentaire commun. Leur contenu est structuré et pourra recevoir une présentation dédiée.</Typography>
                    {customSections.map((section) => (
                      <Card key={section.id} variant="soft" sx={{ gap: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box><Typography level="title-md">{section.title}</Typography><Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{section.sectionKey}</Typography></Box>
                          <Stack direction="row" gap={0.5}>
                            <Button size="sm" variant="plain" disabled={customSections.indexOf(section) === 0 || reorderCustom.isLoading} onClick={() => reorderCustom.mutate({ sectionId: section.id, direction: -1 })}>↑</Button>
                            <Button size="sm" variant="plain" disabled={customSections.indexOf(section) === customSections.length - 1 || reorderCustom.isLoading} onClick={() => reorderCustom.mutate({ sectionId: section.id, direction: 1 })}>↓</Button>
                            <Button size="sm" variant="plain" onClick={() => { setEditingCustomId(section.id); setCustomContentDraft(String(section.content?.text ?? '')); }}>Modifier</Button>
                            <Button size="sm" variant="plain" color="danger" onClick={() => deleteCustom.mutate(section.id)}>Supprimer</Button>
                          </Stack>
                        </Stack>
                        {editingCustomId === section.id ? (
                          <>
                            <Textarea minRows={4} value={customContentDraft} onChange={(event) => setCustomContentDraft(event.target.value)} />
                            <Stack direction="row" justifyContent="flex-end" gap={1}>
                              <Button size="sm" variant="plain" onClick={() => setEditingCustomId('')}>Annuler</Button>
                              <Button size="sm" onClick={() => {
                                updateCustom.mutate({ sectionId: section.id, content: { ...section.content, text: customContentDraft } });
                              }}>Enregistrer</Button>
                            </Stack>
                          </>
                        ) : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{String(section.content?.text ?? '')}</Typography>}
                      </Card>
                    ))}
                    <Divider />
                    <Typography level="title-md">Ajouter une rubrique</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px minmax(0, 1fr)' }, gap: 1 }}>
                      <FormControl><FormLabel>Clé stable</FormLabel><Input value={customDraft.sectionKey} onChange={(event) => setCustomDraft({ ...customDraft, sectionKey: event.target.value })} placeholder="interfaces" /></FormControl>
                      <FormControl><FormLabel>Titre</FormLabel><Input value={customDraft.title} onChange={(event) => setCustomDraft({ ...customDraft, title: event.target.value })} placeholder="Interfaces et relations" /></FormControl>
                    </Box>
                    <FormControl><FormLabel>Contenu de la rubrique</FormLabel><Textarea minRows={4} value={customDraft.content} onChange={(event) => setCustomDraft({ ...customDraft, content: event.target.value })} placeholder="Saisissez le contenu de cette rubrique…" /></FormControl>
                    <Stack direction="row" justifyContent="flex-end"><Button disabled={!customDraft.sectionKey.trim() || !customDraft.title.trim() || !customDraft.content.trim()} loading={createCustom.isLoading} onClick={() => createCustom.mutate()}>Ajouter la rubrique</Button></Stack>
                  </Card>
                )}
                {showPreview && documentQuery.data && (
                  <Card variant="outlined" sx={{ gap: 1.5 }}>
                    <Typography level="h2">Aperçu de la fiche · {selectedFunction.name}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Version {documentQuery.data.documentVersion || 'non renseignée'} · {documentQuery.data.documentDate || 'Date non renseignée'}</Typography>
                    <Divider />
                    <Typography level="title-lg">Identification</Typography>
                    <Typography level="body-sm">Rattachement : {documentQuery.data.reportingLine || 'Non renseigné'}</Typography>
                    <Typography level="body-sm">Autres intitulés : {(documentQuery.data.otherTitles || []).join(', ') || 'Non renseignés'}</Typography>
                    <Typography level="title-lg">Mission</Typography>
                    <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{documentQuery.data.mission || 'Mission non renseignée'}</Typography>
                    <Typography level="title-lg">Activités et tâches</Typography>
                    {activities.map((section) => (
                      <Box key={section.id} sx={{ gap: 0.5 }}>
                        <Typography level="title-md">{section.code} · {section.title}</Typography>
                        <Stack component="ol" sx={{ m: 0, pl: 3 }}>
                          {section.tasks.map((task, index) => <Typography component="li" level="body-sm" key={index}>{task}</Typography>)}
                        </Stack>
                      </Box>
                    ))}
                    {customSections.map((section) => (
                      <Box key={section.id} sx={{ gap: 0.5 }}>
                        <Typography level="title-md">{section.title}</Typography>
                        <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{String(section.content?.text ?? '')}</Typography>
                      </Box>
                    ))}
                    <Typography level="title-lg">Compétences de référence</Typography>
                    {competencyBlocks.map((block) => (
                      <Box key={block.id} sx={{ gap: 0.5 }}>
                        <Typography level="title-md">{block.code} · {block.name}</Typography>
                        {competencyCategoryLabels.map((category) => {
                          const items = block.competencies.filter((competency) => competency.category === category.value);
                          if (!items.length) return null;
                          return (
                            <Box key={category.value} sx={{ gap: 0.25 }}>
                              <Typography level="title-sm">{category.label}</Typography>
                              {items.map((competency) => <Typography level="body-sm" key={competency.id}>• {competency.name}{competency.referenceLevel ? ` — niveau ${competency.referenceLevel}/5` : ''}</Typography>)}
                            </Box>
                          );
                        })}
                      </Box>
                    ))}
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Établie par : {documentQuery.data.establishedBy || '—'} · Validée par : {documentQuery.data.validatedBy || '—'}</Typography>
                  </Card>
                )}
              </>
            )}
          </Stack>
        </Box>
      </Stack>
    </OrganizationAdminLayout>
  );
};

Component.displayName = 'JobFunctionsContainer';
