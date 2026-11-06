import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('process header hides the description and displays operational and nature badges', async () => {
  const layout = await read('src/Containers/BpmnLayout/BpmnLayout.container.tsx');
  const header = await read('src/Components/GenericComponents/Header/Header.tsx');

  assert.match(layout, /description=\{resource\.type === ResourceType\.Process \? undefined/);
  assert.match(layout, /titleAdornment=\{resource\.type === ResourceType\.Process/);
  assert.match(layout, /<Chip size="sm" variant="soft" color="primary">Opérationnel<\/Chip>/);
  assert.match(layout, /activeProcess\?\.usage === 'common'[\s\S]*?'Commun'/);
  assert.match(layout, /activeProcess\?\.usage === 'variant'[\s\S]*?'Variante'/);
  assert.match(layout, /activeProcess\?\.usage === 'project-specific'[\s\S]*?'Spécifique'/);
  assert.match(header, /titleAdornment\?: ReactElement/);
  assert.match(header, /\{titleAdornment\}/);
  assert.match(header, /\{\(isLoading \|\| description\) &&/);
});

test('workspace navigation keeps the project selector and account menu without Home or Projects buttons', async () => {
  const navigation = await read('src/Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation.tsx');

  assert.doesNotMatch(navigation, /label: 'Accueil'|label: 'Projets'/);
  assert.match(navigation, /placeholder="Choisir un projet…"/);
  assert.match(navigation, /<UserAccountMenu \/>/);
  assert.match(navigation, />\s*Administration\s*</);
});
