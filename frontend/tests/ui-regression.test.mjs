import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('Viewer panels use shared flex sizing and keep the collapsed detail border', async () => {
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.scss');
  const layout = await read('src/Containers/BpmnLayout/BpmnLayoutContainer.scss');

  assert.match(details, /\.processViewerLayout\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1 1 0;/s);
  assert.match(details, /\.processViewerProcessTab\s*\{[^}]*flex:\s*1 1 0;[^}]*min-height:\s*0;[^}]*height:\s*auto;/s);
  assert.match(details, /\.processViewerWorkspace\s*\{[^}]*align-items:\s*stretch;[^}]*overflow:\s*hidden;/s);
  assert.match(details, /\.processExplorerPanel\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*hidden;/s);
  assert.match(details, /\.processTaskPanel\s*\{[^}]*height:\s*auto;[^}]*align-self:\s*stretch;/s);

  const collapsedDetailPanel = details.match(/\.processTaskPanel\.collapsed\s*\{([^}]*)\}/s);
  assert.ok(collapsedDetailPanel, 'collapsed detail panel rule should exist');
  assert.doesNotMatch(collapsedDetailPanel[1], /border(?:-color)?\s*:\s*transparent/i);
  assert.match(layout, /&\.processViewerActive\s+\.innerContent\s*\{\s*padding-bottom:\s*4px;/s);
});

test('all five BPMN gateway types map to markers styled with the same violet stroke', async () => {
  const viewer = await read('src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts');
  const modelerCss = await read('src/Components/BusinessComponents/Modeler/Modeler.css');
  const details = await read('src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx');

  const gateways = [
    ['ExclusiveGateway', 'exclusive'],
    ['ParallelGateway', 'parallel'],
    ['InclusiveGateway', 'inclusive'],
    ['ComplexGateway', 'complex'],
    ['EventBasedGateway', 'event-based'],
  ];

  for (const [type, marker] of gateways) {
    assert.match(viewer, new RegExp(`bpmn:${type}[^\\n]*\\n\\s*canvas\\.addMarker\\(element\\.id, 'bpmn-gateway-${marker}'\\)`));
    assert.ok(modelerCss.includes(`.djs-element.bpmn-gateway-${marker} .djs-visual > *`), `missing shared gateway style for ${type}`);
  }

  const sharedGatewayRule = modelerCss.match(/\/\* All gateways share[\s\S]*?\*\/([\s\S]*?)(?=\/\*|$)/);
  assert.ok(sharedGatewayRule, 'shared gateway styling rule should exist');
  assert.match(sharedGatewayRule[1], /stroke:\s*#6a0dad\s*!important;/i);
  assert.doesNotMatch(sharedGatewayRule[1], /fill\s*:/i, 'gateway styling must not override existing fills');

  assert.match(details, /type\.toLowerCase\(\)\.includes\('gateway'\)[\s\S]{0,180}color:\s*'#6a0dad'/);
  assert.match(details, /type\.toLowerCase\(\)\.includes\('gateway'\)[\s\S]{0,180}border:\s*'1px solid #6a0dad'/);
});
