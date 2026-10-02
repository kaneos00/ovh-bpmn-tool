import React, { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { useAuth } from '../../Providers/Auth/Auth.provider';

type ManagedUser = {
  id: string;
  username: string;
  displayName: string;
  role: 'consultation' | 'editor' | 'admin';
  enabled: boolean;
};

export default function UserAdministration() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ManagedUser['role']>('consultation');
  const [error, setError] = useState('');

  const reload = async () => {
    setUsers(await apiClient.get('/auth/users'));
  };

  useEffect(() => {
    reload().catch(() => setError('Impossible de charger les utilisateurs.'));
  }, []);

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      await apiClient.post('/auth/users', {
        username,
        displayName,
        password,
        role,
      });
      setUsername('');
      setDisplayName('');
      setPassword('');
      setRole('consultation');
      await reload();
    } catch {
      setError('Création impossible. Vérifiez les champs et le mot de passe.');
    }
  };

  const disableUser = async (id: string) => {
    try {
      await apiClient.put(`/auth/users/${id}`, { enabled: false });
      await reload();
    } catch {
      setError('Modification impossible.');
    }
  };

  return (
    <Sheet sx={{ p: 3, minHeight: '100vh' }}>
      <Typography level="h2" sx={{ mb: 3 }}>
        Utilisateurs
      </Typography>

      <Sheet variant="outlined" sx={{ p: 2, mb: 3, maxWidth: 700 }}>
        <Typography level="title-lg" sx={{ mb: 2 }}>
          Créer un utilisateur
        </Typography>
        <form onSubmit={createUser}>
          <FormControl required sx={{ mb: 1.5 }}>
            <FormLabel>Nom utilisateur</FormLabel>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </FormControl>
          <FormControl required sx={{ mb: 1.5 }}>
            <FormLabel>Nom affiché</FormLabel>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormControl>
          <FormControl required sx={{ mb: 1.5 }}>
            <FormLabel>Mot de passe</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormControl>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Profil</FormLabel>
            <Select value={role} onChange={(_, value) => value && setRole(value)}>
              <Option value="consultation">Consultation</Option>
              <Option value="editor">Consultation + modification</Option>
              <Option value="admin">Administration</Option>
            </Select>
          </FormControl>
          <Button type="submit">Créer</Button>
        </form>
      </Sheet>

      {error && (
        <Typography color="danger" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Table borderAxis="bothBetween" hoverRow>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Nom</th>
            <th>Profil</th>
            <th>Actif</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((managedUser) => (
            <tr key={managedUser.id}>
              <td>{managedUser.username}</td>
              <td>{managedUser.displayName}</td>
              <td>{managedUser.role}</td>
              <td>{managedUser.enabled ? 'Oui' : 'Non'}</td>
              <td>
                {managedUser.id !== currentUser?.id && managedUser.enabled && (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="danger"
                    onClick={() => disableUser(managedUser.id)}
                  >
                    Désactiver
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Sheet>
  );
}
