import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Input,
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

const usageColor: Record<AdminProcessLink['usage'], 'success' | 'primary' | 'warning'> = {
  common: 'success',
  variant: 'warning',
  'project-specific': 'primary',
};

export const Component = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const section = location.pathname.split('/').filter(Boolean)[1] ?? 'users';
  const activeSection = sections.some((item) => item.key === section) ? section : 'users';

  const overviewQuery = useQuery<AdministrationOverview>(
    queryKey,
    () => apiClient.get('/projects/administration/overview'),
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
          placeholder={
            activeSection === 'users'
              ? 'Rechercher un identifiant, un projet ou un rôle…'
              : activeSection === 'projects'
                ? 'Rechercher un projet ou un processus…'
                : 'Rechercher un processus ou un projet utilisateur…'
          }
          sx={{ maxWidth: 620 }}
        />

        {overviewQuery.isLoading && <Typography>Chargement des données d’administration…</Typography>}
        {overviewQuery.isError && (
          <Alert color="danger">
            Impossible de charger cette vue. Vérifiez que votre compte possède le groupe global de lecture-écriture et que l’API V2 est à jour.
          </Alert>
        )}

        {activeSection === 'users' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Identifiant utilisateur</th><th>Nombre de projets</th><th>Projets et rôles</th></tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td><Typography level="title-sm">{user.userId}</Typography></td>
                    <td>{user.projects.length}</td>
                    <td>
                      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {user.projects.map((project) => (
                          <Chip key={project.projectId} size="sm" variant="soft" color={project.role === 'admin' ? 'warning' : project.role === 'modeler' ? 'primary' : 'neutral'}>
                            {project.projectName} · {roleLabel[project.role]}
                          </Chip>
                        ))}
                      </Stack>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={3}>Aucun utilisateur correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {activeSection === 'projects' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Projet</th><th>Description</th><th>Membres</th><th>Processus communs</th><th>Spécifiques</th><th>Variantes</th></tr>
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
                  </tr>
                ))}
                {projects.length === 0 && <tr><td colSpan={6}>Aucun projet correspondant.</td></tr>}
              </tbody>
            </Table>
          </Card>
        )}

        {activeSection === 'processes' && overview && (
          <Card variant="outlined" sx={{ p: 0, overflow: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr><th>Processus</th><th>Type d’utilisation</th><th>Projets utilisateurs</th><th>Source</th></tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.id}>
                    <td><Typography level="title-sm">{process.name}</Typography>{process.description && <Typography level="body-xs" sx={{ color: 'text.secondary' }}>{process.description}</Typography>}</td>
                    <td>
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                        {[...new Set(process.projects.map((project) => project.usage))].map((usage) => (
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
                  </tr>
                ))}
                {processes.length === 0 && <tr><td colSpan={4}>Aucun processus correspondant.</td></tr>}
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
