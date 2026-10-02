import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Sheet, Typography } from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../queryClient';
import { useAuth } from '../../Providers/Auth/Auth.provider';
import { clearAuthToken } from '../../shared/api/apiClient';

export default function Setup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }
    if (password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/auth/setup', {
        username,
        displayName,
        password,
      });
      await login(username, password);
      navigate('/root', { replace: true });
    } catch {
      setError('La configuration initiale a déjà été réalisée ou a échoué.');
      clearAuthToken();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Sheet variant="outlined" sx={{ width: '100%', maxWidth: 480, p: 4, borderRadius: 'md' }}>
        <Typography level="h2" sx={{ mb: 1 }}>
          Première installation
        </Typography>
        <Typography level="body-sm" sx={{ mb: 3 }}>
          Création du premier compte administrateur.
        </Typography>

        <form onSubmit={submit}>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Utilisateur</FormLabel>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </FormControl>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Nom affiché</FormLabel>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormControl>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Mot de passe</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormControl>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Confirmation</FormLabel>
            <Input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </FormControl>

          {error && (
            <Typography color="danger" level="body-sm" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button type="submit" loading={submitting} fullWidth>
            Créer l’administrateur
          </Button>
        </form>
      </Sheet>
    </Box>
  );
}
