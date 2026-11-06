import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { drawioToBpmn, isDrawioXml } from '../../.test-dist/import/drawio/drawio-to-bpmn.js';

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const BPMNDI_NS = 'http://www.omg.org/spec/BPMN/20100524/DI';
const DC_NS = 'http://www.omg.org/spec/DD/20100524/DC';
const fixture = readFileSync(new URL('../fixtures/drawio-multipage-reference.drawio', import.meta.url), 'utf8');

const parse = xml => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  assert.equal(document.querySelector('parsererror'), null);
  return document;
};

describe('Draw.io multi-page conversion', () => {
  it('detects the supplied Draw.io fixture', () => {
    assert.equal(isDrawioXml(fixture), true);
  });

  it('creates one independent BPMN process and diagram for each Draw.io page', async () => {
    const { xml, warnings } = await drawioToBpmn(fixture);
    const document = parse(xml);
    const processes = Array.from(document.getElementsByTagNameNS(BPMN_NS, 'process'));
    const diagrams = Array.from(document.getElementsByTagNameNS(BPMNDI_NS, 'BPMNDiagram'));

    assert.equal(processes.length, 2);
    assert.equal(diagrams.length, 2);
    assert.equal(processes[0].getAttribute('name'), 'Page-1');
    assert.equal(processes[1].getAttribute('name'), 'Page-2');
    assert.equal(diagrams[0].getAttribute('name'), 'Page-1');
    assert.equal(diagrams[1].getAttribute('name'), 'Page-2');
    assert.equal(document.getElementsByTagNameNS(BPMN_NS, 'collaboration').length, 0);
    assert.equal(document.getElementsByTagNameNS(BPMN_NS, 'participant').length, 0);
    assert.deepEqual(warnings, []);

    const processIds = new Set(processes.map(process => process.getAttribute('id')));
    for (const flow of Array.from(document.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow'))) {
      const parentProcess = flow.parentElement;
      assert.ok(processIds.has(parentProcess.getAttribute('id')));
      const idsInProcess = new Set(Array.from(parentProcess.querySelectorAll('[id]')).map(el => el.getAttribute('id')));
      assert.ok(idsInProcess.has(flow.getAttribute('sourceRef')));
      assert.ok(idsInProcess.has(flow.getAttribute('targetRef')));
    }
  });

  it('types Page-1 file and database shapes as data references and uses data associations', async () => {
    const { xml } = await drawioToBpmn(fixture);
    const document = parse(xml);
    const page1 = Array.from(document.getElementsByTagNameNS(BPMN_NS, 'process'))[0];

    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow').length, 3);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'dataObjectReference').length, 1);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'dataStoreReference').length, 1);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'dataInputAssociation').length, 1);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'dataOutputAssociation').length, 1);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'dataObject').length, 1);
    assert.equal(document.getElementsByTagNameNS(BPMN_NS, 'dataStore').length, 1);
    assert.equal(page1.getElementsByTagNameNS(BPMN_NS, 'messageFlow').length, 0);
  });

  it('keeps Page-2 document/dataStorage and document-shaped elements as tasks', async () => {
    const { xml } = await drawioToBpmn(fixture);
    const document = parse(xml);
    const page2 = Array.from(document.getElementsByTagNameNS(BPMN_NS, 'process'))[1];
    const tasks = Array.from(page2.getElementsByTagNameNS(BPMN_NS, 'task'));
    const taskNames = tasks.map(task => task.getAttribute('name'));

    assert.equal(page2.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow').length, 7);
    assert.equal(page2.getElementsByTagNameNS(BPMN_NS, 'exclusiveGateway').length, 1);
    assert.equal(page2.getElementsByTagNameNS(BPMN_NS, 'dataObjectReference').length, 0);
    assert.equal(page2.getElementsByTagNameNS(BPMN_NS, 'dataStoreReference').length, 0);
    assert.ok(taskNames.includes('Document ou information'));
    assert.ok(taskNames.includes('PROCEDURE'));
    assert.ok(taskNames.includes('Processus'));
  });

  it('preserves source element coordinates and emits BPMN DI for both pages', async () => {
    const { xml } = await drawioToBpmn(fixture);
    const document = parse(xml);
    const bounds = Array.from(document.getElementsByTagNameNS(DC_NS, 'Bounds'));
    const start = bounds.find(bound => bound.getAttribute('x') === '130' && bound.getAttribute('y') === '160');
    const file = bounds.find(bound => bound.getAttribute('x') === '270' && bound.getAttribute('y') === '310');

    assert.ok(start, 'Page-1 start event coordinates should be retained');
    assert.ok(file, 'Page-1 file coordinates should be retained');
    assert.equal(document.getElementsByTagNameNS(BPMNDI_NS, 'BPMNShape').length, 13);
    assert.equal(document.getElementsByTagNameNS(BPMNDI_NS, 'BPMNEdge').length, 12);
  });
});
