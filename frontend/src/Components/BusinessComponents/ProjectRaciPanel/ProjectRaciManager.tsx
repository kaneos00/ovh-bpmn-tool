import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert,
  Box,
  Card,
  CircularProgress,
  FormControl,
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

export const ProjectRaciManager = ({ projectId }: { projectId: string }) => {
  const queryClient = useQueryClient();
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
        if (!process || process.type !== ResourceType.Process) return;
        const contents: Content[] = await contentsQuery(process.id).queryFn();
        const published = contents
          .filter(content => content.status === ContentStatusEnum.Published)
          .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
        if (!published) return;
        const xml = await getXmlContentQuery(process.id, published.id).queryFn();
        if (!xml?.trim()) return;
        const matrix = deriveRaciMatrixFromXml(xml);
        for (const activity of matrix.activities) {
          if (!activity.elementId) continue;
          result.push({
            id: activity.elementId,
            name: activity.activity,
            resourceId: process.id,
            processName: process.name,
            inferredActors: matrix.roles,
          });
        }
      }));
      return result.sort((a, b) =>
        a.processName.localeCompare(b.processName) || a.name.localeCompare(b.name),
      );
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

  const currentEntries = entriesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const actors = useMemo(() => {
    const names = [
      ...tasks.flatMap(task => task.inferredActors),
      ...currentEntries.map(entry => entry.actorName),
    ].map(name => name.trim()).filter(Boolean);
    const uniqueNames = new Map<string, string>();
    names.forEach(name => {
      const key = normalizeActor(name);
      if (key && !uniqueNames.has(key)) uniqueNames.set(key, name);
    });
    return Array.from(uniqueNames.values()).sort((a, b) => a.localeCompare(b));
  }, [tasks, currentEntries]);

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
    const nextEntries = nextRole
      ? [...remaining, {
        resourceId: task.resourceId,
        taskId: task.id,
        taskName: task.name,
        actorName: currentEntries.find(entry =>
          cellKey(entry.resourceId, entry.taskId, entry.actorName) === key,
        )?.actorName ?? actor,
        role: nextRole,
      }]
      : remaining;
    setError(null);
    save.mutate(nextEntries);
  };

  return (
    <Stack spacing={1.5}>
      <Typography level="body-sm">
        Matrice transversale du projet : les lignes sont les activités des processus publiés et les colonnes les acteurs détectés dans les BPMN ou déjà utilisés dans le projet. Modifiez directement une cellule pour affecter R, A, C ou I. Les affectations projet restent indépendantes des propriétés RACI du BPMN.
      </Typography>
      {(error || entriesQuery.isError || processesQuery.isError || tasksQuery.isError || save.isError) && (
        <Alert color="danger">
          {error ?? 'Impossible de charger ou d’enregistrer le RACI du projet.'}
        </Alert>
      )}
      <Typography level="body-sm">
        Acteurs détectés : {actors.length}. La liste rassemble les acteurs des processus publiés et ceux présents dans les affectations du projet.
      </Typography>
      {tasksQuery.isLoading || entriesQuery.isLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
          <CircularProgress size="sm" />
          <Typography level="body-sm">Chargement de la matrice RACI…</Typography>
        </Box>
      ) : tasks.length === 0 ? (
        <Alert color="warning">Aucune activité trouvée dans les dernières versions publiées des processus associés au projet.</Alert>
      ) : (
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
                {actors.map(actor => <th key={normalizeActor(actor)}>{actor}</th>)}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={`${task.resourceId}::${task.id}`}>
                  <td>
                    <Typography level="body-sm" fontWeight="md">{task.name}</Typography>
                    <Typography level="body-xs" textColor="neutral">{task.processName}</Typography>
                  </td>
                  {actors.map(actor => {
                    const entry = entriesByCell.get(cellKey(task.resourceId, task.id, actor));
                    return (
                      <td key={normalizeActor(actor)}>
                        <FormControl size="sm">
                          <Select
                            size="sm"
                            value={entry?.role ?? ''}
                            placeholder="—"
                            disabled={save.isLoading}
                            onChange={(_event, value) => setCell(task, actor, (value || null) as RaciCode | null)}
                            slotProps={{ listbox: { sx: { minWidth: 210 } } }}
                            sx={{ minWidth: 125 }}
                            renderValue={selected => selected ? (
                              <Typography level="body-sm" fontWeight="md">
                                {selected.value} — {ROLE_LABELS[selected.value as RaciCode]}
                              </Typography>
                            ) : null}
                          >
                            <Option value="">— Non attribué</Option>
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
        {tasks.length} activité(s) · {actors.length} acteur(s) · {currentEntries.length} affectation(s) enregistrée(s)
        {save.isLoading ? ' · Enregistrement…' : ''}
      </Typography>
    </Stack>
  );
};
