import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert, Box, Button, Card, Checkbox, Chip, Divider, FormControl, FormLabel,
  Input, Option, Select, Stack, Typography,
} from '@mui/joy';
import { apiClient } from '../../../queryClient';
import { contentsQuery, getXmlContentQuery } from '../../../api/contents/contents.queries';
import type { Content, Resource } from '../../../Types';
import { ContentStatusEnum } from '../../../Types';
import { ResourceType } from '../../../shared/types/BpmnResource';
import { deriveRaciMatrixFromXml } from '../../../extensions/raci-viewer';

ModuleRegistry.registerModules([AllCommunityModule]);

type JobFunction = {
  id: string; code: string; name: string; description?: string | null;
  competencyBlocks: Array<{ id: string; code: string; name: string }>;
};
type Position = {
  id: string; functionId: string; title: string; description: string | null;
  function?: JobFunction | null;
  competencyBlocks: Array<{ blockId: string; applicability: string; requiredLevel: number | null }>;
};
type PositionReadinessStatus = 'to_complete' | 'to_review' | 'ready' | 'pending';
type PositionGridRow = {
  id: string;
  title: string;
  functionName: string;
  description: string;
  competencyBlockCount: number;
  readinessStatus: PositionReadinessStatus;
};
type PositionValidation = {
  positionId: string;
  positionTitle: string;
  status: Exclude<PositionReadinessStatus, 'pending'>;
  counts: {
    competencyBlocks: number;
    competencyBlocksNotAssessed: number;
    raciActors: number;
    raciActorsWithoutAssignments: number;
    requiredBlocksWithoutActivities: number;
    raciAssignmentsWithoutActivity: number;
    staleActivityMappings: number;
  };
  unassessedBlockIds: string[];
  unusedRaciActors: string[];
  missingRequiredBlockIds: string[];
};
type Actor = { id: string; name: string; active: boolean };
type ProcessLink = { resourceId: string; resource: Resource | null };
type TaskOption = { resourceId: string; taskId: string; taskName: string; processName: string };
type MappingState = {
  raciActors: Array<{ id: string; raciActorId: string }>;
  activities: Array<{ id: string; resourceId: string; taskId: string; blockId: string }>;
};
type ProjectDiagnostics = {
  unmappedRaciActors: Array<{ name: string; actorId: string | null; reason: string }>;
  raciAssignmentsWithoutPositionActivity: Array<{
    actorName: string; taskName: string; taskId: string; resourceId: string;
    role: string; positionIds: string[]; positionTitles: string[];
  }>;
  requiredBlocksWithoutActivities: Array<{ positionId: string; positionTitle: string | null; blockId: string }>;
  staleActivityMappings: Array<{
    id: string; positionId: string; resourceId: string; taskId: string;
    blockId: string; reason: string;
  }>;
  positionValidation: PositionValidation[];
  counts: { positions: number; raciActors: number; raciEntries: number; raciActorMappings: number; activityMappings: number };
  limitations: string[];
};

const readinessLabel = (status: PositionReadinessStatus) => {
  if (status === 'ready') return 'Prêt à valider';
  if (status === 'to_review') return 'À vérifier';
  if (status === 'to_complete') return 'À compléter';
  return 'Calcul en cours';
};

const readinessColor = (status: PositionReadinessStatus): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 'ready') return 'success';
  if (status === 'to_review') return 'warning';
  if (status === 'to_complete') return 'danger';
  return 'neutral';
};

const staleActivityReasonLabel = (reason: string) => {
  if (reason === 'process_without_published_content') return 'aucune version publiée';
  if (reason === 'published_bpmn_unreadable') return 'version publiée illisible';
  return 'activité absente de la dernière publication';
};

const raciActorReasonLabel = (reason: string) => {
  if (reason === 'actor_not_in_registry') return 'absent du registre des acteurs';
  if (reason === 'actor_inactive') return 'acteur désactivé dans le registre RACI';
  return 'non associé à un poste actif';
};

const overlapScore = (left: string, right: string) => {
  const stopWords = new Set(['della', 'delle', 'dello', 'dell', 'degli', 'dalla', 'dalle', 'dallo', 'dai', 'dagli', 'per', 'con', 'una', 'uno', 'che', 'del', 'dei', 'nel', 'nella', 'nelle', 'nello', 'alla', 'alle', 'allo', 'agli', 'the', 'and']);
  const tokens = (value: string) => new Set(value.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(token => token.length > 3 && !stopWords.has(token)));
  const leftTokens = tokens(left);
  return Array.from(tokens(right)).filter(token => leftTokens.has(token)).length;
};

