import React from 'react';
import {
  Box,
  CssVarsProvider,
  Typography,
} from '@mui/joy';
import {
  createTheme,
  ThemeProvider,
  THEME_ID as MATERIAL_THEME_ID,
} from '@mui/material/styles';

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

// Joy UI and Material UI share MUI System's theme context. Scope the Material
// theme explicitly so Material components keep fields such as theme.transitions.
const materialTheme = createTheme();

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


export function MainContainer(props: MainContainerProps) {
  return (
    <ThemeProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>
      <CssVarsProvider defaultMode="light" modeStorageKey="khi-flows-color-scheme">
        <SnackbarProvider>
          <QueryClientProvider client={queryClient}>
            <BpmnToolOptionsProvider options={props.options}>
              <>
                <RouterProvider router={router} />
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
    </ThemeProvider>
  );
}
