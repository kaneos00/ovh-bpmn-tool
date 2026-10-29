import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('theme toggle is accessible and switches between light and dark modes', async () => {
  const main = await read('src/MainContainer.tsx');

  assert.ok(main.includes('function ThemeModeToggle()'));
  assert.ok(main.includes('useColorScheme()'));
  assert.ok(main.includes("const nextMode = isDark ? 'light' : 'dark'"));
  assert.ok(main.includes('setMode(nextMode)'));
  assert.ok(main.includes("aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}"));
  assert.ok(main.includes('<CssVarsProvider defaultMode="light" modeStorageKey="khi-flows-color-scheme">'));
});

test('dark theme defines shared application surfaces and form controls', async () => {
  const css = await read('src/styles.css');

  assert.ok(css.includes("--bpmn-page: #111923"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] body"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .MuiCard-root"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .MuiTable-root thead th"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] input"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .MuiDivider-root"));
  assert.match(css, /\.theme-mode-toggle\s*\{[^}]*position:\s*fixed/);
});

test('dark theme changes are scoped to the active Joy color scheme', async () => {
  const css = await read('src/styles.css');

  assert.ok(css.includes("[data-joy-color-scheme='dark']"), 'dark selectors must be scoped');
  assert.doesNotMatch(css, /(^|\n)body\s*\{[^}]*background:\s*#111923/s,
    'dark background must not leak into the default light theme');
});

test('authenticated users synchronize theme preference while guests retain local fallback', async () => {
  const main = await read('src/MainContainer.tsx');

  assert.ok(main.includes('fetch(`${apiBase}/auth/preferences`'));
  assert.ok(main.includes("method: 'PUT'"));
  assert.ok(main.includes("credentials: 'same-origin'"));
  assert.ok(main.includes('JSON.stringify({ theme: nextMode })'));
  assert.ok(main.includes('userChangedRef.current'));
  assert.ok(main.includes('MUI still stores the local preference if server sync is unavailable'));
});

test('saved local theme is applied before the frontend module starts', async () => {
  const html = await read('dev/index.html');

  assert.ok(html.includes("localStorage.getItem('khi-flows-color-scheme')"));
  assert.ok(html.includes("document.documentElement.setAttribute('data-joy-color-scheme', savedMode)"));
  assert.ok(html.indexOf('</script>') < html.indexOf('<script type="module" src="./main.tsx"></script>'));
});

test('Material UI theme is scoped alongside Joy UI to preserve Material transitions', async () => {
  const main = await read('src/MainContainer.tsx');

  assert.ok(main.includes("THEME_ID as MATERIAL_THEME_ID"));
  assert.ok(main.includes('createTheme()'));
  assert.ok(main.includes('<ThemeProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>'));
  assert.ok(main.indexOf('<ThemeProvider theme={{ [MATERIAL_THEME_ID]: materialTheme }}>') < main.indexOf('<CssVarsProvider'));
});
