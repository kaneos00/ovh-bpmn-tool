import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, FormControl, FormLabel, Input, Option, Select, Sheet, Stack, Table, Typography } from '@mui/joy';

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
type Account = { id: string; username: string; email: string | null; role: 'admin' | 'modeler' | 'viewer'; active: boolean };
async function call(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(apiBase + path, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Erreur de requête');
  return data;
}
export const Component = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin'|'modeler'|'viewer'>('viewer');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [me, setMe] = useState('');
  const refresh = async () => { const session = await call('/auth/session'); setMe(session.userId); setAccounts(await call('/auth/users')); };
  useEffect(() => { refresh().catch(e => setError(e.message)); }, []);
  const action = async (fn: () => Promise<unknown>, success: string) => { setError(''); setStatus(''); try { await fn(); await refresh(); setStatus(success); } catch(e) { setError(e instanceof Error ? e.message : 'Erreur'); } };
  return <Sheet sx={{ minHeight: '100vh', p: { xs: 2, md: 4 } }}><Stack spacing={2} sx={{ maxWidth: 1100, mx: 'auto' }}>
    <Stack direction="row" justifyContent="space-between"><Typography level="h2">Comptes utilisateurs</Typography><Button variant="outlined" onClick={() => navigate('/organization/users')}>Retour</Button></Stack>
    {error && <Alert color="danger">{error}</Alert>}{status && <Alert color="success">{status}</Alert>}
    <Card variant="outlined" sx={{ gap: 2 }}><Typography level="title-lg">Créer un compte</Typography><Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
      <FormControl required sx={{ flex: 1 }}><FormLabel>Identifiant</FormLabel><Input value={username} onChange={e => setUsername(e.target.value)} /></FormControl>
      <FormControl sx={{ flex: 1 }}><FormLabel>E-mail</FormLabel><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></FormControl>
      <FormControl required sx={{ flex: 1 }}><FormLabel>Mot de passe (12 caractères min.)</FormLabel><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></FormControl>
      <FormControl sx={{ minWidth: 160 }}><FormLabel>Rôle</FormLabel><Select value={role} onChange={(_, value) => value && setRole(value as typeof role)}><Option value="admin">Administrateur</Option><Option value="modeler">Modélisateur</Option><Option value="viewer">Lecteur</Option></Select></FormControl>
    </Stack><Button disabled={!username.trim() || password.length < 12} onClick={() => action(async () => { await call('/auth/users', 'POST', { username, email: email || null, password, role }); setUsername(''); setEmail(''); setPassword(''); }, 'Compte créé.')}>Créer</Button></Card>
    <Card variant="outlined" sx={{ overflow: 'auto' }}><Typography level="title-lg">Comptes existants</Typography><Table><thead><tr><th>Identifiant</th><th>E-mail</th><th>Rôle</th><th>Actif</th><th>Actions</th></tr></thead><tbody>{accounts.map(account => <tr key={account.id}><td>{account.username}{account.username === me ? ' (vous)' : ''}</td><td>{account.email || '—'}</td><td><Select size="sm" value={account.role} disabled={account.username === me && account.role === 'admin'} onChange={(_, value) => value && action(() => call('/auth/users/' + account.id, 'PATCH', { role: value }), 'Rôle modifié.')}><Option value="admin">Administrateur</Option><Option value="modeler">Modélisateur</Option><Option value="viewer">Lecteur</Option></Select></td><td>{account.active ? 'Oui' : 'Non'}</td><td><Stack direction="row" gap={1}><Button size="sm" onClick={() => { const value = window.prompt('Nouvel identifiant', account.username); if (value) void action(() => call('/auth/users/' + account.id, 'PATCH', { username: value }), 'Identifiant modifié.'); }}>Identifiant</Button><Button size="sm" onClick={() => { const value = window.prompt('Nouvelle adresse e-mail (laisser vide pour effacer)', account.email || ''); if (value !== null) void action(() => call('/auth/users/' + account.id, 'PATCH', { email: value || null }), 'E-mail modifié.'); }}>E-mail</Button><Button size="sm" onClick={() => { const value = window.prompt('Nouveau mot de passe (12 caractères minimum)'); if (value && value.length >= 12) void action(() => call('/auth/users/' + account.id + '/password', 'POST', { newPassword: value }), 'Mot de passe réinitialisé.'); else if (value !== null && value.length < 12) setError('Le mot de passe doit contenir au moins 12 caractères.'); }}>Mot de passe</Button><Button size="sm" color={account.active ? 'danger' : 'success'} disabled={account.username === me} onClick={() => action(() => call('/auth/users/' + account.id, 'PATCH', { active: !account.active }), 'Statut modifié.')}>{account.active ? 'Désactiver' : 'Réactiver'}</Button></Stack></td></tr>)}</tbody></Table></Card>
    <Card variant="outlined" sx={{ gap: 2 }}><Typography level="title-lg">Modifier mon mot de passe</Typography><Stack direction={{ xs: 'column', md: 'row' }} gap={1}><FormControl><FormLabel>Mot de passe actuel</FormLabel><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></FormControl><FormControl><FormLabel>Nouveau mot de passe (12 caractères min.)</FormLabel><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></FormControl></Stack><Button disabled={!currentPassword || newPassword.length < 12} onClick={() => action(async () => { await call('/auth/password', 'POST', { currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); }, 'Mot de passe modifié.')}>Modifier mon mot de passe</Button></Card>
  </Stack></Sheet>;
};
Component.displayName = 'UserAccountsContainer';
