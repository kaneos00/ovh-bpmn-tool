import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Sheet,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';

type MembershipView = {
  projectId: string;
  projectName: string;
  role: 'viewer' | 'modeler' | 'admin';
};

type AdminUser = {
  userId: string;
  projects: MembershipView[];
};

type MembershipChange = {
  projectId: string;
  userId: string;
  role: MembershipView['role'];
};

type MembershipRemoval = {
  projectId: string;
  userId: string;
};

type ProjectCreate = { name: string; description: string };
type ProjectUpdate = { id: string; name: string; description: string };
type ProjectRemoval = { id: string };

type AdminProcessLink = {
  projectId: string;
  projectName: string;
  usage: 'common' | 'variant' | 'project-specific';
  sourceResourceId: string | null;
};

type AdminProject = {
  id: string;
  name: string;
  description: string | null;
  membersCount: number;
  processes: Array<{
    resourceId: string;
    name: string;
    usage: AdminProcessLink['usage'];
    sourceResourceId: string | null;
  }>;
};

type AdminProcess = {
  id: string;
  name: string;
  description: string | null;
  projects: AdminProcessLink[];
};

type AdministrationOverview = {
  projects: AdminProject[];
  users: AdminUser[];
  processes: AdminProcess[];
};

const queryKey = ['organization-administration-overview'];
const sections = [
  { key: 'users', label: 'Utilisateurs' },
  { key: 'projects', label: 'Projets' },
  { key: 'processes', label: 'Processus' },
] as const;

type AdminSection = (typeof sections)[number]['key'];

const roleLabel: Record<MembershipView['role'], string> = {
  viewer: 'Viewer',
  modeler: 'Modeler',
  admin: 'Admin',
};

const usageLabel: Record<AdminProcessLink['usage'], string> = {
  common: 'Commun',
  variant: 'Variante',
  'project-specific': 'Spécifique au projet',
};

const roleColor: Record<MembershipView['role'], 'warning' | 'primary' | 'neutral'> = {
  admin: 'warning',
  modeler: 'primary',
  viewer: 'neutral',
};

const searchPlaceholders: Record<(typeof sections)[number]['key'], string> = {
  users: 'Rechercher un identifiant, un projet ou un rôle…',
  projects: 'Rechercher un projet ou un processus…',
  processes: 'Rechercher un processus ou un projet utilisateur…',
};

const usageColor: Record<AdminProcessLink['usage'], 'success' | 'primary' | 'warning'> = {
  common: 'success',
  variant: 'warning',
  'project-specific': 'primary',
};

