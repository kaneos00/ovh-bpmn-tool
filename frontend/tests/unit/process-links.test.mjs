import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getProcessLinks,
  resolveLinkedChildren,
} from '../../.test-dist/Components/BusinessComponents/FolderTree/processLinks.js';

const info = (id, processIds = [], targets = []) => ({
  resource: { id, name: id },
  processIds,
  targets,
});

const linkedIds = (linked, id) => (linked.get(id) ?? []).map(resource => resource.id);

describe('getProcessLinks', () => {
  it('extracts Call Activity targets and only collapsed SubProcess targets', () => {
    const element = attributes => ({
      getAttribute: name => (Object.hasOwn(attributes, name) ? attributes[name] : null),
    });
    const nodes = {
      process: [element({ id: ' Process_Main ' })],
      callActivity: [
        element({ calledElement: ' resource-child ' }),
        element({ calledElement: '   ' }),
        element({ calledElement: 'Process_Child' }),
      ],
      subProcess: [
        element({ id: ' Process_Child ', isExpanded: 'false' }),
        element({ id: 'Expanded_SubProcess', isExpanded: 'true' }),
        element({ id: 'Unspecified_SubProcess' }),
      ],
    };
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');

    globalThis.DOMParser = class FixtureDOMParser {
      parseFromString() {
        return {
          getElementsByTagName: () => [],
          getElementsByTagNameNS: (_namespace, localName) => nodes[localName] ?? [],
        };
      }
    };

    try {
      assert.deepEqual(getProcessLinks('<fixture />'), {
        processIds: ['Process_Main'],
        targets: ['resource-child', 'Process_Child', 'Process_Child'],
      });
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'DOMParser', originalDescriptor);
      } else {
        delete globalThis.DOMParser;
      }
    }
  });

  it('ignores malformed XML reported by the browser parser', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');
    globalThis.DOMParser = class InvalidFixtureDOMParser {
      parseFromString() {
        return {
          getElementsByTagName: name => (name === 'parsererror' ? [{}] : []),
          getElementsByTagNameNS: () => [],
        };
      }
    };

    try {
      assert.deepEqual(getProcessLinks('<broken'), { processIds: [], targets: [] });
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'DOMParser', originalDescriptor);
      } else {
        delete globalThis.DOMParser;
      }
    }
  });
});

describe('resolveLinkedChildren', () => {
  it('resolves a Call Activity target by its exact resource ID', () => {
    const linked = resolveLinkedChildren([
      info('caller-resource', ['Process_Caller'], ['child-resource']),
      info('child-resource', ['Process_Child']),
    ]);

    assert.deepEqual(linkedIds(linked, 'caller-resource'), ['child-resource']);
  });

  it('resolves a collapsed SubProcess target by a unique BPMN process ID', () => {
    const linked = resolveLinkedChildren([
      info('caller-resource', ['Process_Caller'], ['Process_Child']),
      info('child-resource', ['Process_Child']),
    ]);

    assert.deepEqual(linkedIds(linked, 'caller-resource'), ['child-resource']);
  });

  it('does not guess when a called BPMN process ID is ambiguous', () => {
    const linked = resolveLinkedChildren([
      info('caller-resource', ['Process_Caller'], ['Process_Duplicate']),
      info('child-one', ['Process_Duplicate']),
      info('child-two', ['Process_Duplicate']),
    ]);

    assert.deepEqual(linkedIds(linked, 'caller-resource'), []);
  });

  it('deduplicates repeated targets and excludes self-links', () => {
    const linked = resolveLinkedChildren([
      info('caller-resource', ['Process_Caller'], [
        'child-resource',
        'child-resource',
        'Process_Caller',
      ]),
      info('child-resource', ['Process_Child']),
    ]);

    assert.deepEqual(linkedIds(linked, 'caller-resource'), ['child-resource']);
  });

  it('keeps each called process under at most one parent', () => {
    const linked = resolveLinkedChildren([
      info('caller-one', ['Process_One'], ['child-resource']),
      info('caller-two', ['Process_Two'], ['child-resource']),
      info('child-resource', ['Process_Child']),
    ]);

    assert.deepEqual(linkedIds(linked, 'caller-one'), ['child-resource']);
    assert.deepEqual(linkedIds(linked, 'caller-two'), []);
  });

  it('rejects links that would create a two-process cycle', () => {
    const linked = resolveLinkedChildren([
      info('process-a', ['Process_A'], ['process-b']),
      info('process-b', ['Process_B'], ['process-a']),
    ]);

    assert.deepEqual(linkedIds(linked, 'process-a'), []);
    assert.deepEqual(linkedIds(linked, 'process-b'), []);
  });
});
