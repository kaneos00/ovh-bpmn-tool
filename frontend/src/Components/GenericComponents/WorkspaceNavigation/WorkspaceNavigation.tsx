import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Input, List, ListItem, Sheet, Stack, Typography } from '@mui/joy';
import { Search } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { resourcesQuery } from '../../../api/resources/resources.queries';
import type { Resource } from '../../../Types';

/**
 * V2 workspace navigation shared by the user, project and organization views.
 * This is navigation only: all permissions must continue to be enforced by the API.
 */
const destinations = [
  {
    label: 'Référentiel BPMN',
    path: '/root',
    matches: (path: string) =>
      path === '/root' || /^\/[0-9a-f-]+(?:\/|$)/i.test(path),
  },
  {
    label: 'Mon espace',
    path: '/workspace',
    matches: (path: string) => path === '/workspace',
  },
  {
    label: 'Mes projets',
    path: '/projects',
    matches: (path: string) => path.startsWith('/projects'),
  },
  {
    label: 'Administration',
    path: '/organization/overview',
    matches: (path: string) => path.startsWith('/organization'),
  },
];

export const WorkspaceNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const resources = useQuery<Resource[]>(resourcesQuery());

  const results = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return [];
    return (resources.data ?? [])
      .filter((resource) =>
        resource.name.toLocaleLowerCase('fr').includes(term) ||
        (resource.description ?? '').toLocaleLowerCase('fr').includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .slice(0, 8);
  }, [resources.data, search]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  const openResource = (resource: Resource) => {
    setSearchOpen(false);
    setSearch('');
    navigate(`/${resource.id}`);
  };

  return (
    <Box
      sx={{
        mb: 1,
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Box
            component="img"
            src="/bpmn-tool-logo.svg"
            alt=""
            sx={{ width: 28, height: 28, objectFit: 'contain' }}
          />
          <Box>
            <Typography level="title-lg" sx={{ lineHeight: 1.2 }}>KHI Flows</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Projets, processus et responsabilités, unifiés.
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 420 }}>
          <Input
            size="sm"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            slotProps={{ input: { ref: searchRef, 'aria-label': 'Rechercher un processus ou un dossier', onKeyDown: (event) => {
              if (event.key === 'Enter' && results[0]) openResource(results[0]);
            } } }}
            placeholder="Rechercher un processus ou un dossier…  Ctrl K"
            startDecorator={<Search fontSize="small" />}
            endDecorator={search.trim() ? <Button size="sm" variant="plain" onClick={() => { setSearch(''); setSearchOpen(true); }}>Effacer</Button> : null}
            sx={{ bgcolor: 'background.surface' }}
          />
          {searchOpen && search.trim() && (
            <Sheet
              variant="outlined"
              sx={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 1400, borderRadius: 'md', boxShadow: 'lg', maxHeight: 360, overflowY: 'auto', bgcolor: 'background.surface' }}
            >
              {resources.isLoading && <Typography level="body-sm" sx={{ p: 1.5 }}>Recherche dans le référentiel…</Typography>}
              {resources.isError && <Typography level="body-sm" color="danger" sx={{ p: 1.5 }}>Recherche indisponible pour le moment.</Typography>}
              {!resources.isLoading && !resources.isError && results.length === 0 && (
                <Typography level="body-sm" sx={{ p: 1.5 }}>Aucun processus ou dossier correspondant.</Typography>
              )}
              {results.length > 0 && (
                <List size="sm" sx={{ '--ListItem-radius': '6px', p: 0.5 }}>
                  {results.map((resource) => (
                    <ListItem key={resource.id} sx={{ p: 0 }}>
                      <Button
                        variant="plain"
                        color="neutral"
                        onClick={() => openResource(resource)}
                        sx={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', whiteSpace: 'normal' }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography level="title-sm">{resource.name}</Typography>
                          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                            {resource.type === 'folder' ? 'Dossier' : 'Processus'}{resource.description ? ` · ${resource.description}` : ''}
                          </Typography>
                        </Box>
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
              {results.length === 8 && <Typography level="body-xs" sx={{ px: 1.5, pb: 1, color: 'text.tertiary' }}>Affinez la recherche pour réduire les résultats.</Typography>}
            </Sheet>
          )}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {destinations.map((destination) => {
            const active = destination.matches(location.pathname);
            return (
              <Button
                key={destination.path}
                size="sm"
                variant={active ? 'solid' : 'plain'}
                color={active ? 'primary' : 'neutral'}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigate(destination.path)}
              >
                {destination.label}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
};
