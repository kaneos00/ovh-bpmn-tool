import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('theme toggle is accessible and switches between light and dark modes', async () => {
  const main = await read('src/MainContainer.tsx');

  assert.match(main, /function ThemeModeToggle\(\)/);
  assert.match(main, /useColorScheme\(\)/);
  assert.match(main, /setMode\(isDark \? 'light' : 'dark'\)/);
  assert.match(main, /aria-label=\{isDark \? 'Activer le thème clair' : 'Activer le thème sombre'\}/);
  assert.match(main, /<CssVarsProvider defaultMode="light" modeStorageKey="khi-flows-color-scheme">/);
});

test('dark theme defines readable shared application surfaces and form controls', async () => {
  const css = await read('src/styles.css');

  assert.match(css, /\[data-joy-color-scheme='dark'\]\s*\{[^}]*--bpmn-page:\s*#111923/s);
  assert.match(css, /\[data-joy-color-scheme='dark'\]\s+body\s*\{[^}]*background:\s*var\(--bpmn-page\)/s);
  assert.match(css, /\[data-joy-color-scheme='dark'\] \.MuiCard-root/);
  assert.match(css, /\[data-joy-color-scheme='dark'\] \.MuiTable-root thead th/);
  assert.match(css, /\[data-joy-color-scheme='dark'\] input/);
  assert.match(css, /\[data-joy-color-scheme='dark'\] \.MuiDivider-root/);
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

  assert.match(main, /fetch\(\`\$\{apiBase\}\/auth\/preferences\`/);
  assert.match(main, /method: 'PUT'/);
  assert.match(main, /credentials: 'same-origin'/);
  assert.match(main, /JSON\.stringify\(\{ theme: nextMode \}\)/);
  assert.match(main, /userChangedRef\.current/);
  assert.match(main, /MUI still stores the local preference if server sync is unavailable/);
});
