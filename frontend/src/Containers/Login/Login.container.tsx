import React, { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  Input,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';

// FUTURE SSO/OIDC: keep this page as the shared sign-in shell. Add an optional
// “Se connecter avec l’organisation” action here when an OIDC provider is configured,
// redirecting to a backend-owned /auth/oidc/start endpoint and returning to the same
// validated local path. Do not implement OAuth/token handling in the browser or assume
// that a successful IdP login grants application roles; the backend maps trusted claims.
const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');

export const Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Identifiant ou mot de passe incorrect.'
            : 'Connexion impossible. Réessayez dans un instant.',
        );
        return;
      }
      const requestedPath = searchParams.get('next') || '/root';
      const safePath =
        requestedPath.startsWith('/') &&
        !requestedPath.startsWith('//') &&
        !requestedPath.startsWith('/login')
          ? requestedPath
          : '/root';
      navigate(safePath, { replace: true });
    } catch {
      setError('Le service de connexion est momentanément indisponible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        boxSizing: 'border-box',
        px: 2,
        py: 4,
        background:
          'radial-gradient(circle at 15% 15%, rgba(40, 100, 215, 0.12), transparent 32%), linear-gradient(135deg, #f5f7fa 0%, #eef2f6 100%)',
      }}
    >
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 440 }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box
            component="img"
            src="/bpmn-tool-logo.svg"
            alt="Logo KHI Flows"
            sx={{ width: 76, height: 76 }}
          />
          <Typography level="h2" sx={{ fontWeight: 800, letterSpacing: '-0.035em' }}>
            KHI Flows
          </Typography>
          <Typography level="body-md" sx={{ color: 'text.secondary', maxWidth: 330 }}>
            Projets, processus et responsabilités, unifiés.
          </Typography>
        </Stack>

        <Card
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            gap: 2.5,
            borderColor: 'rgba(21, 43, 69, 0.12)',
            boxShadow: '0 18px 55px rgba(21, 43, 69, 0.09)',
            borderRadius: 'xl',
          }}
        >
          <Stack spacing={0.5}>
            <Typography level="h3">Connexion</Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
              Entrez vos identifiants pour accéder à votre espace de travail.
            </Typography>
          </Stack>

          {error && <Alert color="danger" variant="soft">{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Identifiant ou e-mail</FormLabel>
                <Input
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Votre identifiant"
                  disabled={submitting}
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Mot de passe</FormLabel>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Votre mot de passe"
                  disabled={submitting}
                />
              </FormControl>
              <Button type="submit" size="lg" loading={submitting} disabled={!username.trim() || !password}>
                Se connecter
              </Button>
            </Stack>
          </Box>
        </Card>
        <Typography level="body-xs" sx={{ textAlign: 'center', color: 'text.tertiary' }}>
          Accès sécurisé · KHI Flows
        </Typography>
      </Stack>
    </Sheet>
  );
};

Component.displayName = 'LoginContainer';
