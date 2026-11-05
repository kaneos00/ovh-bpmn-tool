import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Dropdown,
  Menu,
  MenuButton,
  MenuItem,
  Typography,
  Switch,
} from '@mui/joy';
import { useColorScheme } from '@mui/joy/styles';
import { AdminPanelSettingsOutlined, DarkModeOutlined, LightModeOutlined, LogoutOutlined, PersonOutline } from '@mui/icons-material';

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');

type Session = {
  userId: string;
  email?: string | null;
  role?: 'admin' | 'modeler' | 'viewer';
  impersonating?: boolean;
};

export const UserAccountMenu = ({ dark = true }: { dark?: boolean }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { mode, setMode } = useColorScheme();
  const isDark = mode === 'dark';

  useEffect(() => {
    let mounted = true;
    fetch(`${apiBase}/auth/session`, { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(async response => response.ok ? response.json() as Promise<Session> : null)
      .then(data => { if (mounted) setSession(data); })
      .catch(() => { if (mounted) setSession(null); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/auth/preferences`, { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(preferences => {
        if (active && (preferences?.theme === 'light' || preferences?.theme === 'dark')) {
          setMode(preferences.theme);
        }
      })
      .catch(() => {
        // The locally stored preference remains available if server sync is unavailable.
      });
    return () => { active = false; };
  }, [setMode]);

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark';
    setMode(nextMode);
    fetch(`${apiBase}/auth/preferences`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: nextMode }),
    }).catch(() => {
      // Joy UI persists the preference locally.
    });
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('La déconnexion a échoué. Réessayez.');
      navigate('/login', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La déconnexion a échoué.');
      setBusy(false);
    }
  };

  const username = session?.userId || 'Compte';
  const roleLabel = (() => {
    switch (session?.role) {
      case 'admin': return 'Administrateur';
      case 'modeler': return 'Modélisateur';
      case 'viewer': return 'Lecteur';
      default: return 'Mon compte';
    }
  })();
  const initials = username.split(/[._\s-]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('fr') || 'U';

  return (
    <Dropdown>
      <MenuButton
        variant="outlined"
        color="neutral"
        size="sm"
        aria-label={`Compte utilisateur : ${username}`}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 38,
          px: 1,
          borderColor: dark ? 'rgba(255,255,255,.22)' : '#dce3ec',
          borderRadius: '9px',
          bgcolor: dark ? 'rgba(255,255,255,.08)' : '#fff',
          color: dark ? '#fff' : '#203047',
          '&:hover': { bgcolor: dark ? 'rgba(255,255,255,.14)' : '#f5f7fa', borderColor: dark ? 'rgba(255,255,255,.4)' : '#9bb6e9' },
        }}
      >
        <Avatar size="sm" sx={{ width: 27, height: 27, bgcolor: '#dbe7fb', color: '#214d95', fontSize: 11, fontWeight: 800 }}>
          {initials}
        </Avatar>
        <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'left', lineHeight: 1.15 }}>
          <Typography level="body-sm" sx={{ color: 'inherit', fontWeight: 700, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </Typography>
          <Typography level="body-xs" sx={{ color: 'inherit', opacity: 0.72 }}>
            {roleLabel}
          </Typography>
        </Box>
      </MenuButton>
      <Menu size="sm" sx={{ minWidth: 230, zIndex: 1600 }}>
        <MenuItem disabled>
          <PersonOutline fontSize="small" />
          <Box sx={{ minWidth: 0 }}>
            <Typography level="title-sm">{username}</Typography>
            {session?.email && <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{session.email}</Typography>}
          </Box>
        </MenuItem>
        <MenuItem onClick={toggleTheme} sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDark ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />}
            <Typography level="body-sm">Thème sombre</Typography>
          </Box>
          <Switch size="sm" checked={isDark} readOnly tabIndex={-1} />
        </MenuItem>
        {session?.role === 'admin' && !session.impersonating && (
          <MenuItem onClick={() => navigate('/organization/accounts')}>
            <AdminPanelSettingsOutlined fontSize="small" />
            Administration du compte
          </MenuItem>
        )}
        {session?.impersonating && (
          <MenuItem disabled>Simulation d’un autre compte en cours</MenuItem>
        )}
        {error && <MenuItem disabled>{error}</MenuItem>}
        <MenuItem color="danger" disabled={busy} onClick={logout}>
          <LogoutOutlined fontSize="small" />
          {busy ? 'Déconnexion…' : 'Se déconnecter'}
        </MenuItem>
      </Menu>
    </Dropdown>
  );
};

