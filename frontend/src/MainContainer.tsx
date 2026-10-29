import React, { useEffect, useRef } from 'react';
import {
  Box,
  CssVarsProvider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/joy';
import { useColorScheme } from '@mui/joy/styles';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';

import { SnackbarProvider } from './Providers/Snackbar/Snackbar.provider';
import { QueryClientProvider } from 'react-query';
import {
  createBrowserRouter,
  RouteObject,
  RouterProvider,
} from 'react-router-dom';

import { routes } from './routes';
import queryClient from './queryClient';
import {
  BpmnToolOptions,
  BpmnToolOptionsProvider,
} from './Providers/BpmnToolOptions';

import './styles.css';
import '@fontsource/public-sans';

const router = createBrowserRouter(routes as RouteObject[], {
  basename: import.meta.env.VITE_APP_BASE_PATH as string,
});

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');

const buildCommit = import.meta.env.VITE_BUILD_COMMIT || 'unknown';
const buildRunNumber = import.meta.env.VITE_BUILD_RUN_NUMBER || 'unknown';
const buildBranch = import.meta.env.VITE_BUILD_BRANCH || 'unknown';
const configuredBuildId = import.meta.env.VITE_BUILD_ID;
function resolveBuildId() {
  if (configuredBuildId && configuredBuildId !== 'unknown') {
    return configuredBuildId;
  }
  if (buildCommit !== 'unknown') {
    return buildCommit;
  }
  return 'local';
}
const buildId = resolveBuildId();
const shortBuildId = buildId.slice(0, 12);
const buildDetails = [
  `Version déployée : ${buildId}`,
  `Commit : ${buildCommit}`,
  `Build CI : ${buildRunNumber}`,
  `Branche : ${buildBranch}`,
].join(' · ');

type MainContainerProps = {
  options: BpmnToolOptions;
};

function ThemeModeToggle() {
  const { mode, setMode } = useColorScheme();
  const isDark = mode === 'dark';
  const userChangedRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/auth/preferences`, { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(preferences => {
        if (
          active &&
          !userChangedRef.current &&
          (preferences?.theme === 'light' || preferences?.theme === 'dark')
        ) {
          setMode(preferences.theme);
        }
      })
      .catch(() => {
        // Guests and deployments without the preference endpoint keep local mode.
      });
    return () => {
      active = false;
    };
  }, [setMode]);

  const toggleMode = () => {
    const nextMode = isDark ? 'light' : 'dark';
    userChangedRef.current = true;
    setMode(nextMode);
    fetch(`${apiBase}/auth/preferences`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme: nextMode }),
    }).catch(() => {
      // MUI still stores the local preference if server sync is unavailable.
    });
  };

  return (
    <Tooltip title={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}>
      <IconButton
        className="theme-mode-toggle"
        size="md"
        variant="soft"
        color="neutral"
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        onClick={toggleMode}
      >
        {isDark ? <LightModeOutlined /> : <DarkModeOutlined />}
      </IconButton>
    </Tooltip>
  );
}

export function MainContainer(props: MainContainerProps) {
  return (
    <CssVarsProvider defaultMode="light" modeStorageKey="khi-flows-color-scheme">
      <SnackbarProvider>
        <QueryClientProvider client={queryClient}>
          <BpmnToolOptionsProvider options={props.options}>
            <>
              <RouterProvider router={router} />
              <ThemeModeToggle />
              <Box
                component="div"
                aria-label={`Identifiant de version déployée ${shortBuildId}`}
                title={buildDetails}
                sx={{
                  position: 'fixed',
                  right: 8,
                  bottom: 4,
                  zIndex: 2000,
                  pointerEvents: 'none',
                  opacity: 0.75,
                }}
              >
                <Typography
                  level="body-xs"
                  sx={{
                    px: 0.5,
                    py: 0.25,
                    borderRadius: '3px',
                    bgcolor: 'background.surface',
                    color: 'text.tertiary',
                    fontSize: '10px',
                    lineHeight: 1.2,
                  }}
                >
                  Build {shortBuildId}
                </Typography>
              </Box>
            </>
          </BpmnToolOptionsProvider>
        </QueryClientProvider>
      </SnackbarProvider>
    </CssVarsProvider>
  );
}
