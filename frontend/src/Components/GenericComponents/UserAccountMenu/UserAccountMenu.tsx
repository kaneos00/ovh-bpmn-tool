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
} from '@mui/joy';
import { AdminPanelSettingsOutlined, LogoutOutlined, PersonOutline } from '@mui/icons-material';

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');

type Session = {
  userId: string;
  email?: string | null;
  role?: 'admin' | 'modeler' | 'viewer';
  impersonating?: boolean;
};

export const UserAccountMenu = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`${apiBase}/auth/session`, { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(async response => response.ok ? response.json() as Promise<Session> : null)
      .then(data => { if (mounted) setSession(data); })
      .catch(() => { if (mounted) setSession(null); });
    return () => { mounted = false; };
  }, []);

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
          borderColor: 'rgba(255,255,255,.22)',
          borderRadius: '9px',
          bgcolor: 'rgba(255,255,255,.08)',
          color: 'inherit',
          '&:hover': { bgcolor: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.4)' },
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
            {session?.role === 'admin' ? 'Administrateur' : session?.role === 'modeler' ? 'Modélisateur' : session?.role === 'viewer' ? 'Lecteur' : 'Mon compte'}
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

Component.displayName = 'UserAccountMenu';
