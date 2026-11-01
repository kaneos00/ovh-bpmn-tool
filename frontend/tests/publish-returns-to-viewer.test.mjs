import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../src/Containers/PublishResource/PublishResource.container.tsx', import.meta.url),
  'utf8',
);

test('successful publication returns to the process Viewer, not the Modeler', () => {
  assert.match(source, /<Navigate to={`\/\$\{resource\?\.id\}`} replace \/>/);
  assert.doesNotMatch(source, /returnToModeler|useLocation|\/modeler/);
  assert.match(source, /actionData && !actionData\.error/);
});
