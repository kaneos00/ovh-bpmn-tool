import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '../../queryClient';

const ACTIVE_PROJECT_KEY = 'bpmn-tool:active-project';
const ACTIVE_PROJECT_EVENT = 'bpmn-tool:active-project-changed';

export type WorkspaceProject = {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  trigram: string | null;
  icon: string;
  role: 'viewer' | 'modeler' | 'admin';
  canSubmitRemarks: boolean;
  processes: Array<{
    resourceId: string;
    name: string;
    usage: 'common' | 'variant' | 'project-specific';
    sourceResourceId: string | null;
  }>;
};
type WorkspaceSummary = { userId: string; projects: WorkspaceProject[] };

const readActiveProjectId = () => {
  try { return window.localStorage.getItem(ACTIVE_PROJECT_KEY); } catch { return null; }
};

export const useActiveProject = () => {
  const workspaceQuery = useQuery<WorkspaceSummary>(
    ['my-workspace'],
    () => apiClient.get('/projects/me/workspace'),
    { staleTime: 30_000 },
  );
  const [storedProjectId, setStoredProjectId] = useState<string | null>(readActiveProjectId);

  useEffect(() => {
    const sync = () => setStoredProjectId(readActiveProjectId());
    window.addEventListener(ACTIVE_PROJECT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(ACTIVE_PROJECT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const projects = workspaceQuery.data?.projects ?? [];
  useEffect(() => {
    if (!workspaceQuery.isSuccess) return;
    const valid = storedProjectId && projects.some(project => project.id === storedProjectId);
    if (valid) return;
    const nextId = projects.length === 1 ? projects[0].id : null;
    try {
      if (nextId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, nextId);
      else window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch { /* Storage is best-effort. */ }
    setStoredProjectId(nextId);
  }, [workspaceQuery.isSuccess, storedProjectId, projects]);

  const setActiveProject = useCallback((projectId: string | null) => {
    try {
      if (projectId) window.localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
      else window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch { /* Storage is best-effort. */ }
    setStoredProjectId(projectId);
    window.dispatchEvent(new Event(ACTIVE_PROJECT_EVENT));
  }, []);

  const activeProject = useMemo(
    () => projects.find(project => project.id === storedProjectId) ?? null,
    [projects, storedProjectId],
  );
  const projectProcessIds = useMemo(
    () => new Set(activeProject?.processes.map(process => process.resourceId) ?? []),
    [activeProject],
  );
  return {
    projects, activeProject, activeProjectId: activeProject?.id ?? null,
    projectProcessIds, setActiveProject,
    isLoading: workspaceQuery.isLoading, isError: workspaceQuery.isError,
  };
};
