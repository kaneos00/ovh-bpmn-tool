import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../../queryClient';
import { contentsQuery, getXmlContentQuery } from '../../../api/contents/contents.queries';
import type { Content, Resource } from '../../../Types';
import { ResourceType } from '../../../shared/types/BpmnResource';
import { ContentStatusEnum } from '../../../Types';
import { deriveRaciMatrixFromXml } from '../../../extensions/raci-viewer';
import type { RaciCode } from '../../../extensions/raci-engine';

type ProjectProcessLink = { resourceId: string; resource?: Resource | null };
type TaskOption = {
  id: string;
  name: string;
  resourceId: string;
  processName: string;
  inferredActors: string[];
};
type RaciEntry = {
  id?: string;
  projectId?: string;
  resourceId: string;
  taskId: string;
  taskName: string;
  actorName: string;
  role: RaciCode;
};
type TaskLoadResult = { tasks: TaskOption[]; failedProcesses: string[] };
type ProjectActor = {
  id: string;
  projectId: string;
  name: string;
  normalizedName: string;
  active: boolean;
  origin: 'manual' | 'bpmn';
};
const UNASSIGNED = '__unassigned__';
const ROLES: { value: RaciCode; label: string }[] = [
  { value: 'R', label: 'R — Responsable' },
  { value: 'A', label: 'A — Approbateur / redevable' },
  { value: 'C', label: 'C — Consulté' },
  { value: 'I', label: 'I — Informé' },
];
const ROLE_LABELS: Record<RaciCode, string> = {
  R: 'Responsable',
  A: 'Approbateur / redevable',
  C: 'Consulté',
  I: 'Informé',
};

const normalizeActor = (name: string) => name.trim().toLocaleLowerCase();
const cellKey = (resourceId: string, taskId: string, actorName: string) =>
  `${resourceId}::${taskId}::${normalizeActor(actorName)}`;