export const ProjectJobPositions = ({ projectId, canEdit }: { projectId: string; canEdit: boolean }) => {
  const queryClient = useQueryClient();
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [functionId, setFunctionId] = useState('');
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actorId, setActorId] = useState('');
  const [taskKey, setTaskKey] = useState('');
  const [blockId, setBlockId] = useState('');
  const [error, setError] = useState('');

  const positionsKey = ['job-positions', projectId];
  const functionsQuery = useQuery<JobFunction[]>(
    ['job-architecture-functions'],
    () => apiClient.get('/job-architecture/functions'),
  );
  const positionsQuery = useQuery<Position[]>(
    positionsKey, () => apiClient.get(`/projects/${projectId}/job-positions`),
    { enabled: Boolean(projectId) },
  );
  const diagnosticsQuery = useQuery<ProjectDiagnostics>(
    ['job-position-diagnostics', projectId],
    () => apiClient.get(`/projects/${projectId}/job-architecture/diagnostics`),
    { enabled: Boolean(projectId) },
  );
  const actorsQuery = useQuery<Actor[]>(
    ['project-raci-actors', projectId],
    () => apiClient.get(`/projects/${projectId}/raci/actors`),
    { enabled: Boolean(projectId) },
  );
  const processesQuery = useQuery<ProcessLink[]>(
    ['project-processes', projectId],
    () => apiClient.get(`/projects/${projectId}/processes`),
    { enabled: Boolean(projectId) },
  );
  const gridRows = useMemo<PositionGridRow[]>(() => (positionsQuery.data ?? []).map(position => ({
    id: position.id,
    title: position.title,
    functionName: position.function?.name ?? functionsQuery.data?.find(item => item.id === position.functionId)?.name ?? 'Fonction de référence',
    description: position.description ?? '',
    competencyBlockCount: position.function?.competencyBlocks?.length
      ?? functionsQuery.data?.find(item => item.id === position.functionId)?.competencyBlocks?.length
      ?? position.competencyBlocks.length,
    readinessStatus: diagnosticsQuery.data?.positionValidation.find(item => item.positionId === position.id)?.status ?? 'pending',
  })), [positionsQuery.data, functionsQuery.data, diagnosticsQuery.data]);
  const existingFunctionIds = new Set((positionsQuery.data ?? []).map(position => position.functionId));
  const gridColumns = useMemo<ColDef<PositionGridRow>[]>(() => [
    { field: 'title', headerName: 'Poste', flex: 1.3, minWidth: 180 },
    { field: 'functionName', headerName: 'Fonction de référence', flex: 1.2, minWidth: 190 },
    { field: 'competencyBlockCount', headerName: 'Blocs', width: 105, type: 'numericColumn' },
    {
      field: 'readinessStatus',
      headerName: 'Préparation',
      width: 165,
      cellRenderer: (params: ICellRendererParams<PositionGridRow, PositionReadinessStatus>) => {
        const status = (params.value ?? 'pending') as PositionReadinessStatus;
        return <Chip size="sm" variant="soft" color={readinessColor(status)}>{readinessLabel(status)}</Chip>;
      },
    },
    { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 180 },
  ], []);
  const selectedPosition = (positionsQuery.data ?? []).find(item => item.id === selectedPositionId) ?? null;
  const selectedPositionValidation = diagnosticsQuery.data?.positionValidation.find(
    item => item.positionId === selectedPositionId,
  );
  const readinessCounts = {
    ready: diagnosticsQuery.data?.positionValidation.filter(item => item.status === 'ready').length ?? 0,
    toReview: diagnosticsQuery.data?.positionValidation.filter(item => item.status === 'to_review').length ?? 0,
    toComplete: diagnosticsQuery.data?.positionValidation.filter(item => item.status === 'to_complete').length ?? 0,
  };
  const mappingsQuery = useQuery<MappingState>(
    ['job-position-mappings', projectId, selectedPositionId],
    () => apiClient.get(`/projects/${projectId}/job-positions/${selectedPositionId}/mappings`),
    { enabled: Boolean(projectId && selectedPositionId) },
  );
  const tasksQuery = useQuery<TaskOption[]>(
    ['job-position-tasks', projectId, (processesQuery.data ?? []).map(item => item.resourceId).join(',')],
    async () => {
      const results = await Promise.all((processesQuery.data ?? []).map(async link => {
        const process = link.resource;
        if (!process || process.type !== ResourceType.Process) return [];
        const contents: Content[] = await contentsQuery(process.id).queryFn();
        const published = contents.filter(item => item.status === ContentStatusEnum.Published)
          .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
        if (!published) return [];
        const xml = await getXmlContentQuery(process.id, published.id).queryFn();
        if (!xml?.trim()) return [];
        const matrix = deriveRaciMatrixFromXml(xml);
        return matrix.activities.filter(item => Boolean(item.elementId)).map(item => ({
          resourceId: process.id, taskId: item.elementId, taskName: item.activity,
          processName: process.name,
        }));
      }));
      return results.flat().sort((a, b) =>
        a.processName.localeCompare(b.processName) || a.taskName.localeCompare(b.taskName));
    },
    { enabled: Boolean(projectId) && Boolean(processesQuery.data), staleTime: 30_000 },
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries(positionsKey),
      queryClient.invalidateQueries(['job-position-diagnostics', projectId]),
      queryClient.invalidateQueries(['job-position-mappings', projectId, selectedPositionId]),
      queryClient.invalidateQueries(['project-raci-actors', projectId]),
    ]);
  };
  const createPosition = useMutation(
    () => apiClient.post(`/projects/${projectId}/job-positions`, {
      functionId, title: title.trim(), description: description.trim() || null,
    }),
    { onSuccess: async (created: Position) => {
      setTitle(''); setDescription(''); setError(''); setSelectedPositionId(created.id);
      await queryClient.invalidateQueries(positionsKey);
      await queryClient.invalidateQueries(['job-position-diagnostics', projectId]);
    }, onError: (reason: Error) => setError(reason.message) },
  );
  const createSelectedPositions = useMutation(
    async () => {
      const selected = (functionsQuery.data ?? []).filter(item => selectedFunctionIds.includes(item.id));
      const created: Position[] = [];
      for (const item of selected) {
        created.push(await apiClient.post(`/projects/${projectId}/job-positions`, {
          functionId: item.id, title: item.name, description: item.description?.trim() || null,
        }));
      }
      return created;
    },
    { onSuccess: async (created: Position[]) => {
      setSelectedFunctionIds([]); setError('');
      if (created.length) setSelectedPositionId(created[0].id);
      await queryClient.invalidateQueries(positionsKey);
      await queryClient.invalidateQueries(['job-position-diagnostics', projectId]);
    }, onError: (reason: Error) => setError(reason.message) },
  );
  const updateBlocks = useMutation(
    (blocks: Position['competencyBlocks']) => apiClient.patch(
      `/projects/${projectId}/job-positions/${selectedPositionId}/competency-blocks`, { blocks },
    ),
    { onSuccess: refresh, onError: (reason: Error) => setError(reason.message) },
  );
  const addActor = useMutation(
    (selectedActorId: string) => apiClient.post(`/projects/${projectId}/job-positions/${selectedPositionId}/raci-actors`, { raciActorId: selectedActorId }),
    { onSuccess: async () => { setActorId(''); setError(''); await refresh(); }, onError: (reason: Error) => setError(reason.message) },
  );
  const removeActor = useMutation(
    (mappingId: string) => apiClient.remove(`/projects/${projectId}/job-positions/${selectedPositionId}/raci-actors/${mappingId}`),
    { onSuccess: refresh, onError: (reason: Error) => setError(reason.message) },
  );
  const addActivity = useMutation(
    (selection: { resourceId: string; taskId: string; blockId: string }) => apiClient.post(
      `/projects/${projectId}/job-positions/${selectedPositionId}/activity-mappings`, selection,
    ),
    { onSuccess: async () => { setTaskKey(''); setBlockId(''); setError(''); await refresh(); }, onError: (reason: Error) => setError(reason.message) },
  );
  const removeActivity = useMutation(
    (mappingId: string) => apiClient.remove(`/projects/${projectId}/job-positions/${selectedPositionId}/activity-mappings/${mappingId}`),
    { onSuccess: refresh, onError: (reason: Error) => setError(reason.message) },
  );

  const selectedFunction = useMemo(
    () => (functionsQuery.data ?? []).find(item => item.id === selectedPosition?.functionId) ?? selectedPosition?.function ?? null,
    [functionsQuery.data, selectedPosition],
  );
  const activeActors = (actorsQuery.data ?? []).filter(actor => actor.active);
  const mappings = mappingsQuery.data ?? { raciActors: [], activities: [] };
  const mappedActorIds = new Set(mappings.raciActors.map(item => item.raciActorId));
  const mappedActivityKeys = new Set(mappings.activities.map(item => `${item.resourceId}::${item.taskId}::${item.blockId}`));
  const suggestedActors = activeActors
    .filter(actor => !mappedActorIds.has(actor.id))
    .map(actor => ({ actor, score: overlapScore(`${selectedPosition?.title ?? ''} ${selectedFunction?.name ?? ''}`, actor.name) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const applicableBlocks = (selectedFunction?.competencyBlocks ?? []).filter(block =>
    ['required', 'optional'].includes(selectedPosition?.competencyBlocks.find(item => item.blockId === block.id)?.applicability ?? ''),
  );
  const suggestedActivities = applicableBlocks.flatMap(block => (tasksQuery.data ?? [])
    .filter(task => !mappedActivityKeys.has(`${task.resourceId}::${task.taskId}::${block.id}`))
    .map(task => ({ block, task, score: overlapScore(block.name, task.taskName) })))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography level="h2">Postes organisationnels</Typography>
        <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Déclinaison des fonctions de référence dans ce projet. Les associations relient le poste aux rôles RACI et aux activités publiées, sans modifier les diagrammes ni les affectations existantes.
        </Typography>
      </Box>
      {!canEdit && <Alert color="neutral" variant="soft">Consultation seule : seuls les membres ayant les droits de modélisation ou d’administration du projet peuvent modifier les postes et leurs correspondances.</Alert>}
      {functionsQuery.isError && <Alert color="danger">Impossible de charger le référentiel des fonctions. Vérifiez vos droits et réessayez.</Alert>}
      {positionsQuery.isError && <Alert color="danger">Impossible de charger les postes organisationnels de ce projet.</Alert>}
      {diagnosticsQuery.isLoading && <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Calcul du bilan de cohérence…</Typography>}
      {diagnosticsQuery.isError && <Alert color="warning">Le bilan de cohérence du projet n’est pas disponible pour le moment.</Alert>}
      {error && <Alert color="danger" endDecorator={<Button size="sm" variant="plain" color="danger" onClick={() => setError('')}>Fermer</Button>}>{error}</Alert>}
      {diagnosticsQuery.data && <Card variant="outlined" sx={{ gap: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
          <Box><Typography level="title-lg">Bilan de cohérence</Typography><Typography level="body-xs" sx={{ color: 'text.secondary' }}>Contrôle des liens entre le registre RACI, les postes et les activités BPMN.</Typography></Box>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip size="sm" variant="soft">{diagnosticsQuery.data.counts.positions} poste(s)</Chip>
            <Chip size="sm" variant="soft">{diagnosticsQuery.data.counts.raciActorMappings} lien(s) RACI</Chip>
            <Chip size="sm" variant="soft">{diagnosticsQuery.data.counts.activityMappings} lien(s) BPMN</Chip>
            <Chip size="sm" variant="soft" color="success">{readinessCounts.ready} prêt(s)</Chip>
            <Chip size="sm" variant="soft" color="warning">{readinessCounts.toReview} à vérifier</Chip>
            <Chip size="sm" variant="soft" color="danger">{readinessCounts.toComplete} à compléter</Chip>
          </Stack>
        </Stack>
        {diagnosticsQuery.data.unmappedRaciActors.length > 0
          ? <Alert color="warning"><Typography level="title-sm">Acteurs RACI sans correspondance avec un poste</Typography>{diagnosticsQuery.data.unmappedRaciActors.map((actor, index) => <Typography key={actor.name + index} level="body-sm">• {actor.name} — {raciActorReasonLabel(actor.reason)}</Typography>)}</Alert>
          : <Alert color="success">Tous les acteurs présents dans la matrice RACI sont associés à un poste.</Alert>}
        {diagnosticsQuery.data.raciAssignmentsWithoutPositionActivity.length > 0
          ? <Alert color="warning">
              <Typography level="title-sm">Affectations RACI sans correspondance poste–activité</Typography>
              <Typography level="body-xs">Ces responsabilités existent dans la matrice, mais aucune activité correspondante n’est reliée à un des postes associés au rôle. Les affectations RACI ne sont pas modifiées.</Typography>
              {diagnosticsQuery.data.raciAssignmentsWithoutPositionActivity.map((item, index) => (
                <Typography key={item.resourceId + item.taskId + item.actorName + item.role + index} level="body-sm">
                  • {item.actorName} ({item.role}) — {item.taskName}
                  {item.positionTitles.length ? ` · Poste(s) : ${item.positionTitles.join(', ')}` : ' · Aucun poste associé'}
                </Typography>
              ))}
            </Alert>
          : <Alert color="success">Les affectations RACI des rôles associés disposent d’une correspondance poste–activité.</Alert>}
        {diagnosticsQuery.data.staleActivityMappings.length > 0
          ? <Alert color="warning">
              <Typography level="title-sm">Liens BPMN à actualiser</Typography>
              <Typography level="body-xs">Ces activités enregistrées ne sont plus présentes dans la dernière version publiée. Les liens sont conservés pour correction manuelle.</Typography>
              {diagnosticsQuery.data.staleActivityMappings.map(item => (
                <Typography key={item.id} level="body-sm">• {item.taskId} — {staleActivityReasonLabel(item.reason)}</Typography>
              ))}
            </Alert>
          : <Alert color="success">Tous les liens BPMN enregistrés correspondent à la dernière version publiée.</Alert>}
        {diagnosticsQuery.data.requiredBlocksWithoutActivities.length > 0
          ? <Alert color="warning"><Typography level="title-sm">Blocs requis sans activité BPMN associée</Typography>{diagnosticsQuery.data.requiredBlocksWithoutActivities.map((item, index) => <Typography key={item.positionId + item.blockId + index} level="body-sm">• {item.positionTitle ?? 'Poste'} — bloc {item.blockId}</Typography>)}</Alert>
          : <Alert color="success">Tous les blocs requis des postes disposent d’au moins une correspondance BPMN.</Alert>}
        {diagnosticsQuery.data.limitations.map((limitation, index) => <Typography key={index} level="body-xs" sx={{ color: 'text.tertiary' }}>Limite : {limitation}</Typography>)}
      </Card>}
      <Card variant="outlined" sx={{ gap: 1.25 }}>
        <Typography level="title-lg">Parcours de configuration</Typography>
        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
          Vous pouvez passer librement d’une étape à l’autre. Les modifications enregistrées sont conservées lorsque vous revenez sur une étape.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          {[
            { label: '1. Postes', hint: `${positionsQuery.data?.length ?? 0} créé(s)` },
            { label: '2. Compétences', hint: selectedPosition ? `${selectedPosition.competencyBlocks.filter(item => ['required', 'optional'].includes(item.applicability)).length} applicable(s)` : 'Choisir un poste' },
            { label: '3. RACI', hint: selectedPosition ? `${mappings.raciActors.length} association(s)` : 'Choisir un poste' },
            { label: '4. Processus', hint: selectedPosition ? `${mappings.activities.length} association(s)` : 'Choisir un poste' },
          ].map((step, index) => (
            <Button key={step.label} variant={activeStep === index ? 'solid' : 'soft'} color={activeStep === index ? 'primary' : 'neutral'}
              onClick={() => setActiveStep(index)} sx={{ flex: 1, minWidth: 0, alignItems: 'flex-start', flexDirection: 'column', gap: 0.25 }}>
              <Typography level="title-sm" sx={{ color: 'inherit' }}>{step.label}</Typography>
              <Typography level="body-xs" sx={{ color: 'inherit', opacity: 0.8 }}>{step.hint}</Typography>
            </Button>
          ))}
        </Stack>
        {activeStep > 0 && (
          <FormControl>
            <FormLabel>Poste en cours de configuration</FormLabel>
            <Select value={selectedPositionId || null} onChange={(_event, value) => { setSelectedPositionId(value ?? ''); setError(''); }} placeholder="Choisir un poste du projet">
              {(positionsQuery.data ?? []).map(position => <Option key={position.id} value={position.id}>{position.title}</Option>)}
            </Select>
          </FormControl>
        )}
      </Card>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, alignItems: 'start' }}>
        <Stack spacing={1.5} sx={{ display: activeStep === 0 ? 'flex' : 'none' }}>
          <Card variant="outlined" sx={{ gap: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography level="title-lg">Postes du projet</Typography>
              <Chip size="sm" variant="soft">{positionsQuery.data?.length ?? 0}</Chip>
            </Stack>
            {positionsQuery.isLoading && <Typography level="body-sm">Chargement des postes…</Typography>}
            {positionsQuery.isError && <Alert color="danger">La liste des postes n’est pas disponible.</Alert>}
            {!positionsQuery.isLoading && !positionsQuery.isError && gridRows.length > 0 && (
              <Box sx={{ width: '100%', height: 360, minWidth: 0 }}>
                <AgGridReact<PositionGridRow>
                  theme={themeQuartz}
                  rowData={gridRows}
                  columnDefs={gridColumns}
                  defaultColDef={{ sortable: true, filter: true, resizable: true }}
                  getRowId={params => params.data.id}
                  onRowClicked={event => { if (!event.data) return; setSelectedPositionId(event.data.id); setError(''); }}
                  animateRows
                  overlayNoRowsTemplate="Aucun poste organisationnel pour ce projet."
                />
              </Box>
            )}
            {!positionsQuery.isLoading && !positionsQuery.isError && !gridRows.length &&
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucun poste organisationnel n’a encore été créé pour ce projet.</Typography>}
          </Card>
          {canEdit && <Card variant="outlined" sx={{ gap: 1.25 }}>
            <Typography level="title-lg">Ajouter les fonctions nécessaires au projet</Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Sélectionnez les fonctions du référentiel à intégrer. Un poste est créé pour chacune, avec l’intitulé et la description déjà repris de la fiche de fonction. Vous pourrez ensuite préciser les blocs et les correspondances.</Typography>
            <Stack spacing={0.75}>
              {(functionsQuery.data ?? []).map(item => {
                const alreadyAdded = existingFunctionIds.has(item.id);
                return <Checkbox key={item.id} checked={selectedFunctionIds.includes(item.id)} disabled={alreadyAdded || createSelectedPositions.isLoading}
                  onChange={event => setSelectedFunctionIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}
                  label={<Box><Typography level="body-sm">{item.code} — {item.name}</Typography>{alreadyAdded && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Déjà présent dans le projet</Typography>}</Box>} />;
              })}
              {!(functionsQuery.data ?? []).length && <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Le référentiel ne contient encore aucune fonction active.</Typography>}
            </Stack>
            <Button disabled={!selectedFunctionIds.length || createSelectedPositions.isLoading} loading={createSelectedPositions.isLoading} onClick={() => createSelectedPositions.mutate()}>
              Ajouter {selectedFunctionIds.length} fonction(s) sélectionnée(s)
            </Button>
          </Card>}
          {canEdit && <Card variant="outlined" sx={{ gap: 1.25 }}>
            <Typography level="title-lg">Ajouter un poste personnalisé</Typography>
            <FormControl>
              <FormLabel>Fonction de référence</FormLabel>
              <Select value={functionId || null} onChange={(_event, value) => {
                const selected = (functionsQuery.data ?? []).find(item => item.id === value);
                setFunctionId(value ?? ''); setTitle(selected?.name ?? ''); setDescription(selected?.description ?? '');
              }} placeholder="Choisir une fonction">
                {(functionsQuery.data ?? []).map(item => <Option key={item.id} value={item.id}>{item.code} — {item.name}</Option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Intitulé du poste dans le projet</FormLabel>
              <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex. Responsable validation" />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input value={description} onChange={event => setDescription(event.target.value)} placeholder="Périmètre propre au projet (facultatif)" />
            </FormControl>
            <Button loading={createPosition.isLoading} disabled={!functionId || !title.trim()} onClick={() => createPosition.mutate()}>Créer le poste personnalisé</Button>
          </Card>}
        </Stack>

        <Stack spacing={1.5} sx={{ display: activeStep === 0 ? 'none' : 'flex' }}>
          {activeStep > 0 && !selectedPosition && <Card variant="outlined"><Typography level="title-md">Sélectionnez un poste</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Choisissez un poste existant ou créez-en un nouveau pour définir ses correspondances.</Typography></Card>}
          {selectedPosition && <>
            {selectedPositionValidation && (
              <Card variant="soft" sx={{ gap: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Box>
                    <Typography level="title-md">Préparation de la fiche de poste</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                      État calculé à partir des compétences, des rôles RACI et des liens avec les activités BPMN.
                    </Typography>
                  </Box>
                  <Chip size="lg" variant="soft" color={readinessColor(selectedPositionValidation.status)}>
                    {readinessLabel(selectedPositionValidation.status)}
                  </Chip>
                </Stack>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Chip size="sm" variant="outlined">
                    {selectedPositionValidation.counts.competencyBlocksNotAssessed} bloc(s) à qualifier
                  </Chip>
                  <Chip size="sm" variant="outlined">
                    {selectedPositionValidation.counts.raciActors} rôle(s) RACI associé(s)
                  </Chip>
                  <Chip size="sm" variant="outlined">
                    {selectedPositionValidation.counts.raciAssignmentsWithoutActivity} affectation(s) RACI sans lien BPMN
                  </Chip>
                  <Chip size="sm" variant="outlined">
                    {selectedPositionValidation.counts.requiredBlocksWithoutActivities} bloc(s) requis sans activité
                  </Chip>
                  <Chip size="sm" variant="outlined">
                    {selectedPositionValidation.counts.staleActivityMappings} lien(s) BPMN à actualiser
                  </Chip>
                </Stack>
                {selectedPositionValidation.unassessedBlockIds.length > 0 && (
                  <Typography level="body-sm">
                    À qualifier : bloc(s) {selectedPositionValidation.unassessedBlockIds.join(', ')}.
                  </Typography>
                )}
                {selectedPositionValidation.unusedRaciActors.length > 0 && (
                  <Typography level="body-sm">
                    Rôle(s) associé(s) mais sans affectation dans la matrice : {selectedPositionValidation.unusedRaciActors.join(', ')}.
                  </Typography>
                )}
                {selectedPositionValidation.missingRequiredBlockIds.length > 0 && (
                  <Typography level="body-sm">
                    Bloc(s) requis sans activité BPMN : {selectedPositionValidation.missingRequiredBlockIds.join(', ')}.
                  </Typography>
                )}
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  « Prêt à valider » signifie que les contrôles de préparation sont satisfaits. Ce statut ne constitue pas une validation hiérarchique ou une approbation formelle.
                </Typography>
              </Card>
            )}
            <Card variant="outlined" sx={{ gap: 1, display: activeStep === 1 ? 'flex' : 'none' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box><Typography level="h2">{selectedPosition.title}</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Fonction de référence : {selectedFunction?.name ?? selectedPosition.function?.name ?? '—'}</Typography></Box>
                <Chip color="primary" variant="soft">Poste du projet</Chip>
              </Stack>
              {selectedPosition.description && <Typography level="body-sm">{selectedPosition.description}</Typography>}
              <Divider />
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                <Box><Typography level="title-md">Blocs de compétences applicables</Typography><Typography level="body-xs" sx={{ color: 'text.secondary' }}>Les blocs sont déjà repris de la fonction. Vous pouvez les définir tous comme requis, puis ajuster les exceptions.</Typography></Box>
                <Button size="sm" variant="soft" color="neutral" disabled={!canEdit || updateBlocks.isLoading || !(selectedFunction?.competencyBlocks ?? []).length}
                  onClick={() => updateBlocks.mutate((selectedFunction?.competencyBlocks ?? []).map(block => ({ blockId: block.id, applicability: 'required', requiredLevel: selectedPosition.competencyBlocks.find(item => item.blockId === block.id)?.requiredLevel ?? null })))}>
                  Définir tous comme requis
                </Button>
              </Stack>
              {(selectedFunction?.competencyBlocks ?? []).map(block => {
                const current = selectedPosition.competencyBlocks.find(item => item.blockId === block.id);
                return <Stack key={block.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
                  <Box sx={{ flex: 1 }}><Typography level="body-sm">{block.code} — {block.name}</Typography></Box>
                  <Select size="sm" value={current?.applicability ?? 'not_assessed'} disabled={!canEdit || updateBlocks.isLoading} sx={{ minWidth: 210 }}
                    onChange={(_event, value) => {
                      const next = (selectedFunction?.competencyBlocks ?? []).map(item => {
                        const previous = selectedPosition.competencyBlocks.find(row => row.blockId === item.id);
                        return { blockId: item.id, applicability: item.id === block.id ? (value ?? 'not_assessed') : (previous?.applicability ?? 'not_assessed'), requiredLevel: item.id === block.id && !['required','optional'].includes(value ?? '') ? null : (previous?.requiredLevel ?? null) };
                      });
                      updateBlocks.mutate(next);
                    }}>
                    <Option value="required">Requis</Option><Option value="optional">Facultatif</Option><Option value="not_applicable">Non applicable</Option><Option value="not_assessed">Non évalué</Option>
                  </Select>
                </Stack>;
              })}
              {!(selectedFunction?.competencyBlocks ?? []).length && <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Cette fonction ne comporte aucun bloc de compétences.</Typography>}
            </Card>

            <Card variant="outlined" sx={{ gap: 1.25, display: activeStep === 2 ? 'flex' : 'none' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography level="title-lg">Correspondances avec le RACI</Typography><Chip size="sm" variant="soft">{mappings.raciActors.length}</Chip></Stack>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Les rôles déjà présents dans le registre RACI sont proposés lorsqu’un intitulé partage des termes avec ce poste. Chaque proposition doit être confirmée ; les affectations RACI ne sont jamais modifiées.</Typography>
              {suggestedActors.length > 0 && <Card variant="soft" sx={{ gap: 0.75 }}>
                <Typography level="title-sm">Rôles pouvant correspondre — à confirmer</Typography>
                {suggestedActors.map(({ actor }) => <Stack key={actor.id} direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                  <Typography level="body-sm">{actor.name}</Typography>
                  <Button size="sm" variant="soft" disabled={!canEdit || addActor.isLoading} onClick={() => addActor.mutate(actor.id)}>Confirmer</Button>
                </Stack>)}
              </Card>}
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                <FormControl sx={{ flex: 1 }}><FormLabel>Rôle RACI du projet</FormLabel>
                  <Select value={actorId || null} disabled={!canEdit} onChange={(_event, value) => setActorId(value ?? '')} placeholder="Choisir un rôle">
                    {activeActors.filter(actor => !mappedActorIds.has(actor.id)).map(actor => <Option key={actor.id} value={actor.id}>{actor.name}</Option>)}
                  </Select>
                </FormControl>
                <Button sx={{ alignSelf: { sm: 'flex-end' } }} disabled={!canEdit || !actorId} loading={addActor.isLoading} onClick={() => addActor.mutate(actorId)}>Associer</Button>
              </Stack>
              {mappings.raciActors.map(mapping => {
                const actor = actorsQuery.data?.find(item => item.id === mapping.raciActorId);
                return <Stack key={mapping.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 'sm', bgcolor: 'background.level1' }}>
                  <Typography level="body-sm">{actor?.name ?? 'Rôle RACI indisponible'}</Typography>
                  <Button size="sm" color="danger" variant="plain" loading={removeActor.isLoading} disabled={!canEdit} onClick={() => removeActor.mutate(mapping.id)}>Retirer</Button>
                </Stack>;
              })}
              {!mappings.raciActors.length && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Aucun rôle RACI associé.</Typography>}
            </Card>

            <Card variant="outlined" sx={{ gap: 1.25, display: activeStep === 3 ? 'flex' : 'none' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography level="title-lg">Correspondances avec les activités BPMN</Typography><Chip size="sm" variant="soft">{mappings.activities.length}</Chip></Stack>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>L’application compare les intitulés des blocs avec les activités des processus publiés pour faire ressortir des pistes. Les propositions restent à confirmer et ne modifient jamais le BPMN.</Typography>
              {suggestedActivities.length > 0 && <Card variant="soft" sx={{ gap: 0.75 }}>
                <Typography level="title-sm">Activités pouvant correspondre — à confirmer</Typography>
                {suggestedActivities.map(({ block, task }) => <Stack key={`${task.resourceId}::${task.taskId}::${block.id}`} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                  <Box sx={{ flex: 1 }}><Typography level="body-sm">{block.name} ← {task.taskName}</Typography><Typography level="body-xs" sx={{ color: 'text.secondary' }}>{task.processName}</Typography></Box>
                  <Button size="sm" variant="soft" disabled={!canEdit || addActivity.isLoading} onClick={() => addActivity.mutate({ resourceId: task.resourceId, taskId: task.taskId, blockId: block.id })}>Confirmer</Button>
                </Stack>)}
              </Card>}
              <FormControl><FormLabel>Bloc de compétences</FormLabel>
                <Select value={blockId || null} disabled={!canEdit} onChange={(_event, value) => setBlockId(value ?? '')} placeholder="Choisir un bloc">
                  {(selectedFunction?.competencyBlocks ?? []).filter(block => ['required','optional'].includes(selectedPosition.competencyBlocks.find(item => item.blockId === block.id)?.applicability ?? '')).map(block => <Option key={block.id} value={block.id}>{block.code} — {block.name}</Option>)}
                </Select>
              </FormControl>
              <FormControl><FormLabel>Activité BPMN publiée</FormLabel>
                <Select value={taskKey || null} disabled={!canEdit} onChange={(_event, value) => setTaskKey(value ?? '')} placeholder={tasksQuery.isLoading ? 'Chargement des activités…' : 'Choisir une activité'}>
                  {(tasksQuery.data ?? []).filter(task => !mappedActivityKeys.has(`${task.resourceId}::${task.taskId}::${blockId}`)).map(task => <Option key={`${task.resourceId}::${task.taskId}`} value={`${task.resourceId}::${task.taskId}`}>{task.processName} — {task.taskName} ({task.taskId})</Option>)}
                </Select>
              </FormControl>
              <Button disabled={!canEdit || !blockId || !taskKey} loading={addActivity.isLoading} onClick={() => { const [resourceId, taskId] = taskKey.split('::'); addActivity.mutate({ resourceId, taskId, blockId }); }}>Associer l’activité</Button>
              {mappings.activities.map(mapping => {
                const block = selectedFunction?.competencyBlocks.find(item => item.id === mapping.blockId);
                const task = tasksQuery.data?.find(item => item.resourceId === mapping.resourceId && item.taskId === mapping.taskId);
                return <Stack key={mapping.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1} sx={{ p: 1, borderRadius: 'sm', bgcolor: 'background.level1' }}>
                  <Box sx={{ flex: 1 }}><Typography level="body-sm">{task?.taskName ?? mapping.taskId}</Typography><Typography level="body-xs" sx={{ color: 'text.secondary' }}>{task?.processName ?? mapping.resourceId} · {block?.code ?? 'Bloc'}</Typography></Box>
                  <Button size="sm" color="danger" variant="plain" loading={removeActivity.isLoading} disabled={!canEdit} onClick={() => removeActivity.mutate(mapping.id)}>Retirer</Button>
                </Stack>;
              })}
              {!mappings.activities.length && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Aucune activité BPMN associée.</Typography>}
              {tasksQuery.isError && <Alert color="warning">Impossible de lire les activités des processus. Vérifiez que les processus sont publiés.</Alert>}
              {!tasksQuery.isLoading && !tasksQuery.isError && !(tasksQuery.data ?? []).length && <Alert color="warning">Aucune activité disponible : associez un processus au projet et publiez au moins une version.</Alert>}
            </Card>
          </>}
        </Stack>
      </Box>
    </Stack>
  );
};
