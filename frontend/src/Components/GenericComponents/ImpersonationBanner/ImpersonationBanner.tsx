import React, { useEffect, useState } from 'react';
import { Alert, Button } from '@mui/joy';

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');

type Session = {
  userId: string;
  impersonating?: boolean;
  impersonatorUserId?: string | null;
};

export const ImpersonationBanner = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`${apiBase}/auth/session`, { credentials: 'same-origin' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (mounted) setSession(data);
      })
      .catch(() => {
        if (mounted) setSession(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!session?.impersonating) return null;

  const stop = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/impersonation/stop`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Impossible de quitter la simulation.');
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de quitter la simulation.');
      setBusy(false);
    }
  };

  return (
    <Alert
      color="warning"
      variant="soft"
      sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      endDecorator={
        <Button size="sm" color="warning" variant="solid" loading={busy} onClick={stop}>
          Revenir à mon compte administrateur
        </Button>
      }
    >
      <strong>Simulation de compte</strong> — vous utilisez actuellement le profil de {session.userId}.
      {session.impersonatorUserId ? ` Administrateur : ${session.impersonatorUserId}.` : ''}
      {error ? ` ${error}` : ''}
    </Alert>
  );
};
