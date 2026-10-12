import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Input,
  Sheet,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Table,
  Typography,
} from '@mui/joy';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { apiClient } from '../../queryClient';
import { Resource } from '../../Types';

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: 'viewer' | 'modeler' | 'admin';
};

type ProjectProcessLink = {
  id: string;
  projectId: string;
  resourceId: string;
  usage: 'common' | 'variant' | 'project-specific';
  sourceResourceId: string | null;
  resource: Resource | null;
};

type ProjectSnapshot = {
  project: Project;
  members: ProjectMember[];
  processes: ProjectProcessLink[];
};

type UserSnapshot = {
  userId: string;
  projects: Array<{ project: Project; role: ProjectMember['role'] }>;
};

const ROLE_LABELS: Record<ProjectMember['role'], string> = {
  admin: 'Admin',
  modeler: 'Modélisateur',
  viewer: 'Lecteur',
};

const USAGE_LABELS: Record<ProjectProcessLink['usage'], string> = {
  common: 'Organisationnel commun',
  variant: 'Variante',
  'project-specific': 'Spécifique au projet',
};

const USAGE_COLORS: Record<ProjectProcessLink['usage'], 'success' | 'primary' | 'warning'> = {
  common: 'success',
  variant: 'warning',
  'project-specific': 'primary',
};

const adminOverviewKey = ['admin-overview'];

async function loadAdminOverview(): Promise<ProjectSnapshot[]> {
  // Existing API scope is intentionally preserved: /projects only returns
  // projects for which the current identity has a membership.
  const projects = (await apiClient.get('/projects')) as Project[];
  return Promise.all(
    projects.map(async (project) => {
      const [members, processes] = await Promise.all([
        apiClient.get(`/projects/${project.id}/members`) as Promise<ProjectMember[]>,
        apiClient.get(`/projects/${project.id}/processes`) as Promise<ProjectProcessLink[]>,
      ]);
      return { project, members, processes };
    }),
  );
}

