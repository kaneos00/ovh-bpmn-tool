import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('NovaSys seed preserves the project documented-information registry and personal-data flags', async () => {
  const seed = await readFile(path.join(root, '../deploy/coolify/db/reference-project/seed.sql'), 'utf8');
  const start = seed.indexOf('INSERT INTO project_documented_sources');
  const end = seed.indexOf('ON CONFLICT (id) DO UPDATE', start);
  assert.ok(start >= 0 && end > start, 'documented-source INSERT block must exist');
  const block = seed.slice(start, end);
  assert.match(block, /retention,"containsPersonalData","createdBy"/);
  const rows = [...block.matchAll(/\('8d[0-9a-f-]+',[^\n]*?,(true|false),'reference-seed'\)/g)];
  assert.equal(rows.length, 84, 'all 84 documented sources must have a complete row');
  assert.equal(rows.filter(row => row[1] === 'true').length, 5, 'five HR/payroll sources contain personal data');
  assert.match(seed.slice(end, end + 250), /"containsPersonalData"=EXCLUDED\."containsPersonalData"/);
  const familyStart = seed.indexOf('UPDATE resources\\nSET "processMetadata"');
  const familyEnd = seed.indexOf('INSERT INTO contents', familyStart);
  assert.ok(familyStart >= 0 && familyEnd > familyStart, 'process family metadata must be seeded');
  const familyBlock = seed.slice(familyStart, familyEnd);
  for (const family of ['GOV', 'HR', 'FIN', 'IT', 'DEL', 'MNT']) {
    assert.ok(familyBlock.includes(`THEN '${family}'`), `missing process family ${family}`);
  }
  assert.match(seed, /"canSubmitRemarks"\) VALUES[\\s\\S]*?TRUE\) ON CONFLICT[\\s\\S]*?"canSubmitRemarks"=TRUE/);
});
