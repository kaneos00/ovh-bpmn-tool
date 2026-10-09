import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  Sheet,
  Typography,
} from '@mui/joy';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../../api/resources/resources.queries';
import { contentsQuery, getXmlContentQuery } from '../../../api/contents/contents.queries';
import { ContentStatusEnum, type Content, type Resource } from '../../../Types';
import { ResourceType } from '../../../shared/types/BpmnResource';
import { deriveRaciMatrixFromXml } from '../../../extensions/raci-viewer';
import type { RaciCode } from '../../../extensions/raci-engine';

type RaciAssignment = {
  processId: string;
  processName: string;
  elementId: string;
  activityName: string;
  code: RaciCode;
};

type RoleGroup = {
  name: string;
  assignments: RaciAssignment[];
};

type ProjectRaciData = {
  processCount: number;
  publishedProcessCount: number;
  roles: RoleGroup[];
};

const RAC_CODES: RaciCode[] = ['R', 'A', 'C', 'I'];
const CODE_LABELS: Record<RaciCode, string> = {
  R: 'Responsable',
  A: 'Approbateur / redevable',
  C: 'Consulté',
  I: 'Informé',
};

const getProjectProcesses = (
  resources: Resource[],
  currentResourceId: string,
): Resource[] => {
  const processes = resources.filter(resource => resource.type === ResourceType.Process);
  if (!currentResourceId || currentResourceId === 'root') return processes;

  const byId = new Map(resources.map(resource => [resource.id, resource]));
  let current = byId.get(currentResourceId);
  if (!current) return processes;

  // The project scope is the top-level folder containing the selected resource.
  // If a process is itself at the root, scope the panel to that process.
  while (current.parentId && byId.has(current.parentId)) {
    current = byId.get(current.parentId)!;
  }
  const projectRootId = current.id;

  const belongsToProject = (resource: Resource): boolean => {
    let cursor: Resource | undefined = resource;
    while (cursor?.parentId && byId.has(cursor.parentId)) {
      if (cursor.parentId === projectRootId) return true;
      cursor = byId.get(cursor.parentId);
    }
    return cursor?.id === projectRootId;
  };

  return processes.filter(process => belongsToProject(process));
};

