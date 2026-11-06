import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { DocumentReaderEngine } from '../../.test-dist/import/reader/reader-engine.js';
import { drawioReader } from '../../.test-dist/import/readers/drawio-reader.js';

const fixture = readFileSync(new URL('../fixtures/drawio-multipage-reference.drawio', import.meta.url), 'utf8');
const engine = new DocumentReaderEngine([drawioReader]);

describe('Generic document reader', () => {
  it('selects the Draw.io adapter and extracts one independent model per page', async () => {
    const document = await engine.read({ fileName: 'reference.drawio', content: fixture });

    assert.equal(document.format, 'drawio');
    assert.equal(document.pages.length, 2);
    assert.deepEqual(document.pages.map(page => page.name), ['Page-1', 'Page-2']);
    assert.ok(document.pages.every(page => /^<mxGraphModel\b/.test(page.content)));
    assert.ok(document.pages.every(page => page.mediaType === 'application/xml'));
  });

  it('reads a standalone mxGraphModel as a single page', async () => {
    const standalone = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
    const document = await engine.read({ fileName: 'single.xml', content: standalone });

    assert.equal(document.pages.length, 1);
    assert.equal(document.pages[0].name, 'Page-1');
    assert.match(document.pages[0].content, /^<mxGraphModel\b/);
  });

  it('decodes a compressed Draw.io page payload', async () => {
    const compressed = 'UzV2zq1wL0osyPDNT0nNUTV2VTV2LsrPL4GwciucU3NyVI0MMlNUjV1UjYwMgFjVyA2HrCFY1qAgsSg1rwSLBiADYTaQg2Y1AA==';
    const source = `<mxfile><diagram id="compressed" name="Compressed">${compressed}</diagram></mxfile>`;
    const document = await engine.read({ fileName: 'compressed.drawio', content: source });

    assert.equal(document.pages.length, 1);
    assert.equal(document.pages[0].name, 'Compressed');
    assert.match(document.pages[0].content, /^<mxGraphModel\\b/);
  });

  it('rejects unsupported input and malformed XML explicitly', async () => {
    await assert.rejects(
      () => engine.read({ fileName: 'notes.txt', content: 'plain text' }),
      /Aucun lecteur compatible/,
    );
    await assert.rejects(
      () => engine.read({ fileName: 'broken.drawio', content: '<mxfile><diagram>' }),
      /XML Draw.io est invalide/,
    );
  });
});