export const Component = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, MembershipView['role']>>({});
  const [newUserId, setNewUserId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newRole, setNewRole] = useState<MembershipView['role']>('viewer');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [projectDescriptionDraft, setProjectDescriptionDraft] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const section = location.pathname.split('/').filter(Boolean)[1] ?? 'users';
  const activeSection: AdminSection = sections.some((item) => item.key === section)
    ? (section as AdminSection)
    : 'users';

  const overviewQuery = useQuery<AdministrationOverview>(
    queryKey,
    () => apiClient.get('/projects/administration/overview'),
  );

  const setMembership = useMutation(
    (change: MembershipChange) =>
      apiClient.put(
        `/projects/administration/projects/${change.projectId}/members/${encodeURIComponent(change.userId)}`,
        { role: change.role },
      ),
    {
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const removeMembership = useMutation(
    (membership: MembershipRemoval) =>
      apiClient.remove(
        `/projects/administration/projects/${membership.projectId}/members/${encodeURIComponent(membership.userId)}`,
      ),
    {
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const createProject = useMutation(
    (project: ProjectCreate) => apiClient.post('/projects', project),
    {
      onSuccess: async () => {
        setActionError(null);
        setNewProjectName('');
        setNewProjectDescription('');
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const updateProject = useMutation(
    (project: ProjectUpdate) =>
      apiClient.put(`/projects/administration/projects/${project.id}`, {
        name: project.name,
        description: project.description,
      }),
    {
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const deleteProject = useMutation(
    (project: ProjectRemoval) =>
      apiClient.remove(`/projects/administration/projects/${project.id}`),
    {
      onSuccess: async () => {
        setActionError(null);
        setSelectedProjectId(null);
        await queryClient.invalidateQueries(queryKey);
      },
      onError: (error: Error) => setActionError(error.message),
    },
  );

  const overview = overviewQuery.data;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const users = useMemo(
    () => (overview?.users ?? []).filter((user) =>
      !normalizedSearch ||
      user.userId.toLocaleLowerCase().includes(normalizedSearch) ||
      user.projects.some((project) =>
        project.projectName.toLocaleLowerCase().includes(normalizedSearch) ||
        project.role.toLocaleLowerCase().includes(normalizedSearch),
      ),
    ),
    [overview?.users, normalizedSearch],
  );
  const projects = useMemo(
    () => (overview?.projects ?? []).filter((project) =>
      !normalizedSearch ||
      project.name.toLocaleLowerCase().includes(normalizedSearch) ||
      (project.description ?? '').toLocaleLowerCase().includes(normalizedSearch) ||
      project.processes.some((process) => process.name.toLocaleLowerCase().includes(normalizedSearch)),
    ),
    [overview?.projects, normalizedSearch],
  );
  const processes = useMemo(
    () => (overview?.processes ?? []).filter((process) =>
      !normalizedSearch ||
      process.name.toLocaleLowerCase().includes(normalizedSearch) ||
      (process.description ?? '').toLocaleLowerCase().includes(normalizedSearch) ||
      process.projects.some((project) =>
        project.projectName.toLocaleLowerCase().includes(normalizedSearch) ||
        usageLabel[project.usage].toLocaleLowerCase().includes(normalizedSearch),
      ),
    ),
    [overview?.processes, normalizedSearch],
  );

  const selectedUser = users.find((user) => user.userId === selectedUserId);
  const selectedProject = overview?.projects.find((project) => project.id === selectedProjectId);

  const title = sections.find((item) => item.key === activeSection)?.label ?? 'Utilisateurs';

  return (
    <Sheet sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography level="body-sm" sx={{ color: 'primary.600', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Administration
          </Typography>
          <Typography level="h2" sx={{ mt: 0.5 }}>Organisation</Typography>
          <Typography level="body-md" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Vue transversale des utilisateurs, des projets et du catalogue des processus.
          </Typography>
        </Box>

        <Alert color="neutral" variant="soft">
          Les rôles affichés sont des rôles de projet. Les identifiants proviennent des adhésions enregistrées dans BPMN V2 ; les comptes sans adhésion ne sont pas encore fournis par un annuaire d’identité global.
        </Alert>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {sections.map((item) => (
            <Button
              key={item.key}
              variant={activeSection === item.key ? 'solid' : 'outlined'}
              onClick={() => {
                setSearch('');
                navigate(`/organization/${item.key}`);
              }}
            >
              {item.label}
            </Button>
          ))}
          <Box sx={{ flex: 1 }} />
          <Button variant="plain" color="neutral" onClick={() => navigate('/projects')}>
            Retour aux projets
          </Button>
        </Stack>

        <Divider />

        <Box>
          <Typography level="h3">{title}</Typography>
          <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {activeSection === 'users' && 'Chaque utilisateur est présenté avec tous les projets connus et son rôle dans chacun.'}
            {activeSection === 'projects' && 'Vue des membres et des processus associés à chaque projet.'}
            {activeSection === 'processes' && 'Vue catalogue : projets utilisateurs, usage commun, spécifique ou variante.'}
          </Typography>
        </Box>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholders[activeSection]}
          sx={{ maxWidth: 620 }}
        />

        {overviewQuery.isLoading && <Typography>Chargement des données d’administration…</Typography>}
        {overviewQuery.isError && (
          <Alert color="danger">
            Impossible de charger cette vue. Vérifiez que votre compte possède le groupe d’administration organisationnelle et que l’API V2 est à jour.
          </Alert>
        )}
        {actionError && <Alert color="danger">{actionError}</Alert>}

        {activeSection === 'users' && overview && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Typography level="title-lg">Ajouter un accès à un projet</Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
              L’identifiant est celui utilisé par le proxy d’authentification. L’accès est créé uniquement pour le projet choisi.
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'flex-end' } }}>
              <FormControl sx={{ flex: 1, minWidth: 200 }}>
                <FormLabel>Identifiant utilisateur</FormLabel>
                <Input value={newUserId} onChange={(event) => setNewUserId(event.target.value)} placeholder="Identifiant exact" />
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 200 }}>
                <FormLabel>Projet</FormLabel>
                <Select value={newProjectId || null} onChange={(_event, value) => setNewProjectId(value ?? '')} placeholder="Choisir un projet">
                  {overview.projects.map((project) => (
                    <Option key={project.id} value={project.id}>{project.name}</Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 170 }}>
                <FormLabel>Rôle projet</FormLabel>
                <Select value={newRole} onChange={(_event, value) => value && setNewRole(value as MembershipView['role'])}>
                  <Option value="viewer">Viewer — lecture</Option>
                  <Option value="modeler">Modeler — modification</Option>
                  <Option value="admin">Admin — gestion du projet</Option>
                </Select>
              </FormControl>
              <Button
                disabled={!newUserId.trim() || !newProjectId || setMembership.isLoading}
                loading={setMembership.isLoading}
                onClick={() => setMembership.mutate(
                  { projectId: newProjectId, userId: newUserId.trim(), role: newRole },
                  { onSuccess: () => { setNewUserId(''); setNewProjectId(''); } },
                )}
              >
                Ajouter l’accès
              </Button>
            </Stack>
          </Card>
        )}

        {activeSection === 'users' && selectedUser && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="title-lg">Accès de {selectedUser.userId}</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  Les modifications sont réservées au groupe d’administration organisationnelle.
                </Typography>
              </Box>
              <Button size="sm" variant="plain" color="neutral" onClick={() => setSelectedUserId(null)}>Fermer</Button>
            </Stack>
            {selectedUser.projects.map((project) => {
              const key = `${selectedUser.userId}:${project.projectId}`;
              const role = roleDrafts[key] ?? project.role;
              return (
                <Stack key={project.projectId} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography level="title-sm">{project.projectName}</Typography>
                    <Typography level="body-xs" sx={{ color: 'text.secondary' }}>Rôle actuel : {roleLabel[project.role]}</Typography>
                  </Box>
                  <FormControl sx={{ minWidth: 180 }}>
                    <FormLabel>Nouveau rôle</FormLabel>
                    <Select value={role} onChange={(_event, value) => value && setRoleDrafts((previous) => ({ ...previous, [key]: value as MembershipView['role'] }))}>
                      <Option value="viewer">Viewer — lecture</Option>
                      <Option value="modeler">Modeler — modification</Option>
                      <Option value="admin">Admin — gestion du projet</Option>
                    </Select>
                  </FormControl>
                  <Button
                    size="sm"
                    disabled={role === project.role || setMembership.isLoading}
                    loading={setMembership.isLoading}
                    onClick={() => setMembership.mutate({ projectId: project.projectId, userId: selectedUser.userId, role })}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined"
                    color="danger"
                    disabled={removeMembership.isLoading}
                    loading={removeMembership.isLoading}
                    onClick={() => removeMembership.mutate({ projectId: project.projectId, userId: selectedUser.userId })}
                  >
                    Retirer
                  </Button>
                </Stack>
              );
            })}
          </Card>
        )}

        {activeSection === 'users' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Identifiant utilisateur</th><th>Nombre de projets</th><th>Projets et rôles</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td><Typography level="title-sm">{user.userId}</Typography></td>
                    <td>{user.projects.length}</td>
                    <td>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {user.projects.map((project) => (
                          <Chip key={project.projectId} size="sm" variant="soft" color={roleColor[project.role]}>
                            {project.projectName} · {roleLabel[project.role]}
                          </Chip>
                        ))}
                      </Stack>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={() => setSelectedUserId(user.userId)}
                      >
                        Gérer les accès
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={4}>Aucun utilisateur correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {activeSection === 'projects' && overview && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Typography level="title-lg">Créer un projet</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'flex-end' } }}>
              <FormControl sx={{ flex: 1, minWidth: 220 }}>
                <FormLabel>Nom du projet</FormLabel>
                <Input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Nom du nouveau projet" />
              </FormControl>
              <FormControl sx={{ flex: 2, minWidth: 260 }}>
                <FormLabel>Description</FormLabel>
                <Input value={newProjectDescription} onChange={(event) => setNewProjectDescription(event.target.value)} placeholder="Description facultative" />
              </FormControl>
              <Button
                disabled={!newProjectName.trim() || createProject.isLoading}
                loading={createProject.isLoading}
                onClick={() => createProject.mutate({ name: newProjectName.trim(), description: newProjectDescription.trim() })}
              >
                Créer le projet
              </Button>
            </Stack>
          </Card>
        )}

        {activeSection === 'projects' && selectedProject && (
          <Card variant="outlined" sx={{ gap: 1.5 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography level="title-lg">Gérer {selectedProject.name}</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  {selectedProject.membersCount} membre(s) · {selectedProject.processes.length} processus associé(s)
                </Typography>
              </Box>
              <Button size="sm" variant="plain" color="neutral" onClick={() => setSelectedProjectId(null)}>Fermer</Button>
            </Stack>
            <FormControl>
              <FormLabel>Nom</FormLabel>
              <Input value={projectNameDraft} onChange={(event) => setProjectNameDraft(event.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input value={projectDescriptionDraft} onChange={(event) => setProjectDescriptionDraft(event.target.value)} />
            </FormControl>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button
                disabled={!projectNameDraft.trim() || updateProject.isLoading || (projectNameDraft === selectedProject.name && projectDescriptionDraft === (selectedProject.description ?? ''))}
                loading={updateProject.isLoading}
                onClick={() => updateProject.mutate({ id: selectedProject.id, name: projectNameDraft.trim(), description: projectDescriptionDraft.trim() })}
              >
                Enregistrer
              </Button>
              <Button
                variant="outlined"
                color="danger"
                disabled={selectedProject.processes.length > 0 || deleteProject.isLoading}
                loading={deleteProject.isLoading}
                onClick={() => {
                  if (window.confirm(`Supprimer le projet « ${selectedProject.name} » ? Cette action est irréversible.`)) {
                    deleteProject.mutate({ id: selectedProject.id });
                  }
                }}
              >
                Supprimer le projet
              </Button>
              {selectedProject.processes.length > 0 && (
                <Typography level="body-xs" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                  Retirez d’abord les {selectedProject.processes.length} processus associés avant suppression.
                </Typography>
              )}
            </Stack>
          </Card>
        )}

        {activeSection === 'projects' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Projet</th><th>Description</th><th>Membres</th><th>Processus communs</th><th>Spécifiques</th><th>Variantes</th><th>Gestion</th></tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td><Typography level="title-sm">{project.name}</Typography></td>
                    <td>{project.description || '—'}</td>
                    <td>{project.membersCount}</td>
                    <td>{project.processes.filter((process) => process.usage === 'common').length}</td>
                    <td>{project.processes.filter((process) => process.usage === 'project-specific').length}</td>
                    <td>{project.processes.filter((process) => process.usage === 'variant').length}</td>
                    <td><Button size="sm" variant="outlined" onClick={() => { setSelectedProjectId(project.id); setProjectNameDraft(project.name); setProjectDescriptionDraft(project.description ?? ''); }}>Gérer</Button></td>
                  </tr>
                ))}
                {projects.length === 0 && <tr><td colSpan={7}>Aucun projet correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {activeSection === 'processes' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Processus</th><th>Type d’utilisation</th><th>Projets utilisateurs</th><th>Source</th><th>Ouvrir</th></tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.id}>
                    <td><Typography level="title-sm">{process.name}</Typography>{process.description && <Typography level="body-xs" sx={{ color: 'text.secondary' }}>{process.description}</Typography>}</td>
                    <td>
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                        {Array.from(new Set(process.projects.map((project) => project.usage))).map((usage) => (
                          <Chip key={usage} size="sm" color={usageColor[usage]} variant="soft">{usageLabel[usage]}</Chip>
                        ))}
                        {process.projects.length === 0 && <Chip size="sm" variant="outlined">Non associé</Chip>}
                      </Stack>
                    </td>
                    <td>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {process.projects.map((project) => (
                          <Chip key={project.projectId} size="sm" variant="soft">{project.projectName} · {usageLabel[project.usage]}</Chip>
                        ))}
                      </Stack>
                    </td>
                    <td>{process.projects.find((project) => project.sourceResourceId)?.sourceResourceId ?? '—'}</td>
                    <td><Button size="sm" variant="outlined" onClick={() => navigate(`/${process.id}`)}>Ouvrir</Button></td>
                  </tr>
                ))}
                {processes.length === 0 && <tr><td colSpan={5}>Aucun processus correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {overview && (
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            {overview.users.length} utilisateurs avec adhésion · {overview.projects.length} projets · {overview.processes.length} ressources de type processus
          </Typography>
        )}
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'OrganizationAdministrationContainer';
