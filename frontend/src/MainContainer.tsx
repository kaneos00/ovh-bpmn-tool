import React from 'react';
import { createRoot } from 'react-dom/client';
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

  return (
    <Tooltip title={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}>
      <IconButton
        className="theme-mode-toggle"
        size="md"
        variant="soft"
        color="neutral"
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
        onClick={() => setMode(isDark ? 'light' : 'dark')}
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
