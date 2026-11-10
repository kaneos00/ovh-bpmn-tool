import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../src/Containers/PublishResource/PublishResource.container.tsx');
const routes = read('../src/routes.tsx');
const hook = read('../src/Containers/PublishResource/hooks/usePublishResource.ts');
const action = read('../src/Containers/PublishResource/PublishResource.action.ts');

test('the process page and Modeler share the same publication module', () => {
  assert.match(routes, /path: '\/:resourceId\/publish',[\s\S]*?import\('\.\/Containers\/PublishResource'\)/);
  assert.match(routes, /path: '\/:resourceId\/modeler'[\s\S]*?path: 'publish',[\s\S]*?import\('\.\/Containers\/PublishResource'\)/);
});

test('cancelling publication returns to the context that opened the shared module', () => {
  assert.match(hook, /const onModalClose = \(\) => \{\s*return navigate\('\.\.'\);\s*\}/);
});

test('successful publication returns to the process Viewer, not the Modeler', () => {
  assert.match(source, /<Navigate to={`\/\$\{resource\?\.id\}`} replace \/>/);
  assert.doesNotMatch(source, /returnToModeler|useLocation|\/modeler/);
  assert.match(source, /actionData && !actionData\.error/);
});

test('failed publication stays on the confirmation screen for retry', () => {
  assert.match(source, /actionData && !actionData\.error/);
  assert.match(source, /failed publication must remain on the confirmation screen/);
  assert.match(action, /catch \(error\) \{[\s\S]*?formAction,[\s\S]*?error,[\s\S]*?\};/);
});
