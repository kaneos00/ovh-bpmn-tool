import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkForLinterIssues } from '../../.test-dist/Components/BusinessComponents/Modeler/helpers.js';

describe('checkForLinterIssues', () => {
  it('returns false when there are no issues', () => {
    assert.equal(checkForLinterIssues({}), false);
  });

  it('returns false when all issues are warnings or informational', () => {
    assert.equal(
      checkForLinterIssues({
        'task-name': [{ category: 'warn' }, { category: 'info' }],
      }),
      false,
    );
  });

  it('returns true when an issue has category error', () => {
    assert.equal(
      checkForLinterIssues({
        'task-name': [{ category: 'error' }],
      }),
      true,
    );
  });

  it('detects an error among issues on different elements', () => {
    assert.equal(
      checkForLinterIssues({
        'task-one': [{ category: 'warn' }],
        'task-two': [{ category: 'info' }, { category: 'error' }],
      }),
      true,
    );
  });
});