export const ProjectRaciManager = ({
  projectId,
  onActivityClick,
}: {
  projectId: string;
  onActivityClick: (processId: string, elementId: string) => void;
}) => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [actorName, setActorName] = useState('');
  const [editingActorId, setEditingActorId] = useState<string | null>(null);
  const [editingActorName, setEditingActorName] = useState('');

  const processesQuery = useQuery<ProjectProcessLink[]>(
    ['project-processes', projectId],
    () => apiClient.get(`/projects/${projectId}/processes`),
    { enabled: Boolean(projectId) },
  );
  const entriesQuery = useQuery<RaciEntry[]>(
    ['project-raci-entries', projectId],
    () => apiClient.get(`/projects/${projectId}/raci`),
    { enabled: Boolean(projectId) },
  );
  const actorsQuery = useQuery<ProjectActor[]>(
    ['project-raci-actors', projectId],
    () => apiClient.get(`/projects/${projectId}/raci/actors`),
    { enabled: Boolean(projectId) },
  );
  const tasksQuery = useQuery<TaskLoadResult>(
    ['project-raci-tasks', projectId, processesQuery.data?.map(item => item.resourceId).join(',')],
    async () => {
      const links = processesQuery.data ?? [];
      const perProcess = await Promise.all(links.map(async link => {
        const process = link.resource;
        if (!process || process.type !== ResourceType.Process) return { tasks: [], failedProcess: null as string | null };
        try {
          const contents: Content[] = await contentsQuery(process.id).queryFn();
          const published = contents
            .filter(content => content.status === ContentStatusEnum.Published)
            .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
          if (!published) return { tasks: [], failedProcess: null as string | null };
          const xml = await getXmlContentQuery(process.id, published.id).queryFn();
          if (!xml?.trim()) return { tasks: [], failedProcess: null as string | null };
          const matrix = deriveRaciMatrixFromXml(xml);
          return {
            tasks: matrix.activities
              .filter(activity => Boolean(activity.elementId))
              .map(activity => ({
                id: activity.elementId,
                name: activity.activity,
                resourceId: process.id,
                processName: process.name,
                inferredActors: matrix.roles,
              })),
            failedProcess: null as string | null,
          };
        } catch {
          // Keep usable activities from other processes, but surface the failed process.
          return { tasks: [], failedProcess: process.name };
        }
      }));
      const uniqueTasks = new Map<string, TaskOption>();
      perProcess.flatMap(result => result.tasks).forEach(task => uniqueTasks.set(`${task.resourceId}::${task.id}`, task));
      return {
        tasks: Array.from(uniqueTasks.values()).sort((a, b) =>
          a.processName.localeCompare(b.processName) || a.name.localeCompare(b.name),
        ),
        failedProcesses: perProcess.flatMap(result => result.failedProcess ? [result.failedProcess] : []),
      };
    },
    { enabled: Boolean(projectId) && Boolean(processesQuery.data), staleTime: 30_000 },
  );

  const refreshActors = async () => {
    await queryClient.invalidateQueries(['project-raci-actors', projectId]);
  };
  const save = useMutation(
    (nextEntries: RaciEntry[]) => apiClient.put(`/projects/${projectId}/raci`, {
      entries: nextEntries.map(({ resourceId, taskId, taskName, actorName: assignedActorName, role }) => ({
        resourceId, taskId, taskName, actorName: assignedActorName, role,
      })),
    }),
    {
      onSuccess: async () => {
        setError(null);
        await queryClient.invalidateQueries(['project-raci-entries', projectId]);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );
  const createActor = useMutation(
    (name: string) => apiClient.post(`/projects/${projectId}/raci/actors`, { name }),
    {
      onSuccess: async () => {
        setActorName('');
        setError(null);
        await refreshActors();
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );
  const syncActors = useMutation(
    (names: string[]) => apiClient.post(`/projects/${projectId}/raci/actors/sync`, { names }),
    {
      onSuccess: async () => {
        setError(null);
        await refreshActors();
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );
  const renameActor = useMutation(
    ({ id, name }: { id: string; name: string }) =>
      apiClient.put(`/projects/${projectId}/raci/actors/${id}`, { name }),
    {
      onSuccess: async () => {
        setEditingActorId(null);
        setEditingActorName('');
        setError(null);
        await Promise.all([
          refreshActors(),
          queryClient.invalidateQueries(['project-raci-entries', projectId]),
        ]);
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );
  const toggleActor = useMutation(
    ({ id, active }: { id: string; active: boolean }) =>
      apiClient.patch(`/projects/${projectId}/raci/actors/${id}`, { active }),
    {
      onSuccess: async () => {
        setError(null);
        await refreshActors();
      },
      onError: (mutationError: Error) => setError(mutationError.message),
    },
  );

  const currentEntries = entriesQuery.data ?? [];
  const tasks = tasksQuery.data?.tasks ?? [];
  const failedProcesses = tasksQuery.data?.failedProcesses ?? [];
  const actors = useMemo(
    () => (actorsQuery.data ?? []).filter(actor => actor.active)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [actorsQuery.data],
  );
  const inferredActors = useMemo(
    () => Array.from(new Set(tasks.flatMap(task => task.inferredActors).map(name => name.trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)),
    [tasks],
  );
  const entriesByCell = useMemo(() => {
    const result = new Map<string, RaciEntry>();
    currentEntries.forEach(entry => result.set(
      cellKey(entry.resourceId, entry.taskId, entry.actorName),
      entry,
    ));
    return result;
  }, [currentEntries]);

  const setCell = (task: TaskOption, actor: string, nextRole: RaciCode | null) => {
    const key = cellKey(task.resourceId, task.id, actor);
    const remaining = currentEntries.filter(entry =>
      cellKey(entry.resourceId, entry.taskId, entry.actorName) !== key,
    );
    const existing = currentEntries.find(entry =>
      cellKey(entry.resourceId, entry.taskId, entry.actorName) === key,
    );
    const nextEntries = nextRole
      ? [...remaining, {
        resourceId: task.resourceId,
        taskId: task.id,
        taskName: task.name,
        actorName: existing?.actorName ?? actor,
        role: nextRole,
      }]
      : remaining;
    setError(null);
    save.mutate(nextEntries);
  };

  const isActorMutationPending = createActor.isLoading || syncActors.isLoading ||
    renameActor.isLoading || toggleActor.isLoading;
  const hasError = error || entriesQuery.isError || processesQuery.isError ||
    tasksQuery.isError || actorsQuery.isError || save.isError;
  const isLoading = processesQuery.isLoading || tasksQuery.isLoading ||
    entriesQuery.isLoading || actorsQuery.isLoading;

  return (
    <Stack spacing={1.5}>
      <Typography level="body-sm">
        Matrice transversale du projet : les lignes sont les activités des dernières versions publiées et les colonnes les acteurs actifs du registre du projet. Les affectations RACI sont enregistrées indépendamment des propriétés RACI des fichiers BPMN.
      </Typography>
      {hasError && (
        <Alert color="danger">
          {error ?? 'Impossible de charger ou d’enregistrer les données RACI du projet.'}
        </Alert>
      )}

      <Card variant="soft" size="sm">
        <Typography level="title-md">Registre des acteurs</Typography>
        <Typography level="body-xs">
          Les acteurs détectés dans les BPMN sont proposés par synchronisation. Une synchronisation n’ajoute que les nouveaux noms et ne réactive jamais un acteur désactivé.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
          <FormControl sx={{ flex: 1 }}>
            <FormLabel>Nouvel acteur</FormLabel>
            <Input
              value={actorName}
              onChange={event => setActorName(event.target.value)}
              placeholder="Nom de l’acteur"
              disabled={isActorMutationPending}
              onKeyDown={event => {
                if (event.key === 'Enter' && actorName.trim()) createActor.mutate(actorName.trim());
              }}
            />
          </FormControl>
          <Button
            loading={createActor.isLoading}
            disabled={!actorName.trim() || isActorMutationPending}
            onClick={() => createActor.mutate(actorName.trim())}
          >
            Ajouter
          </Button>
          <Button
            variant="outlined"
            loading={syncActors.isLoading}
            disabled={tasksQuery.isLoading || isActorMutationPending || inferredActors.length === 0}
            onClick={() => syncActors.mutate(inferredActors)}
          >
            Synchroniser les BPMN ({inferredActors.length})
          </Button>
        </Stack>
        {actorsQuery.isLoading ? (
          <Typography level="body-xs">Chargement des acteurs…</Typography>
        ) : (
          <Stack spacing={0.75}>
            {(actorsQuery.data ?? []).map(actor => (
              <Stack
                key={actor.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                sx={{ p: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                {editingActorId === actor.id ? (
                  <>
                    <Input
                      size="sm"
                      value={editingActorName}
                      onChange={event => setEditingActorName(event.target.value)}
                      disabled={renameActor.isLoading}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size="sm"
                      loading={renameActor.isLoading}
                      disabled={!editingActorName.trim()}
                      onClick={() => renameActor.mutate({ id: actor.id, name: editingActorName.trim() })}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="plain"
                      onClick={() => { setEditingActorId(null); setEditingActorName(''); }}
                    >
                      Annuler
                    </Button>
                  </>
                ) : (
                  <>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography level="body-sm">{actor.name}</Typography>
                      <Typography level="body-xs" textColor="neutral">
                        {actor.origin === 'bpmn' ? 'Détecté dans un BPMN' : 'Ajout manuel'}
                        {!actor.active ? ' · Désactivé' : ''}
                      </Typography>
                    </Box>
                    <Button
                      size="sm"
                      variant="plain"
                      disabled={isActorMutationPending}
                      onClick={() => { setEditingActorId(actor.id); setEditingActorName(actor.name); }}
                    >
                      Renommer
                    </Button>
                    <Button
                      size="sm"
                      variant="soft"
                      color={actor.active ? 'danger' : 'success'}
                      loading={toggleActor.isLoading}
                      disabled={isActorMutationPending}
                      onClick={() => toggleActor.mutate({ id: actor.id, active: !actor.active })}
                    >
                      {actor.active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                  </>
                )}
              </Stack>
            ))}
            {!(actorsQuery.data ?? []).length && (
              <Typography level="body-xs" textColor="neutral">Aucun acteur enregistré. Ajoutez-en un ou synchronisez les BPMN.</Typography>
            )}
          </Stack>
        )}
      </Card>

      <Typography level="body-sm">
        Acteurs actifs : {actors.length}. Les acteurs désactivés restent conservés dans l’historique des affectations, mais ne sont plus proposés comme colonnes.
      </Typography>
      {failedProcesses.length > 0 && (
        <Alert color="warning">
          Impossible de charger les versions publiées de : {failedProcesses.join(', ')}. Les activités des autres processus restent disponibles.
        </Alert>
      )}
      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
          <CircularProgress size="sm" />
          <Typography level="body-sm">Chargement de la matrice RACI…</Typography>
        </Box>
      )}
      {!isLoading && tasks.length === 0 && (
        <Alert color="warning">Aucune activité trouvée dans les dernières versions publiées des processus associés au projet.</Alert>
      )}
      {!isLoading && tasks.length > 0 && (
        <Sheet variant="outlined" sx={{ overflow: 'auto', maxWidth: '100%', borderRadius: 'md' }}>
          <Table
            stickyHeader
            hoverRow
            size="sm"
            sx={{
              minWidth: Math.max(760, 300 + actors.length * 150),
              '& th:first-of-type, & td:first-of-type': {
                position: 'sticky',
                left: 0,
                zIndex: 2,
                bgcolor: 'background.surface',
                minWidth: 270,
              },
              '& thead th:first-of-type': { zIndex: 4 },
              '& td': { verticalAlign: 'middle' },
            }}
          >
            <thead>
              <tr>
                <th>Processus / activité</th>
                {actors.map(actor => <th key={actor.id}>{actor.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={`${task.resourceId}::${task.id}`}>
                  <td>
                    <Button
                      variant="plain"
                      color="neutral"
                      size="sm"
                      sx={{ justifyContent: 'flex-start', px: 0, minHeight: 'auto', textAlign: 'left' }}
                      onClick={() => onActivityClick(task.resourceId, task.id)}
                      title="Ouvrir cette activité dans le diagramme BPMN"
                    >
                      {task.name}
                    </Button>
                    <Typography level="body-xs" textColor="neutral">{task.processName}</Typography>
                  </td>
                  {actors.map(actor => {
                    const entry = entriesByCell.get(cellKey(task.resourceId, task.id, actor.name));
                    return (
                      <td key={actor.id}>
                        <FormControl size="sm">
                          <Select
                            size="sm"
                            value={entry?.role ?? UNASSIGNED}
                            placeholder="—"
                            disabled={save.isLoading || isActorMutationPending}
                            onChange={(_event, value) => setCell(task, actor.name, value === UNASSIGNED || value === null ? null : value as RaciCode)}
                            slotProps={{ listbox: { sx: { minWidth: 210 } } }}
                            sx={{ minWidth: 125 }}
                            renderValue={selected => selected && selected.value !== UNASSIGNED ? (
                              <Typography level="body-sm" fontWeight="md">
                                {selected.value} — {ROLE_LABELS[selected.value as RaciCode]}
                              </Typography>
                            ) : null}
                          >
                            <Option value={UNASSIGNED}>— Non attribué</Option>
                            {ROLES.map(item => (
                              <Option key={item.value} value={item.value}>{item.label}</Option>
                            ))}
                          </Select>
                        </FormControl>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        </Sheet>
      )}
      <Typography level="body-xs" textColor="neutral">
        {tasks.length} activité(s) · {actors.length} acteur(s) actif(s) · {currentEntries.length} affectation(s) enregistrée(s)
        {save.isLoading ? ' · Enregistrement…' : ''}
      </Typography>
    </Stack>
  );
};
