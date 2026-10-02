import React, { useState } from 'react';
import { Box, Button, FormControl, FormLabel, Input, Sheet, Typography } from '@mui/joy';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Providers/Auth/Auth.provider';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/root';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch {
      setError('Nom d’utilisateur ou mot de passe incorrect.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Sheet
        variant="outlined"
        sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 'md' }}
      >
        <Typography level="h2" sx={{ mb: 1 }}>
          BPMN Tool
        </Typography>
        <Typography level="body-sm" sx={{ mb: 3 }}>
          Connexion à votre espace de processus
        </Typography>

        <form onSubmit={submit}>
          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Utilisateur</FormLabel>
            <Input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </FormControl>

          <FormControl required sx={{ mb: 2 }}>
            <FormLabel>Mot de passe</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormControl>

          {error && (
            <Typography color="danger" level="body-sm" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button type="submit" loading={submitting} fullWidth>
            Se connecter
          </Button>
          <Typography level="body-sm" sx={{ mt: 2, textAlign: 'center' }}>
            Première installation ? <Link to="/setup">Créer le premier administrateur</Link>
          </Typography>
        </form>
      </Sheet>
    </Box>
  );
}
