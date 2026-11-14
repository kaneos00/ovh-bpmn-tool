import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => readFile(path.join(root, relativePath), 'utf8');

test('legacy cross-resource comparison URL remains a standalone route', async () => {
  const routes = await read('src/routes.tsx');
  const comparison = await read('src/Containers/ContentCompare/hooks/useCompareData.ts');
  const actionBar = await read('src/Containers/ContentCompare/components/CompareActionBar.tsx');
  const proposals = await read('src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx');

  assert.match(
    routes,
    /path: '\/compare-resources\/:leftResourceId\/:leftContentId\/:rightResourceId\/:rightContentId'/,
  );
  assert.match(routes, /lazy: \(\) => import\('\.\/Containers\/ContentCompare'\)/);
  assert.match(comparison, /params\.leftResourceId \?\? params\.resourceId/);
  assert.match(comparison, /params\.rightResourceId \?\? params\.resourceId/);
  assert.match(comparison, /getXmlContentQuery\(leftResourceId, leftContentId\)/);
  assert.match(comparison, /getXmlContentQuery\(rightResourceId, rightContentId\)/);
  assert.ok(proposals.includes("const reviewUrl = `/${proposal.cloneResourceId}/modeler?proposalId=${proposal.id}&reviewRemarks=1${proposal.submittedContentId ? `&contentId=${proposal.submittedContentId}` : ''}`;"));
  assert.ok(proposals.includes("returnTo=${returnTo}"));
  assert.ok(actionBar.includes("requestedReturnTo?.startsWith('/')"));
  assert.ok(actionBar.includes("!requestedReturnTo.startsWith('//')"));
  assert.ok(actionBar.includes('navigate(returnTo)'));
  assert.ok(actionBar.includes(": `/${resourceId}`"));
});
