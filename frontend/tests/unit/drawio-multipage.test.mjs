import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { drawioToBpmn } from '../../.test-dist/import/drawio/drawio-to-bpmn.js';
import { DocumentReaderEngine } from '../../.test-dist/import/reader/reader-engine.js';
import { drawioReader } from '../../.test-dist/import/readers/drawio-reader.js';

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const fixture = readFileSync(new URL('../fixtures/drawio-multipage-reference.drawio', import.meta.url), 'utf8');
const engine = new DocumentReaderEngine([drawioReader]);

const parse = xml => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  assert.equal(document.querySelector('parsererror'), null);
  return document;
};

const convertFixturePages = async () => {
  const source = await engine.read({ fileName: 'reference.drawio', content: fixture });
  return Promise.all(source.pages.map(async page => ({
    name: page.name,
    ...(await drawioToBpmn(page.content)),
  })));
};

describe('Draw.io page extraction and independent BPMN conversion', () => {
  it('extracts two named pages and converts each to a separate one-process BPMN document', async () => {
    const converted = await convertFixturePages();
    assert.deepEqual(converted.map(page => page.name), ['Page-1', 'Page-2']);

    for (const page of converted) {
      const document = parse(page.xml);
      assert.equal(document.getElementsByTagNameNS(BPMN_NS, 'process').length, 1);
      assert.equal(document.getElementsByTagNameNS(BPMNDI_NS, 'BPMNDiagram').length, 1);
      assert.equal(document.getElementsByTagNameNS(BPMN_NS, 'collaboration').length, 0);
      assert.equal(document.getElementsByTagNameNS(BPMN_NS, 'participant').length, 0);
      assert.deepEqual(page.warnings, []);

      const process = document.getElementsByTagNameNS(BPMN_NS, 'process')[0];
      const ids = new Set(Array.from(process.querySelectorAll('[id]')).map(el => el.getAttribute('id')));
      for (const flow of Array.from(process.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow'))) {
        assert.ok(ids.has(flow.getAttribute('sourceRef')));
        assert.ok(ids.has(flow.getAttribute('targetRef')));
      }
    }
  });

  it('refuses to create a multi-process BPMN from the original multi-page file', async () => {
    await assert.rejects(
      () => drawioToBpmn(fixture),
      /une page à la fois/,
    );
  });

  it('preserves Page-1 data references and their data associations', async () => {
    const converted = await convertFixturePages();
    const page1 = parse(converted[0].xml);
    const process = page1.getElementsByTagNameNS(BPMN_NS, 'process')[0];

    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow').length, 3);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataObjectReference').length, 1);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataStoreReference').length, 1);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataInputAssociation').length, 1);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataOutputAssociation').length, 1);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataObject').length, 1);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'dataStore').length, 1);
  });

  it('keeps Page-2 document and dataStorage shapes as tasks', async () => {
    const converted = await convertFixturePages();
    const page2 = parse(converted[1].xml);
    const process = page2.getElementsByTagNameNS(BPMN_NS, 'process')[0];
    const taskNames = Array.from(process.getElementsByTagNameNS(BPMN_NS, 'task'))
      .map(task => task.getAttribute('name'));

    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow').length, 7);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'exclusiveGateway').length, 1);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataObjectReference').length, 0);
    assert.equal(process.getElementsByTagNameNS(BPMN_NS, 'dataStoreReference').length, 0);
    assert.ok(taskNames.includes('Document ou information'));
    assert.ok(taskNames.includes('PROCEDURE'));
    assert.ok(taskNames.includes('Processus'));
  });

  it('preserves page-local coordinates and waypoints', async () => {
    const converted = await convertFixturePages();
    const page1 = parse(converted[0].xml);
    const bounds = Array.from(page1.getElementsByTagNameNS(DC_NS, 'Bounds'));
    assert.ok(bounds.some(bound => bound.getAttribute('x') === '130' && bound.getAttribute('y') === '160'));
    assert.ok(bounds.some(bound => bound.getAttribute('x') === '270' && bound.getAttribute('y') === '310'));
    assert.equal(page1.getElementsByTagNameNS(BPMNDI_NS, 'BPMNShape').length, 6);
    assert.equal(page1.getElementsByTagNameNS(BPMNDI_NS, 'BPMNEdge').length, 5);
  });
});