const loadProjectRaci = async (currentResourceId: string): Promise<ProjectRaciData> => {
  const resources = await resourcesQuery().queryFn();
  const processes = getProjectProcesses(resources, currentResourceId);
  const rolesByName = new Map<string, RoleGroup>();
  let publishedProcessCount = 0;

  await Promise.all(processes.map(async process => {
    try {
      const contents: Content[] = await contentsQuery(process.id).queryFn();
      const published = contents.find(content => content.status === ContentStatusEnum.Published);
      if (!published) return;

      const xml = await getXmlContentQuery(process.id, published.id).queryFn();
      if (!xml || !xml.trim()) return;
      publishedProcessCount += 1;

      const matrix = deriveRaciMatrixFromXml(xml);
      for (const roleName of matrix.roles) {
        const key = roleName.trim().toLocaleLowerCase();
        if (!key) continue;
        if (!rolesByName.has(key)) {
          rolesByName.set(key, { name: roleName.trim(), assignments: [] });
        }
      }

      for (const activity of matrix.activities) {
        for (const cell of activity.cells) {
          if (!cell.codes.length) continue;
          const key = cell.role.trim().toLocaleLowerCase();
          if (!key) continue;
          if (!rolesByName.has(key)) {
            rolesByName.set(key, { name: cell.role.trim(), assignments: [] });
          }
          const group = rolesByName.get(key)!;
          for (const code of cell.codes) {
            group.assignments.push({
              processId: process.id,
              processName: process.name,
              elementId: activity.elementId,
              activityName: activity.activity,
              code,
            });
          }
        }
      }
    } catch {
      // Keep the rest of the project's RACI available if one process cannot load.
    }
  }));

  const roles = Array.from(rolesByName.values())
    .map(role => ({
      ...role,
      assignments: role.assignments.sort((a, b) =>
        a.processName.localeCompare(b.processName) ||
        a.activityName.localeCompare(b.activityName) ||
        RAC_CODES.indexOf(a.code) - RAC_CODES.indexOf(b.code),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { processCount: processes.length, publishedProcessCount, roles };
};

type ProjectRaciPanelProps = {
  currentResourceId: string;
  onActivityClick: (processId: string, elementId: string) => void;
};

export const ProjectRaciPanel = ({
  currentResourceId,
  onActivityClick,
}: ProjectRaciPanelProps) => {
  const { data, isLoading, isError } = useQuery(
    ['project-raci', currentResourceId],
    () => loadProjectRaci(currentResourceId),
    { staleTime: 30_000 },
  );

  const assignmentCount = useMemo(
    () => data?.roles.reduce((total, role) => total + role.assignments.length, 0) ?? 0,
    [data],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
        <CircularProgress size="sm" />
        <Typography level="body-sm">Chargement du RACI du projet…</Typography>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Alert color="danger" variant="soft" sx={{ m: 1 }}>
        Impossible de charger le RACI des processus du projet.
      </Alert>
    );
  }

  if (data.processCount === 0) {
    return (
      <Typography level="body-sm" textColor="neutral" sx={{ p: 1.5 }}>
        Aucun processus trouvé dans ce projet.
      </Typography>
    );
  }

  return (
    <Box sx={{ px: 1, pb: 2 }}>
      <Typography level="body-xs" textColor="neutral" sx={{ px: 0.5, py: 1 }}>
        {data.roles.length} rôle(s) · {assignmentCount} affectation(s) RACI · {data.publishedProcessCount}/{data.processCount} processus publiés
      </Typography>
      {data.roles.length === 0 ? (
        <Typography level="body-sm" textColor="neutral" sx={{ p: 1 }}>
          Aucun rôle RACI trouvé dans les versions publiées.
        </Typography>
      ) : (
        <List sx={{ '--ListItem-radius': '8px', '--ListItem-minHeight': '30px', '--List-gap': '6px' }}>
          {data.roles.map(role => (
            <ListItem key={role.name} sx={{ display: 'block', p: 0 }}>
              <Sheet variant="soft" sx={{ borderRadius: 'md', p: 1 }}>
                <Typography level="title-sm">{role.name}</Typography>
                <Divider sx={{ my: 0.75 }} />
                {role.assignments.length === 0 ? (
                  <Typography level="body-xs" textColor="neutral">
                    Aucun rôle attribué à une activité.
                  </Typography>
                ) : (
                  RAC_CODES.map(code => {
                    const assignments = role.assignments.filter(item => item.code === code);
                    if (!assignments.length) return null;
                    return (
                      <Box key={code} sx={{ mb: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                          <Chip size="sm" variant="soft" color={code === 'R' ? 'primary' : code === 'A' ? 'success' : code === 'C' ? 'warning' : 'neutral'}>
                            {code}
                          </Chip>
                          <Typography level="body-xs" textColor="neutral">{CODE_LABELS[code]}</Typography>
                        </Box>
                        {assignments.map((assignment, index) => (
                          <Box
                            key={`${assignment.processId}:${assignment.elementId}:${code}:${index}`}
                            component="button"
                            onClick={() => onActivityClick(assignment.processId, assignment.elementId)}
                            title={`Ouvrir ${assignment.processName} — ${assignment.activityName}`}
                            sx={{
                              display: 'block',
                              width: '100%',
                              textAlign: 'left',
                              border: 0,
                              background: 'transparent',
                              color: 'text.primary',
                              cursor: 'pointer',
                              borderRadius: 'sm',
                              px: 0.75,
                              py: 0.5,
                              font: 'inherit',
                              '&:hover': { bgcolor: 'background.level1' },
                            }}
                          >
                            <Typography level="body-xs" sx={{ fontWeight: 600 }}>
                              {assignment.activityName}
                            </Typography>
                            <Typography level="body-xs" textColor="neutral">
                              {assignment.processName}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })
                )}
              </Sheet>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};
