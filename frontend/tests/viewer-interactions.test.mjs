import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('viewer starts with the minimap hidden and exposes an explicit toggle', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const component = await read('src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx');

  assert.match(hook, /useState\(false\).*?minimapVisible/s);
  assert.match(hook, /Keep the minimap closed on import/);
  assert.match(component, /onClick=\{\(\) => setMinimapVisible\(visible => !visible\)\}/);
  assert.match(component, /aria-label=\{minimapVisible \? 'Masquer la mini-carte' : 'Afficher la mini-carte'\}/);
});

test('single-click selection is delayed and rapid double-click cancels it', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /eventBus\.on\('element\.click', onElementClick\)/);
  assert.match(hook, /eventBus\.on\('element\.dblclick', onElementDoubleClick\)/);
  assert.match(hook, /now - lastClickAt < 280/);
  assert.match(hook, /setTimeout\(\(\) => \{[\s\S]*?currentlySelected === element\.id \? '' : element\.id[\s\S]*?\}, 220\)/);
  assert.match(hook, /const onElementDoubleClick = \(\) => \{\s*cancelPendingSelection\(\)/);
  assert.match(hook, /eventBus\.off\('element\.click', onElementClick\)/);
  assert.match(hook, /eventBus\.off\('element\.dblclick', onElementDoubleClick\)/);
});

test('selection marker is removed before the next selection is applied', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /if \(previousId\) canvas\.removeMarker\(previousId, 'task-selected'\)/);
  assert.match(hook, /canvas\.addMarker\(targetId, 'task-selected'\)/);
  assert.match(hook, /useEffect\(\(\) => \{\s*applySelectionRef\.current\(\);\s*\}, \[selectedElementId\]\)/);
});

test('viewer delegates called-process navigation to the shared hook', async () => {
  const hook = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');

  assert.match(hook, /import \{ useCallActivityNavigation \} from '[^']*useCallActivityNavigation'/);
  assert.match(hook, /useCallActivityNavigation\(viewer, true\)/);
});

test('detail panel starts collapsed and opens when an element is selected', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /useState\(true\);\s*\n\s*const \[explorerWidth/);
  assert.match(details, /if \(selectedElementId\) setTaskPanelCollapsed\(false\)/);
  assert.match(details, /externalUrl:\s*Array\.from\(element\.attributes\)[\s\S]*?attribute\.localName === 'link'/);
});

test('explorer node selection navigates to the selected resource', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  assert.match(details, /<FolderTree[\s\S]*?selectedId=\{resourceId\}[\s\S]*?onNodeClick=\{id => navigate\(\`\/\$\{id\}\`\)\}/);
});
