import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/joy';

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
    label: 'Mes projets',
    path: '/projects',
    matches: (path: string) => path.startsWith('/projects'),
  },
  {
    label: 'Administration',
    path: '/organization/users',
    matches: (path: string) => path.startsWith('/organization'),
  },
];

export const WorkspaceNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        mb: 2.5,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box
            component="img"
            src="/bpmn-tool-logo.svg"
            alt=""
            sx={{ width: 36, height: 36, objectFit: 'contain' }}
          />
          <Box>
            <Typography level="title-lg" sx={{ lineHeight: 1.2 }}>BPMN Tool</Typography>
            <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
              Espace de travail
            </Typography>
          </Box>
        </Stack>
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
