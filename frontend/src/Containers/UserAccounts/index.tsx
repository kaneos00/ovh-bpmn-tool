import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Checkbox,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
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
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import './UserAccounts.scss';
import '../OrganizationAdmin/OrganizationAdmin.scss';

type Role = 'admin' | 'modeler' | 'viewer';
type ProjectRole = 'admin' | 'modeler' | 'viewer';
type Account = {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  active: boolean;
  createdAt?: string;
};
type Project = { id: string; name: string };
type Membership = {
  userId: string;
  projects: Array<{ projectId: string; projectName: string; role: ProjectRole }>;
};
type AdministrationOverview = { projects: Project[]; users: Membership[] };
type AccountDraft = { username: string; email: string; role: Role; active: boolean };

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
const roleLabels: Record<Role, string> = {
  admin: 'Administrateur',
  modeler: 'Modélisateur',
  viewer: 'Lecteur',
};
const roleColors: Record<Role, 'warning' | 'primary' | 'neutral'> = {
  admin: 'warning',
  modeler: 'primary',
  viewer: 'neutral',
};
const userPath = (id: string) => `/auth/users/${encodeURIComponent(id)}`;

async function call<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
    throw new Error(message || 'Erreur de requête');
  }
  return data as T;
}

export const Component = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username?: string }>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [overview, setOverview] = useState<AdministrationOverview>({ projects: [], users: [] });
  const [me, setMe] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'assign' | null>(null);
  const [bulkProjectId, setBulkProjectId] = useState('');
  const [bulkProjectRole, setBulkProjectRole] = useState<ProjectRole>('viewer');
  const [drafts, setDrafts] = useState<Record<string, AccountDraft>>({});
  const [resetPassword, setResetPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('viewer');
  const [showCreate, setShowCreate] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [projectRole, setProjectRole] = useState<ProjectRole>('viewer');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Membership['projects'][number] | null>(null);
  const [confirmImpersonation, setConfirmImpersonation] = useState(false);

  const refresh = async () => {
    const [session, accountRows, projectOverview] = await Promise.all([
      call<{ userId: string }>('/auth/session'),
      call<Account[]>('/auth/users'),
      call<AdministrationOverview>('/projects/administration/overview'),
    ]);
    setMe(session.userId);
    setAccounts(accountRows);
    setOverview(projectOverview);
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      call<{ userId: string }>('/auth/session'),
      call<Account[]>('/auth/users'),
      call<AdministrationOverview>('/projects/administration/overview'),
    ])
      .then(([session, accountRows, projectOverview]) => {
        if (!mounted) return;
        setMe(session.userId);
        setAccounts(accountRows);
        setOverview(projectOverview);
      })
      .catch((reason) => {
        if (mounted) setError(reason instanceof Error ? reason.message : 'Impossible de charger les comptes.');
      })
      .finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await refresh();
      setNotice(success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const membershipsByUser = useMemo(() => {
    const result = new Map<string, Membership>();
    overview.users.forEach((membership) => result.set(membership.userId.toLocaleLowerCase(), membership));
    return result;
  }, [overview.users]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    return accounts.filter((account) => {
      const membership = membershipsByUser.get(account.username.toLocaleLowerCase());
      const projectText = (membership?.projects ?? [])
        .map((project) => `${project.projectName} ${project.role}`)
        .join(' ');
      const matchesSearch = !term || `${account.username} ${account.email ?? ''} ${roleLabels[account.role]} ${projectText}`
        .toLocaleLowerCase('fr').includes(term);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' ? account.active : !account.active);
      const matchesRole = roleFilter === 'all' || account.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [accounts, membershipsByUser, search, statusFilter, roleFilter]);

  const selectedAccount = accounts.find((account) => account.username === username) ?? null;
  const selectedAccounts = filteredAccounts.filter((account) => selectedAccountIds.includes(account.id));
  const allVisibleSelected = filteredAccounts.length > 0 && filteredAccounts.every((account) => selectedAccountIds.includes(account.id));
  const selectedMembership = selectedAccount
    ? membershipsByUser.get(selectedAccount.username.toLocaleLowerCase())
    : undefined;
  const selectedDraft = selectedAccount
    ? drafts[selectedAccount.id] ?? {
      username: selectedAccount.username,
      email: selectedAccount.email ?? '',
      role: selectedAccount.role,
      active: selectedAccount.active,
    }
    : null;
  const activeCount = accounts.filter((account) => account.active).length;

  const toggleAccountSelection = (accountId: string, checked: boolean) => {
    setSelectedAccountIds(current => checked
      ? Array.from(new Set([...current, accountId]))
      : current.filter(id => id !== accountId));
  };

  const applyBulkStatus = async (active: boolean) => {
    const targets = selectedAccounts.filter(account => account.username !== me && account.active !== active);
    if (!targets.length) {
      setNotice('Aucun compte éligible dans la sélection.');
      setBulkAction(null);
      return;
    }
    await runAction(
      () => Promise.all(targets.map(account => call(userPath(account.id), 'PATCH', { active }))),
      `${targets.length} compte(s) ${active ? 'activé(s)' : 'désactivé(s)'}.`,
    );
    setSelectedAccountIds([]);
    setBulkAction(null);
  };

  const applyBulkProject = async () => {
    if (!bulkProjectId || !selectedAccounts.length) return;
    await runAction(
      () => Promise.all(selectedAccounts.map(account => call(
        `/projects/administration/projects/${encodeURIComponent(bulkProjectId)}/members/${encodeURIComponent(account.username)}`,
        'PUT',
        { role: bulkProjectRole },
      ))),
      `Accès au projet ajouté ou mis à jour pour ${selectedAccounts.length} compte(s).`,
    );
    setSelectedAccountIds([]);
    setBulkAction(null);
    setBulkProjectId('');
  };

  const updateDraft = <K extends keyof AccountDraft>(field: K, value: AccountDraft[K]) => {
    if (!selectedAccount || !selectedDraft) return;
    setDrafts((current) => ({
      ...current,
      [selectedAccount.id]: { ...selectedDraft, [field]: value },
    }));
  };

  const saveAccount = () => {
    if (!selectedAccount || !selectedDraft) return;
    void runAction(
      () => call(userPath(selectedAccount.id), 'PATCH', {
        username: selectedDraft.username,
        email: selectedDraft.email || null,
        role: selectedDraft.role,
        active: selectedDraft.active,
      }),
      'Compte utilisateur mis à jour.',
    ).then(() => setDrafts((current) => {
      const next = { ...current };
      delete next[selectedAccount.id];
      return next;
    }));
  };

  const createAccount = async () => {
    if (!newUsername.trim() || newPassword.length < 12) return;
    await runAction(async () => {
      await call('/auth/users', 'POST', {
        username: newUsername.trim(),
        email: newEmail.trim() || null,
        password: newPassword,
        role: newRole,
      });
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('viewer');
      setShowCreate(false);
    }, 'Compte créé.');
  };

  const addProjectAccess = async () => {
    if (!selectedAccount || !projectId) return;
    await runAction(
      () => call(
        `/projects/administration/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(selectedAccount.username)}`,
        'PUT',
        { role: projectRole },
      ),
      'Accès au projet ajouté ou mis à jour.',
    );
    setProjectId('');
    setProjectRole('viewer');
  };

  const updateProjectAccess = async (project: Membership['projects'][number], role: ProjectRole) => {
    if (!selectedAccount || role === project.role) return;
    await runAction(
      () => call(
        `/projects/administration/projects/${encodeURIComponent(project.projectId)}/members/${encodeURIComponent(selectedAccount.username)}`,
        'PUT',
        { role },
      ),
      'Rôle du projet mis à jour.',
    );
  };

  const removeProjectAccess = async (project: Membership['projects'][number]) => {
    if (!selectedAccount) return;
    await runAction(
      () => call(
        `/projects/administration/projects/${encodeURIComponent(project.projectId)}/members/${encodeURIComponent(selectedAccount.username)}`,
        'DELETE',
      ),
      'Accès au projet retiré.',
    );
    setPendingRemoval(null);
  };

  const resetUserPassword = async () => {
    if (!selectedAccount || resetPassword.length < 12) return;
    await runAction(async () => {
      await call(`${userPath(selectedAccount.id)}/password`, 'POST', { newPassword: resetPassword });
      setResetPassword('');
    }, 'Mot de passe réinitialisé.');
  };

  const impersonate = async () => {
    if (!selectedAccount || !selectedAccount.active || selectedAccount.username === me || busy) return;
    setConfirmImpersonation(false);
    setBusy(true);
    setError('');
    try {
      await call(`${userPath(selectedAccount.id)}/impersonate`, 'POST');
      window.location.assign('/');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de simuler ce compte.');
      setBusy(false);
    }
  };

  return (
    <Sheet className="org-admin-v2__page" sx={{ width: '100%', maxWidth: 'none', boxSizing: 'border-box', p: 0, bgcolor: 'transparent' }}>
      <Stack spacing={2}>
        <WorkspaceNavigation />
        <div className="org-admin-v2">
          <aside className="org-admin-v2__sidebar">
            <div className="org-admin-v2__brand">
              <img className="org-admin-v2__brand-logo" src="/bpmn-tool-logo.svg" alt="" />
              <div><strong>KHI Flows</strong><small>Organisation</small></div>
            </div>
            <div className="org-admin-v2__nav-group">
              <div className="org-admin-v2__nav-label">Administration</div>
              <nav className="org-admin-v2__nav" aria-label="Navigation de l’administration">
                {[
                  ['overview', 'Vue d’ensemble', '▦'],
                  ['users', 'Utilisateurs', '♙'],
                  ['projects', 'Projets', '▣'],
                  ['processes', 'Processus', '⌘'],
                  ['governance', 'Acteurs et RACI', '⬡'],
                ].map(([key, label, icon]) => (
                  <button
                    type="button"
                    key={key}
                    className={`org-admin-v2__nav-item${key === 'users' ? ' is-active' : ''}`}
                    aria-current={key === 'users' ? 'page' : undefined}
                    onClick={() => navigate(`/organization/${key}`)}
                  >
                    <span className="org-admin-v2__nav-icon" aria-hidden="true">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="org-admin-v2__sidebar-foot">
              <strong>Accès sécurisés</strong>
              <span>Les droits sont contrôlés par l’API, indépendamment de l’interface.</span>
            </div>
          </aside>
          <main className="org-admin-v2__main">
            <header className="org-admin-v2__topbar">
              <div>
                <div className="org-admin-v2__crumb" aria-label="Fil d’Ariane">
                  <Button size="sm" variant="plain" color="neutral" sx={{ p: 0, minHeight: 'unset' }} onClick={() => navigate('/organization/overview')}>Administration</Button>
                  <span>/</span>
                  <Button size="sm" variant="plain" color="neutral" sx={{ p: 0, minHeight: 'unset' }} onClick={() => navigate('/organization/users')}>Utilisateurs</Button>
                  {username && <> / {selectedAccount?.username ?? username}</>}
                </div>
                <div className="org-admin-v2__top-title">{username ? 'Fiche utilisateur' : 'Administration des utilisateurs'}</div>
              </div>
              <Chip size="sm" color="primary" variant="soft">Accès organisationnel</Chip>
            </header>
            <div className="org-admin-v2__content">
              {!username && <>
              <div className="org-admin-v2__page-head">
                <div>
                  <div className="org-admin-v2__eyebrow">Administration des accès</div>
                  <Typography level="h1">Utilisateurs</Typography>
                  <Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 760, mt: 0.5 }}>
                    Comptes de l’organisation, rôles globaux et accès aux projets. Les comptes sans projet restent visibles dans cet annuaire.
                  </Typography>
                </div>
                <div className="org-admin-v2__actions">
                  <Button onClick={() => setShowCreate((value) => !value)}>＋ Créer un compte</Button>
                </div>
              </div>

              {error && <Alert color="danger" sx={{ mb: 2 }}>{error}</Alert>}
              {notice && <Alert color="success" sx={{ mb: 2 }}>{notice}</Alert>}

              {showCreate && (
                <Card className="org-admin-v2__panel org-users__create" variant="outlined">
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography level="title-lg">Créer un compte utilisateur</Typography>
                    <Button size="sm" variant="plain" color="neutral" onClick={() => setShowCreate(false)}>Fermer</Button>
                  </Stack>
                  <div className="org-users__form-grid">
                    <FormControl required><FormLabel>Identifiant</FormLabel><Input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} /></FormControl>
                    <FormControl><FormLabel>Adresse e-mail</FormLabel><Input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></FormControl>
                    <FormControl required><FormLabel>Mot de passe (12 caractères minimum)</FormLabel><Input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></FormControl>
                    <FormControl><FormLabel>Rôle global</FormLabel><Select value={newRole} onChange={(_event, value) => value && setNewRole(value as Role)}><Option value="viewer">Lecteur</Option><Option value="modeler">Modélisateur</Option><Option value="admin">Administrateur</Option></Select></FormControl>
                  </div>
                  <Box><Button disabled={!newUsername.trim() || newPassword.length < 12 || busy} loading={busy} onClick={createAccount}>Créer le compte</Button></Box>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>La création utilise le mécanisme de compte local existant. Le mot de passe n’est jamais réaffiché.</Typography>
                </Card>
              )}

              <div className="org-admin-v2__stats org-users__stats">
                <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Comptes utilisateurs</span><span className="org-admin-v2__stat-icon">♙</span></div><div className="org-admin-v2__stat-value">{accounts.length}</div><div className="org-admin-v2__stat-note">Comptes locaux enregistrés</div></Card>
                <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Comptes actifs</span><span className="org-admin-v2__stat-icon">✓</span></div><div className="org-admin-v2__stat-value">{activeCount}</div><div className="org-admin-v2__stat-note">Accès autorisé à la connexion</div></Card>
                <Card className="org-admin-v2__stat"><div className="org-admin-v2__stat-top"><span>Sans projet</span><span className="org-admin-v2__stat-icon">⌕</span></div><div className="org-admin-v2__stat-value">{accounts.filter((account) => !(membershipsByUser.get(account.username.toLocaleLowerCase())?.projects.length)).length}</div><div className="org-admin-v2__stat-note">Comptes sans adhésion projet</div></Card>
              </div>

              <Card className="org-admin-v2__panel org-users__list" variant="outlined">
                <div className="org-users__toolbar">
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un identifiant, un e-mail ou un projet…" sx={{ flex: 1, minWidth: 240 }} />
                  <FormControl sx={{ minWidth: 160 }}><FormLabel>État du compte</FormLabel><Select value={statusFilter} onChange={(_event, value) => setStatusFilter((value ?? 'all') as typeof statusFilter)}><Option value="all">Tous les états</Option><Option value="active">Actif</Option><Option value="inactive">Désactivé</Option></Select></FormControl>
                  <FormControl sx={{ minWidth: 180 }}><FormLabel>Rôle global</FormLabel><Select value={roleFilter} onChange={(_event, value) => setRoleFilter((value ?? 'all') as typeof roleFilter)}><Option value="all">Tous les rôles</Option><Option value="admin">Administrateur</Option><Option value="modeler">Modélisateur</Option><Option value="viewer">Lecteur</Option></Select></FormControl>

                </div>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table hoverRow stickyHeader>
                    <thead><tr>
                      <th><Checkbox checked={allVisibleSelected} indeterminate={selectedAccountIds.length > 0 && !allVisibleSelected} onChange={event => setSelectedAccountIds(event.target.checked ? filteredAccounts.map(account => account.id) : [])} aria-label="Sélectionner tous les utilisateurs affichés" /></th>
                      <th>Utilisateur</th><th>Rôle global</th><th>Projets associés</th><th>Statut</th><th>Fiche</th>
                    </tr></thead>
                    <tbody>
                      {filteredAccounts.map((account) => {
                        const membership = membershipsByUser.get(account.username.toLocaleLowerCase());
                        return (
                          <tr key={account.id}>
                            <td><Checkbox checked={selectedAccountIds.includes(account.id)} onChange={event => toggleAccountSelection(account.id, event.target.checked)} aria-label={`Sélectionner ${account.username}`} /></td>
                            <td><Stack spacing={0.25}><Typography level="title-sm">{account.username}</Typography><Typography level="body-xs" sx={{ color: 'text.secondary' }}>{account.email || 'Aucune adresse e-mail'}{account.username === me ? ' · Votre compte' : ''}</Typography></Stack></td>
                            <td><Chip size="sm" color={roleColors[account.role]} variant="soft">{roleLabels[account.role]}</Chip></td>
                            <td><Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">{(membership?.projects ?? []).slice(0, 2).map((project) => <Chip key={project.projectId} size="sm" variant="soft" color="neutral">{project.projectName}</Chip>)}{(membership?.projects.length ?? 0) > 2 && <Chip size="sm" variant="outlined">+{membership!.projects.length - 2}</Chip>}{!membership?.projects.length && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Aucun projet</Typography>}</Stack></td>
                            <td><Chip size="sm" color={account.active ? 'success' : 'neutral'} variant="soft">{account.active ? 'Actif' : 'Désactivé'}</Chip></td>
                            <td><Button size="sm" variant="outlined" onClick={() => { setResetPassword(''); setConfirmImpersonation(false); navigate(`/organization/users/${encodeURIComponent(account.username)}`); }}>Ouvrir la fiche</Button></td>
                          </tr>
                        );
                      })}
                      {filteredAccounts.length === 0 && <tr><td colSpan={6}><Typography level="body-sm" sx={{ color: 'text.secondary', py: 2 }}>Aucun compte ne correspond aux filtres.</Typography></td></tr>}
                    </tbody>
                  </Table>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{filteredAccounts.length} compte(s) affiché(s) · les rôles globaux proviennent de l’annuaire des comptes ; les rôles projet des adhésions existantes.</Typography>
                  <Dropdown>
                    <MenuButton size="sm" variant="outlined" color="neutral" disabled={selectedAccounts.length === 0}>☰ Actions groupées ({selectedAccounts.length})</MenuButton>
                    <Menu placement="bottom-end">
                      <MenuItem onClick={() => setBulkAction('assign')}>Associer à un projet…</MenuItem>
                      <MenuItem onClick={() => setBulkAction('activate')}>Activer les comptes sélectionnés</MenuItem>
                      <MenuItem color="danger" onClick={() => setBulkAction('deactivate')}>Désactiver les comptes sélectionnés</MenuItem>
                      <MenuItem onClick={() => setSelectedAccountIds([])}>Effacer la sélection</MenuItem>
                    </Menu>
                  </Dropdown>
                </Stack>
                {bulkAction === 'assign' && (
                  <Alert color="primary" variant="soft">
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'flex-end' }} gap={1}>
                      <FormControl sx={{ flex: 1 }}><FormLabel>Projet</FormLabel><Select value={bulkProjectId || null} placeholder="Choisir un projet" onChange={(_event, value) => setBulkProjectId(value ?? '')}>{overview.projects.map(project => <Option key={project.id} value={project.id}>{project.name}</Option>)}</Select></FormControl>
                      <FormControl sx={{ minWidth: 170 }}><FormLabel>Rôle projet</FormLabel><Select value={bulkProjectRole} onChange={(_event, value) => value && setBulkProjectRole(value as ProjectRole)}><Option value="viewer">Viewer</Option><Option value="modeler">Modeler</Option><Option value="admin">Admin projet</Option></Select></FormControl>
                      <Button disabled={!bulkProjectId || busy} loading={busy} onClick={() => void applyBulkProject()}>Appliquer</Button>
                      <Button variant="plain" color="neutral" onClick={() => setBulkAction(null)}>Annuler</Button>
                    </Stack>
                  </Alert>
                )}
                {(bulkAction === 'activate' || bulkAction === 'deactivate') && (
                  <Alert color="warning" variant="soft">
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
                      <Typography level="body-sm">Confirmer l’action sur {selectedAccounts.length} compte(s) sélectionné(s) ? Votre propre compte ne sera pas désactivé.</Typography>
                      <Stack direction="row" gap={1}>
                        <Button size="sm" variant="plain" color="neutral" onClick={() => setBulkAction(null)}>Annuler</Button>
                        <Button size="sm" color={bulkAction === 'deactivate' ? 'danger' : 'primary'} disabled={busy} loading={busy} onClick={() => void applyBulkStatus(bulkAction === 'activate')}>Confirmer</Button>
                      </Stack>
                    </Stack>
                  </Alert>
                )}
              </Card>

              </>}

              {username && loaded && !selectedAccount && !error && <Alert color="warning">Utilisateur introuvable. <Button size="sm" variant="plain" onClick={() => navigate('/organization/users')}>Retour à la liste</Button></Alert>}
              {selectedAccount && selectedDraft && (
                <Card className="org-admin-v2__panel org-users__detail" variant="outlined">
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={1}>
                    <Box><div className="org-admin-v2__eyebrow">Fiche utilisateur</div><Typography level="h2">{selectedAccount.username}</Typography><Typography level="body-sm" sx={{ color: 'text.secondary' }}>Compte, sécurité et associations aux projets.</Typography></Box>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Button color="warning" variant="soft" disabled={busy || !selectedAccount.active || selectedAccount.username === me} onClick={() => setConfirmImpersonation(true)}>⇄ Se connecter en tant que…</Button>
                      <Button disabled={busy} loading={busy} onClick={saveAccount}>Enregistrer les modifications</Button>
                    </Stack>
                  </Stack>
                  {confirmImpersonation && (
                    <Alert color="warning" variant="soft">
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                        <Typography level="body-sm">Vous allez vous connecter en tant que « {selectedAccount.username} ». Continuer ?</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button size="sm" variant="plain" color="neutral" disabled={busy} onClick={() => setConfirmImpersonation(false)}>Annuler</Button>
                          <Button size="sm" color="warning" loading={busy} disabled={busy} onClick={() => void impersonate()}>Confirmer</Button>
                        </Stack>
                      </Stack>
                    </Alert>
                  )}

                  <div className="org-users__detail-grid">
                    <div className="org-users__detail-main">
                      <Typography level="title-lg">Informations du compte</Typography>
                      <div className="org-users__form-grid">
                        <FormControl><FormLabel>Identifiant de connexion</FormLabel><Input value={selectedDraft.username} onChange={(event) => updateDraft('username', event.target.value)} /></FormControl>
                        <FormControl><FormLabel>Adresse e-mail</FormLabel><Input type="email" value={selectedDraft.email} onChange={(event) => updateDraft('email', event.target.value)} /></FormControl>
                        <FormControl><FormLabel>Rôle global</FormLabel><Select value={selectedDraft.role} disabled={selectedAccount.username === me && selectedAccount.role === 'admin'} onChange={(_event, value) => value && updateDraft('role', value as Role)}><Option value="viewer">Lecteur</Option><Option value="modeler">Modélisateur</Option><Option value="admin">Administrateur</Option></Select></FormControl>
                        <FormControl><FormLabel>État du compte</FormLabel><Select value={selectedDraft.active ? 'active' : 'inactive'} disabled={selectedAccount.username === me} onChange={(_event, value) => value && updateDraft('active', value === 'active')}><Option value="active">Actif</Option><Option value="inactive">Désactivé</Option></Select></FormControl>
                      </div>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Les protections du dernier administrateur et les contrôles de sécurité restent appliqués par l’API existante.</Typography>

                      <Box className="org-users__projects">
                        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography level="title-lg">Associations aux projets</Typography><Chip size="sm" variant="soft">{selectedMembership?.projects.length ?? 0} projet(s)</Chip></Stack>
                        {pendingRemoval && (
                          <Alert color="warning" variant="soft">
                            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
                              <Typography level="body-sm">Retirer l’accès de {selectedAccount.username} au projet « {pendingRemoval.projectName} » ?</Typography>
                              <Stack direction="row" spacing={1}>
                                <Button size="sm" variant="plain" color="neutral" disabled={busy} onClick={() => setPendingRemoval(null)}>Annuler</Button>
                                <Button size="sm" color="danger" loading={busy} disabled={busy} onClick={() => void removeProjectAccess(pendingRemoval)}>Confirmer</Button>
                              </Stack>
                            </Stack>
                          </Alert>
                        )}
                        {(selectedMembership?.projects ?? []).map((project) => (
                          <Stack key={project.projectId} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} spacing={1} className="org-users__project-row">
                            <Box sx={{ flex: 1, minWidth: 180 }}><Typography level="title-sm">{project.projectName}</Typography><Typography level="body-xs" sx={{ color: 'text.secondary' }}>Rôle limité à ce projet</Typography></Box>
                            <FormControl sx={{ minWidth: 170 }}><Select size="sm" value={project.role} disabled={busy} onChange={(_event, value) => value && void updateProjectAccess(project, value as ProjectRole)}><Option value="viewer">Viewer</Option><Option value="modeler">Modeler</Option><Option value="admin">Admin projet</Option></Select></FormControl>
                            <Button size="sm" variant="outlined" color="danger" disabled={busy} onClick={() => setPendingRemoval(project)}>Retirer l’accès</Button>
                          </Stack>
                        ))}
                        {(!selectedMembership || selectedMembership.projects.length === 0) && <Typography level="body-sm" sx={{ color: 'text.secondary' }}>Aucune association à un projet.</Typography>}
                        <Divider />
                        <Typography level="title-sm">Ajouter un accès projet</Typography>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'flex-end' }}>
                          <FormControl sx={{ flex: 1 }}><FormLabel>Projet</FormLabel><Select value={projectId || null} placeholder="Choisir un projet" onChange={(_event, value) => setProjectId(value ?? '')}>{overview.projects.filter((project) => !(selectedMembership?.projects ?? []).some((membership) => membership.projectId === project.id)).map((project) => <Option key={project.id} value={project.id}>{project.name}</Option>)}</Select></FormControl>
                          <FormControl sx={{ minWidth: 170 }}><FormLabel>Rôle projet</FormLabel><Select value={projectRole} onChange={(_event, value) => value && setProjectRole(value as ProjectRole)}><Option value="viewer">Viewer</Option><Option value="modeler">Modeler</Option><Option value="admin">Admin projet</Option></Select></FormControl>
                          <Button disabled={!projectId || busy} loading={busy} onClick={() => void addProjectAccess()}>Ajouter l’accès</Button>
                        </Stack>
                      </Box>
                    </div>

                    <div className="org-users__detail-side">
                      <Card variant="outlined" className="org-users__security">
                        <Typography level="title-lg">État et sécurité</Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography level="body-sm">Compte actif</Typography><Chip size="sm" color={selectedDraft.active ? 'success' : 'neutral'}>{selectedDraft.active ? 'Oui' : 'Non'}</Chip></Stack>
                        <Typography level="body-xs" sx={{ color: 'text.secondary' }}>La désactivation bloque les nouvelles sessions. Le dernier administrateur actif est protégé côté serveur.</Typography>
                        <Divider />
                        <Typography level="title-sm">Réinitialiser le mot de passe</Typography>
                        <FormControl><FormLabel>Nouveau mot de passe (12 caractères minimum)</FormLabel><Input type="password" autoComplete="new-password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /></FormControl>
                        <Button size="sm" disabled={busy || resetPassword.length < 12} loading={busy} onClick={() => void resetUserPassword()}>Réinitialiser le mot de passe</Button>
                        <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>Le mot de passe n’est jamais restitué ni affiché.</Typography>
                      </Card>
                      <Alert color="warning" variant="soft">
                        <Typography level="title-sm">Simulation de session</Typography>
                        <Typography level="body-xs">La fonction « Se connecter en tant que » utilise le mécanisme d’impersonation déjà présent. L’administrateur d’origine reste identifié et peut reprendre sa session depuis le menu du compte.</Typography>
                      </Alert>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </main>
        </div>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'UserAccountsContainer';
