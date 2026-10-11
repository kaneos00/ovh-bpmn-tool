import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Stack,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../../queryClient';
import { contentsQuery, getXmlContentQuery } from '../../../api/contents/contents.queries';
import type { Content, Resource } from '../../../Types';
import { ContentStatusEnum } from '../../../Types';
import { deriveRaciMatrixFromXml } from '../../../extensions/raci-viewer';
import type { RaciCode } from '../../../extensions/raci-engine';

type ProjectProcessLink = { resourceId: string; resource?: Resource | null };
type TaskOption = { id: string; name: string; resourceId: string; processName: string };
type RaciEntry = {
  id?: string;
  projectId?: string;
  resourceId: string;
  taskId: string;
  taskName: string;
  actorName: string;
  role: RaciCode;
};
const ROLES: { value: RaciCode; label: string }[] = [
  { value: 'R', label: 'R — Responsable' },
  { value: 'A', label: 'A — Acteur / redevable' },
  { value: 'C', label: 'C — Consulté' },
  { value: 'I', label: 'I — Informé' },
];

export const ProjectRaciManager = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient();
  const [resourceId, setResourceId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [actorName, setActorName] = useState('');
  const [role, setRole] = useState<RaciCode>('R');
  const [error, setError] = useState<string | null>(null);

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
  const tasksQuery = useQuery<TaskOption[]>(
    ['project-raci-tasks', projectId, processesQuery.data?.map(item => item.resourceId).join(',')],
    async () => {
      const links = processesQuery.data ?? [];
      const result: TaskOption[] = [];
      await Promise.all(links.map(async link => {
        const process = link.resource;
        if (!process || process.type !== 'Process') return;
        const contents: Content[] = await contentsQuery(process.id).queryFn();
        const published = contents
          .filter(content => content.status === ContentStatusEnum.Published)
          .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
        if (!published) return;
        const xml = await getXmlContentQuery(process.id, published.id).queryFn();
        if (!xml?.trim()) return;
        const matrix = deriveRaciMatrixFromXml(xml);
        for (const activity of matrix.activities) {
          result.push({
            id: activity.elementId,
            name: activity.activity,
            resourceId: process.id,
            processName: process.name,
          });
        }
      }));
      return result.sort((a, b) => a.processName.localeCompare(b.processName) || a.name.localeCompare(b.name));
    },
    { enabled: Boolean(projectId) && Boolean(processesQuery.data), staleTime: 30_000 },
  );

  const save = useMutation(
    (nextEntries: RaciEntry[]) => apiClient.put(`/projects/${projectId}/raci`, {
      entries: nextEntries.map(({ resourceId, taskId, taskName, actorName, role }) => ({
        resourceId, taskId, taskName, actorName, role,
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

  const selectedTask = useMemo(
    () => (tasksQuery.data ?? []).find(task => task.id === taskId && task.resourceId === resourceId),
    [tasksQuery.data, taskId, resourceId],
  );
  const currentEntries = entriesQuery.data ?? [];
  const addEntry = () => {
    if (!selectedTask || !actorName.trim()) {
      setError('Choisissez un processus et une activité, puis saisissez un acteur.');
      return;
    }
    const duplicate = currentEntries.some(entry =>
      entry.resourceId === selectedTask.resourceId &&
      entry.taskId === selectedTask.id &&
      entry.actorName.toLocaleLowerCase() === actorName.trim().toLocaleLowerCase(),
    );
    if (duplicate) {
      setError('Cet acteur possède déjà une affectation RACI sur cette activité de ce processus.');
      return;
    }
    const next = [...currentEntries, {
      resourceId: selectedTask.resourceId,
      taskId: selectedTask.id,
      taskName: selectedTask.name,
      actorName: actorName.trim(),
      role,
    }];
    setError(null);
    save.mutate(next);
    setActorName('');
  };
  const removeEntry = (index: number) => {
    save.mutate(currentEntries.filter((_entry, currentIndex) => currentIndex !== index));
  };

  return (
    <Stack spacing={1.5}>
      <Typography level="body-sm">
        Ces affectations sont enregistrées pour ce projet et sont indépendantes des affectations inscrites directement dans le fichier BPMN.
      </Typography>
      {(error || entriesQuery.isError || processesQuery.isError || tasksQuery.isError) && (
        <Alert color="danger">
          {error ?? 'Impossible de charger ou d’enregistrer le RACI du projet.'}
        </Alert>
      )}
      <Card variant="soft">
        <Typography level="title-md">Ajouter une affectation</Typography>
        <Stack spacing={1.25}>
          <FormControl>
            <FormLabel>Activité du processus publié</FormLabel>
            <Select
              placeholder={tasksQuery.isLoading ? 'Chargement des activités…' : 'Choisir une activité'}
              value={taskId ? `${resourceId}::${taskId}` : null}
              onChange={(_event, value) => {
                const selected = (tasksQuery.data ?? []).find(task => `${task.resourceId}::${task.id}` === value);
                setResourceId(selected?.resourceId ?? '');
                setTaskId(selected?.id ?? '');
              }}
            >
              {(tasksQuery.data ?? []).map(task => (
                <Option key={`${task.resourceId}::${task.id}`} value={`${task.resourceId}::${task.id}`}>
                  {task.processName} — {task.name}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Acteur</FormLabel>
            <Input value={actorName} onChange={event => setActorName(event.target.value)} placeholder="Ex. Responsable qualité" />
          </FormControl>
          <FormControl>
            <FormLabel>Rôle RACI</FormLabel>
            <Select value={role} onChange={(_event, value) => value && setRole(value as RaciCode)}>
              {ROLES.map(item => <Option key={item.value} value={item.value}>{item.label}</Option>)}
            </Select>
          </FormControl>
          <Box>
            <Button loading={save.isLoading} disabled={!selectedTask || !actorName.trim() || save.isLoading} onClick={addEntry}>
              Ajouter l’affectation
            </Button>
          </Box>
        </Stack>
      </Card>
      <Typography level="title-md">Affectations enregistrées ({currentEntries.length})</Typography>
      {entriesQuery.isLoading && <Typography level="body-sm">Chargement des affectations…</Typography>}
      {!entriesQuery.isLoading && currentEntries.length === 0 && (
        <Typography level="body-sm">Aucune affectation RACI spécifique au projet.</Typography>
      )}
      {currentEntries.map((entry, index) => {
        const process = (processesQuery.data ?? []).find(item => item.resourceId === entry.resourceId)?.resource;
        return (
          <Card key={entry.id ?? `${entry.resourceId}:${entry.taskId}:${entry.actorName}`} variant="outlined" orientation="horizontal" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography level="title-sm">{entry.actorName} — {entry.role}</Typography>
              <Typography level="body-sm">{process?.name ?? entry.resourceId} · {entry.taskName}</Typography>
            </Box>
            <Button color="danger" variant="plain" size="sm" disabled={save.isLoading} onClick={() => removeEntry(index)}>Retirer</Button>
          </Card>
        );
      })}
    </Stack>
  );
};
