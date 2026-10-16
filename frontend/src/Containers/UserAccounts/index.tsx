import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
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

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
type Role = 'admin' | 'modeler' | 'viewer';
type Account = {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  active: boolean;
};
type AccountDraft = { username: string; email: string };
const roleLabels: Record<Role, string> = {
  admin: 'Administrateur',
  modeler: 'Modélisateur',
  viewer: 'Lecteur',
};

async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch([apiBase, path].join(''), {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Erreur de requête');
  return data;
}

const userPath = (id: string) => ['/auth/users', id].join('/');
const passwordPath = (id: string) => ['/auth/users', id, 'password'].join('/');

export const Component = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [me, setMe] = useState('');
  const [drafts, setDrafts] = useState<Record<string, AccountDraft>>({});
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const session = await call('/auth/session');
    setMe(session.userId);
    setAccounts(await call('/auth/users'));
  };

  useEffect(() => {
    refresh().catch((reason) =>
      setError(reason instanceof Error ? reason.message : 'Erreur'),
    );
  }, []);

  const action = async (
    fn: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await fn();
      await refresh();
      setStatus(success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const draftFor = (account: Account): AccountDraft =>
    drafts[account.id] ?? {
      username: account.username,
      email: account.email ?? '',
    };

  const updateDraft = (
    account: Account,
    field: keyof AccountDraft,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [account.id]: { ...draftFor(account), [field]: value },
    }));
  };

  return (
    <Sheet sx={{ minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      <Stack spacing={2} sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
        >
          <Box>
            <Typography level="h2">Comptes utilisateurs</Typography>
            <Typography level="body-sm" color="neutral">
              Comptes locaux, rôles globaux et mots de passe.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/organization/users')}
          >
            Retour à l’administration
          </Button>
        </Stack>

        {error && <Alert color="danger">{error}</Alert>}
        {status && <Alert color="success">{status}</Alert>}

        <Card variant="outlined" sx={{ gap: 2 }}>
          <Typography level="title-lg">Créer un compte</Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={1}
            flexWrap="wrap"
          >
            <FormControl required sx={{ flex: 1, minWidth: 180 }}>
              <FormLabel>Identifiant</FormLabel>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </FormControl>
            <FormControl sx={{ flex: 1, minWidth: 220 }}>
              <FormLabel>E-mail</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </FormControl>
            <FormControl required sx={{ flex: 1, minWidth: 220 }}>
              <FormLabel>Mot de passe (12 caractères min.)</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </FormControl>
            <FormControl sx={{ minWidth: 160 }}>
              <FormLabel>Rôle</FormLabel>
              <Select
                value={role}
                onChange={(_, value) => value && setRole(value as Role)}
              >
                <Option value="admin">Administrateur</Option>
                <Option value="modeler">Modélisateur</Option>
                <Option value="viewer">Lecteur</Option>
              </Select>
            </FormControl>
          </Stack>
          <Box>
            <Button
              disabled={!username.trim() || password.length < 12 || busy}
              loading={busy}
              onClick={() =>
                action(async () => {
                  await call('/auth/users', 'POST', {
                    username,
                    email: email || null,
                    password,
                    role,
                  });
                  setUsername('');
                  setEmail('');
                  setPassword('');
                  setRole('viewer');
                }, 'Compte créé.')
              }
            >
              Créer le compte
            </Button>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ gap: 1.5 }}>
          <Typography level="title-lg">Comptes existants</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table hoverRow stickyHeader>
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>E-mail</th>
                  <th>Rôle global</th>
                  <th>Statut</th>
                  <th>Gestion du compte</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <Typography level="title-sm">
                        {account.username}
                      </Typography>
                      {account.username === me && (
                        <Chip size="sm" color="primary">
                          Votre compte
                        </Chip>
                      )}
                    </td>
                    <td>{account.email || '—'}</td>
                    <td>
                      <Select
                        size="sm"
                        value={account.role}
                        disabled={
                          busy ||
                          (account.username === me && account.role === 'admin')
                        }
                        onChange={(_, value) =>
                          value &&
                          action(
                            () =>
                              call(userPath(account.id), 'PATCH', {
                                role: value,
                              }),
                            'Rôle mis à jour.',
                          )
                        }
                      >
                        <Option value="admin">Administrateur</Option>
                        <Option value="modeler">Modélisateur</Option>
                        <Option value="viewer">Lecteur</Option>
                      </Select>
                      <Typography level="body-xs" color="neutral">
                        {roleLabels[account.role]}
                      </Typography>
                    </td>
                    <td>
                      <Chip color={account.active ? 'success' : 'neutral'}>
                        {account.active ? 'Actif' : 'Désactivé'}
                      </Chip>
                    </td>
                    <td>
                      <Stack spacing={1} sx={{ minWidth: 230 }}>
                        <Input
                          size="sm"
                          aria-label="Nouvel identifiant"
                          value={draftFor(account).username}
                          onChange={(event) =>
                            updateDraft(account, 'username', event.target.value)
                          }
                        />
                        <Button
                          size="sm"
                          variant="outlined"
                          disabled={
                            busy ||
                            !draftFor(account).username.trim() ||
                            draftFor(account).username === account.username
                          }
                          onClick={() =>
                            action(
                              () =>
                                call(userPath(account.id), 'PATCH', {
                                  username: draftFor(account).username,
                                }),
                              'Identifiant modifié.',
                            )
                          }
                        >
                          Modifier l’identifiant
                        </Button>
                        <Input
                          size="sm"
                          type="email"
                          aria-label="Nouvelle adresse e-mail"
                          placeholder="Adresse e-mail"
                          value={draftFor(account).email}
                          onChange={(event) =>
                            updateDraft(account, 'email', event.target.value)
                          }
                        />
                        <Button
                          size="sm"
                          variant="outlined"
                          disabled={
                            busy ||
                            draftFor(account).email === (account.email ?? '')
                          }
                          onClick={() =>
                            action(
                              () =>
                                call(userPath(account.id), 'PATCH', {
                                  email: draftFor(account).email || null,
                                }),
                              'Adresse e-mail modifiée.',
                            )
                          }
                        >
                          Modifier l’e-mail
                        </Button>
                        <Input
                          size="sm"
                          type="password"
                          aria-label="Nouveau mot de passe utilisateur"
                          placeholder="Nouveau mot de passe"
                          value={resetPasswords[account.id] ?? ''}
                          onChange={(event) =>
                            setResetPasswords((current) => ({
                              ...current,
                              [account.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          disabled={
                            busy ||
                            (resetPasswords[account.id] ?? '').length < 12
                          }
                          onClick={() =>
                            action(async () => {
                              await call(passwordPath(account.id), 'POST', {
                                newPassword: resetPasswords[account.id],
                              });
                              setResetPasswords((current) => ({
                                ...current,
                                [account.id]: '',
                              }));
                            }, 'Mot de passe réinitialisé.')
                          }
                        >
                          Réinitialiser le mot de passe
                        </Button>
                        <Button
                          size="sm"
                          color={account.active ? 'danger' : 'success'}
                          variant="outlined"
                          disabled={busy || account.username === me}
                          onClick={() =>
                            action(
                              () =>
                                call(userPath(account.id), 'PATCH', {
                                  active: !account.active,
                                }),
                              account.active
                                ? 'Compte désactivé.'
                                : 'Compte réactivé.',
                            )
                          }
                        >
                          {account.active ? 'Désactiver' : 'Réactiver'}
                        </Button>
                      </Stack>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Box>
        </Card>

        <Card variant="outlined" sx={{ gap: 2 }}>
          <Typography level="title-lg">Modifier mon mot de passe</Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={1}
          >
            <FormControl required sx={{ flex: 1 }}>
              <FormLabel>Mot de passe actuel</FormLabel>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </FormControl>
            <FormControl required sx={{ flex: 1 }}>
              <FormLabel>Nouveau mot de passe (12 caractères min.)</FormLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </FormControl>
          </Stack>
          <Box>
            <Button
              disabled={!currentPassword || newPassword.length < 12 || busy}
              onClick={() =>
                action(async () => {
                  await call('/auth/password', 'POST', {
                    currentPassword,
                    newPassword,
                  });
                  setCurrentPassword('');
                  setNewPassword('');
                }, 'Mot de passe modifié.')
              }
            >
              Modifier mon mot de passe
            </Button>
          </Box>
        </Card>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'UserAccountsContainer';