export const Component = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const overviewQuery = useQuery<ProjectSnapshot[]>(
    adminOverviewKey,
    loadAdminOverview,
    { staleTime: 30_000 },
  );

  const snapshots = overviewQuery.data ?? [];
  const users = useMemo(() => {
    const byUser = new Map<string, UserSnapshot>();
    snapshots.forEach(({ project, members }) => {
      members.forEach((member) => {
        const user = byUser.get(member.userId) ?? { userId: member.userId, projects: [] };
        user.projects.push({ project, role: member.role });
        byUser.set(member.userId, user);
      });
    });
    return [...byUser.values()].sort((a, b) => a.userId.localeCompare(b.userId));
  }, [snapshots]);

  const processes = useMemo(() => {
    const byResource = new Map<string, {
      resourceId: string;
      name: string;
      usage: ProjectProcessLink['usage'];
      sourceResourceId: string | null;
      projects: Project[];
    }>();
    snapshots.forEach(({ project, processes: links }) => {
      links.forEach((link) => {
        const item = byResource.get(link.resourceId) ?? {
          resourceId: link.resourceId,
          name: link.resource?.name ?? link.resourceId,
          usage: link.usage,
          sourceResourceId: link.sourceResourceId,
          projects: [],
        };
        if (!item.projects.some((linkedProject) => linkedProject.id === project.id)) {
          item.projects.push(project);
        }
        // If a resource is shared by multiple projects, "common" is the
        // meaningful cross-project classification for the catalogue view.
        if (link.usage === 'common') item.usage = 'common';
        byResource.set(link.resourceId, item);
      });
    });
    return [...byResource.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [snapshots]);

  const filteredProjects = snapshots.filter(({ project, members, processes: links }) => {
    const haystack = [
      project.name,
      project.description ?? '',
      ...members.map((member) => member.userId),
      ...links.map((link) => link.resource?.name ?? link.resourceId),
    ].join(' ').toLocaleLowerCase();
    return haystack.includes(search.toLocaleLowerCase());
  });

  const filteredUsers = users.filter((user) =>
    [user.userId, ...user.projects.map(({ project, role }) => `${project.name} ${role}`)]
      .join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  const filteredProcesses = processes.filter((process) =>
    [process.name, USAGE_LABELS[process.usage], ...process.projects.map((project) => project.name)]
      .join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );

  return (
    <Sheet sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 4 }, minHeight: '100%' }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography level="h1" sx={{ fontSize: { xs: '1.7rem', md: '2rem' } }}>
              Administration
            </Typography>
            <Typography level="body-md" sx={{ mt: 0.75 }}>
              Vue transversale des utilisateurs, des projets et des processus accessibles à votre compte.
            </Typography>
          </Box>
          <Button variant="outlined" color="neutral" onClick={() => navigate('/root')}>
            Retour au référentiel BPMN
          </Button>
        </Stack>

        <Alert color="neutral" variant="soft">
          Cette vue agrège les projets dont vous êtes membre. Elle ne prétend pas lister les comptes de toute l’organisation : une vue exhaustive nécessitera un rôle d’administration organisationnelle et une API dédiée.
        </Alert>

        {overviewQuery.isLoading && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size="sm" />
            <Typography>Chargement des projets, membres et processus…</Typography>
          </Stack>
        )}
        {overviewQuery.isError && (
          <Alert color="danger">
            Impossible de charger la vue d’administration. Vérifiez vos droits sur les projets et réessayez.
            <Button size="sm" variant="plain" color="danger" onClick={() => overviewQuery.refetch()}>
              Réessayer
            </Button>
          </Alert>
        )}

        {!overviewQuery.isLoading && !overviewQuery.isError && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
              <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md' }}>
                <Typography level="body-sm">Projets accessibles</Typography>
                <Typography level="h2">{snapshots.length}</Typography>
              </Sheet>
              <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md' }}>
                <Typography level="body-sm">Utilisateurs recensés</Typography>
                <Typography level="h2">{users.length}</Typography>
              </Sheet>
              <Sheet variant="outlined" sx={{ p: 2, borderRadius: 'md' }}>
                <Typography level="body-sm">Processus distincts</Typography>
                <Typography level="h2">{processes.length}</Typography>
              </Sheet>
            </Box>

            <Tabs value={tab} onChange={(_event, value) => { setTab(value as number); setSearch(''); }}>
              <TabList>
                <Tab>Utilisateurs ({users.length})</Tab>
                <Tab>Projets ({snapshots.length})</Tab>
                <Tab>Processus ({processes.length})</Tab>
              </TabList>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  startDecorator={<SearchRounded />}
                  placeholder={
                    tab === 0 ? 'Rechercher un utilisateur, un projet ou un rôle…'
                      : tab === 1 ? 'Rechercher un projet, un membre ou un processus…'
                        : 'Rechercher un processus ou un projet utilisateur…'
                  }
                  sx={{ width: '100%', maxWidth: 600 }}
                />
                <Button variant="plain" color="neutral" onClick={() => setSearch('')}>Effacer</Button>
              </Box>

              <TabPanel value={0} sx={{ p: 0 }}>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                  <Table hoverRow stickyHeader>
                    <thead><tr><th>Utilisateur / identifiant</th><th>Projets accessibles</th><th>Rôles projet</th><th>Accès</th></tr></thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.userId}>
                          <td><Typography level="title-sm">{user.userId}</Typography><Typography level="body-xs" textColor="neutral.500">Identifiant transmis par le proxy</Typography></td>
                          <td><Stack direction="row" gap={0.75} useFlexGap flexWrap="wrap">
                            {user.projects.map(({ project }) => (
                              <Button key={project.id} size="sm" variant="soft" color="neutral" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</Button>
                            ))}
                          </Stack></td>
                          <td><Stack direction="row" gap={0.75} useFlexGap flexWrap="wrap">
                            {user.projects.map(({ project, role }) => <Chip key={project.id} size="sm" variant="soft">{project.name}: {ROLE_LABELS[role]}</Chip>)}
                          </Stack></td>
                          <td>{user.projects.length} projet(s)</td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && <tr><td colSpan={4}><Typography sx={{ py: 3, textAlign: 'center' }} level="body-sm">Aucun utilisateur dans ce périmètre.</Typography></td></tr>}
                    </tbody>
                  </Table>
                </Sheet>
              </TabPanel>

              <TabPanel value={1} sx={{ p: 0 }}>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                  <Table hoverRow stickyHeader>
                    <thead><tr><th>Projet</th><th>Description</th><th>Membres</th><th>Processus communs</th><th>Spécifiques</th><th>Variantes</th><th /></tr></thead>
                    <tbody>
                      {filteredProjects.map(({ project, members, processes: links }) => (
                        <tr key={project.id}>
                          <td><Typography level="title-sm">{project.name}</Typography></td>
                          <td>{project.description || '—'}</td>
                          <td>{members.length}</td>
                          <td>{links.filter((link) => link.usage === 'common').length}</td>
                          <td>{links.filter((link) => link.usage === 'project-specific').length}</td>
                          <td>{links.filter((link) => link.usage === 'variant').length}</td>
                          <td><Button size="sm" variant="plain" endDecorator={<ArrowOutwardRounded />} onClick={() => navigate(`/projects/${project.id}`)}>Ouvrir</Button></td>
                        </tr>
                      ))}
                      {filteredProjects.length === 0 && <tr><td colSpan={7}><Typography sx={{ py: 3, textAlign: 'center' }} level="body-sm">Aucun projet ne correspond à la recherche.</Typography></td></tr>}
                    </tbody>
                  </Table>
                </Sheet>
              </TabPanel>

              <TabPanel value={2} sx={{ p: 0 }}>
                <Sheet variant="outlined" sx={{ borderRadius: 'md', overflow: 'auto' }}>
                  <Table hoverRow stickyHeader>
                    <thead><tr><th>Processus</th><th>Type d’utilisation</th><th>Projets utilisateurs</th><th>Source de variante</th><th /></tr></thead>
                    <tbody>
                      {filteredProcesses.map((process) => (
                        <tr key={process.resourceId}>
                          <td><Typography level="title-sm">{process.name}</Typography></td>
                          <td><Chip size="sm" color={USAGE_COLORS[process.usage]} variant="soft">{USAGE_LABELS[process.usage]}</Chip></td>
                          <td><Stack direction="row" gap={0.75} useFlexGap flexWrap="wrap">
                            {process.projects.map((project) => <Button key={project.id} size="sm" variant="soft" color="neutral" onClick={() => navigate(`/projects/${project.id}`)}>{project.name}</Button>)}
                          </Stack></td>
                          <td>{process.sourceResourceId ?? '—'}</td>
                          <td><Button size="sm" variant="plain" onClick={() => navigate(`/${process.resourceId}`)}>Ouvrir</Button></td>
                        </tr>
                      ))}
                      {filteredProcesses.length === 0 && <tr><td colSpan={5}><Typography sx={{ py: 3, textAlign: 'center' }} level="body-sm">Aucun processus ne correspond à la recherche.</Typography></td></tr>}
                    </tbody>
                  </Table>
                </Sheet>
              </TabPanel>
            </Tabs>
          </>
        )}
      </Stack>
    </Sheet>
  );
};
