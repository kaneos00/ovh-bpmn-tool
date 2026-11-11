import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert, Box, Button, Card, Chip, Divider, FormControl, FormLabel,
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
  id: string; code: string; name: string;
  competencyBlocks: Array<{ id: string; code: string; name: string }>;
};
type Position = {
  id: string; functionId: string; title: string; description: string | null;
  function?: JobFunction | null;
  competencyBlocks: Array<{ blockId: string; applicability: string; requiredLevel: number | null }>;
};
type PositionGridRow = {
  id: string;
  title: string;
  functionName: string;
  description: string;
  competencyBlockCount: number;
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
  requiredBlocksWithoutActivities: Array<{ positionId: string; positionTitle: string | null; blockId: string }>;
  counts: { positions: number; raciActors: number; raciEntries: number; raciActorMappings: number; activityMappings: number };
  limitations: string[];
};

export const ProjectJobPositions = ({ projectId, canEdit }: { projectId: string; canEdit: boolean }) => {
  const queryClient = useQueryClient();
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [functionId, setFunctionId] = useState('');
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
  })), [positionsQuery.data, functionsQuery.data]);
  const gridColumns = useMemo<ColDef<PositionGridRow>[]>(() => [
    { field: 'title', headerName: 'Poste', flex: 1.3, minWidth: 180 },
    { field: 'functionName', headerName: 'Fonction de référence', flex: 1.2, minWidth: 190 },
    { field: 'competencyBlockCount', headerName: 'Blocs', width: 105, type: 'numericColumn' },
    { field: 'description', headerName: 'Description', flex: 1.5, minWidth: 180 },
  ], []);
  const selectedPosition = (positionsQuery.data ?? []).find(item => item.id === selectedPositionId) ?? null;
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
  const updateBlocks = useMutation(
    (blocks: Position['competencyBlocks']) => apiClient.patch(
      `/projects/${projectId}/job-positions/${selectedPositionId}/competency-blocks`, { blocks },
    ),
    { onSuccess: refresh, onError: (reason: Error) => setError(reason.message) },
  );
  const addActor = useMutation(
    () => apiClient.post(`/projects/${projectId}/job-positions/${selectedPositionId}/raci-actors`, { raciActorId: actorId }),
    { onSuccess: async () => { setActorId(''); setError(''); await refresh(); }, onError: (reason: Error) => setError(reason.message) },
  );
  const removeActor = useMutation(
    (mappingId: string) => apiClient.remove(`/projects/${projectId}/job-positions/${selectedPositionId}/raci-actors/${mappingId}`),
    { onSuccess: refresh, onError: (reason: Error) => setError(reason.message) },
  );
  const addActivity = useMutation(
    () => {
      const [resourceId, taskId] = taskKey.split('::');
      return apiClient.post(`/projects/${projectId}/job-positions/${selectedPositionId}/activity-mappings`, {
        resourceId, taskId, blockId,
      });
    },
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
          </Stack>
        </Stack>
        {diagnosticsQuery.data.unmappedRaciActors.length > 0
          ? <Alert color="warning"><Typography level="title-sm">Acteurs RACI sans correspondance avec un poste</Typography>{diagnosticsQuery.data.unmappedRaciActors.map((actor, index) => <Typography key={actor.name + index} level="body-sm">• {actor.name} — {actor.reason === 'actor_not_in_registry' ? 'absent du registre des acteurs' : 'non associé à un poste'}</Typography>)}</Alert>
          : <Alert color="success">Tous les acteurs présents dans la matrice RACI sont associés à un poste.</Alert>}
        {diagnosticsQuery.data.requiredBlocksWithoutActivities.length > 0
          ? <Alert color="warning"><Typography level="title-sm">Blocs requis sans activité BPMN associée</Typography>{diagnosticsQuery.data.requiredBlocksWithoutActivities.map((item, index) => <Typography key={item.positionId + item.blockId + index} level="body-sm">• {item.positionTitle ?? 'Poste'} — bloc {item.blockId}</Typography>)}</Alert>
          : <Alert color="success">Tous les blocs requis des postes disposent d’au moins une correspondance BPMN.</Alert>}
        {diagnosticsQuery.data.limitations.map((limitation, index) => <Typography key={index} level="body-xs" sx={{ color: 'text.tertiary' }}>Limite : {limitation}</Typography>)}
      </Card>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, alignItems: 'start' }}>
        <Stack spacing={1.5}>
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
                  onRowClicked={event => { setSelectedPositionId(event.data.id); setError(''); }}
                  animateRows
                  overlayNoRowsTemplate="Aucun poste organisationnel pour ce projet."
                />
              </Box>
            )}
            {!positionsQuery.isLoading && !positionsQuery.isError && !gridRows.length &&
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucun poste organisationnel n’a encore été créé pour ce projet.</Typography>}
          </Card>
          {canEdit && <Card variant="outlined" sx={{ gap: 1.25 }}>
            <Typography level="title-lg">Créer un poste</Typography>
            <FormControl>
              <FormLabel>Fonction de référence</FormLabel>
              <Select value={functionId || null} onChange={(_event, value) => setFunctionId(value ?? '')} placeholder="Choisir une fonction">
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
            <Button loading={createPosition.isLoading} disabled={!functionId || !title.trim()} onClick={() => createPosition.mutate()}>Créer le poste</Button>
          </Card>}
        </Stack>

        <Stack spacing={1.5}>
          {!selectedPosition && <Card variant="outlined"><Typography level="title-md">Sélectionnez un poste</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Choisissez un poste existant ou créez-en un nouveau pour définir ses correspondances.</Typography></Card>}
          {selectedPosition && <>
            <Card variant="outlined" sx={{ gap: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box><Typography level="h2">{selectedPosition.title}</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Fonction de référence : {selectedFunction?.name ?? selectedPosition.function?.name ?? '—'}</Typography></Box>
                <Chip color="primary" variant="soft">Poste du projet</Chip>
              </Stack>
              {selectedPosition.description && <Typography level="body-sm">{selectedPosition.description}</Typography>}
              <Divider />
              <Typography level="title-md">Blocs de compétences applicables</Typography>
              <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Précisez quels blocs de la fonction sont requis ou facultatifs dans ce poste.</Typography>
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

            <Card variant="outlined" sx={{ gap: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography level="title-lg">Correspondances avec le RACI</Typography><Chip size="sm" variant="soft">{mappings.raciActors.length}</Chip></Stack>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Associez le poste à un ou plusieurs rôles déjà présents dans le registre RACI de ce projet. Cela ne modifie aucune affectation RACI.</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                <FormControl sx={{ flex: 1 }}><FormLabel>Rôle RACI du projet</FormLabel>
                  <Select value={actorId || null} disabled={!canEdit} onChange={(_event, value) => setActorId(value ?? '')} placeholder="Choisir un rôle">
                    {activeActors.filter(actor => !mappedActorIds.has(actor.id)).map(actor => <Option key={actor.id} value={actor.id}>{actor.name}</Option>)}
                  </Select>
                </FormControl>
                <Button sx={{ alignSelf: { sm: 'flex-end' } }} disabled={!canEdit || !actorId} loading={addActor.isLoading} onClick={() => addActor.mutate()}>Associer</Button>
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

            <Card variant="outlined" sx={{ gap: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography level="title-lg">Correspondances avec les activités BPMN</Typography><Chip size="sm" variant="soft">{mappings.activities.length}</Chip></Stack>
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Reliez un bloc applicable à une activité d’un processus publié du projet. Le serveur vérifie l’identifiant technique de l’activité dans la dernière version publiée.</Typography>
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
              <Button disabled={!canEdit || !blockId || !taskKey} loading={addActivity.isLoading} onClick={() => addActivity.mutate()}>Associer l’activité</Button>
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
