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

  assert.ok(css.includes("--bpmn-page: #202b3a"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] body"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .MuiCard-root"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .MuiTable-root thead th"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] input"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .MuiDivider-root"));
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .login-page"));
  assert.ok(css.includes("#3a4b61"));
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
test('login and resource explorer retain light surfaces in dark mode', async () => {
  const login = await read('src/Containers/Login/Login.container.tsx');
  const tree = await read('src/Components/BusinessComponents/FolderTree/FolderTree.tsx');
  const css = await read('src/styles.css');
  assert.ok(login.includes('className="login-page"'));
  assert.ok(login.includes('data-joy-color-scheme="light"'));
  assert.doesNotMatch(tree, /theme-light-explorer|data-joy-color-scheme="light"/);
  assert.ok(css.includes('.login-page .MuiCard-root'));
  assert.ok(css.includes('.viewerFolderPanel .MuiInput-root'));
  assert.ok(css.includes(".viewerFolderPanel .rct-tree-item-button[aria-selected='true']"));
});

test('dark theme gives RACI matrix a dark surface and outlined controls', async () => {
  const css = await read('src/raci.css');
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .raci-table td"));
  assert.ok(css.includes('border: 1px solid #ffffff'));
  assert.ok(css.includes('background: #202d3e'));
});

test('dark theme styles BPMN shapes, connectors, labels and text annotations', async () => {
  const css = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  assert.ok(css.includes("[data-joy-color-scheme='dark'] .process-viewer-canvas"));
  assert.ok(css.includes('[fill="white"]'), 'default white shapes should be adapted');
  assert.ok(css.includes('fill: #35465b !important'));
  assert.doesNotMatch(css, /\.djs-shape:not\(\.djs-label\).*fill:\s*#2b394b/s,
    'a blanket fill must not overwrite BPMN custom colors');
  assert.ok(css.includes('.djs-connection .djs-visual > path'));
  assert.ok(css.includes('.djs-element text'));
  assert.ok(css.includes('.bpmn-text-annotation .djs-visual > path'));
});

test('dark theme supports SVG white fill variants and visible explorer selection states', async () => {
  const modelerCss = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const appCss = await read('src/styles.css');
  assert.ok(modelerCss.includes('[fill="rgb(255, 255, 255)"]'));
  assert.ok(modelerCss.includes('[style*="fill: white"]'));
  assert.ok(appCss.includes('.rct-tree-item-li[aria-selected=\'true\']'));
  assert.ok(appCss.includes('[data-rct-selected=\'true\']'));
  assert.ok(appCss.includes('background-color: #285b96 !important'));
});
