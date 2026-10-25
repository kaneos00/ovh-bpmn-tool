import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildQuery } from '../../.test-dist/api/helpers.js';

describe('buildQuery', () => {
  it('returns an empty string when no query is supplied', () => {
    assert.equal(buildQuery(), '');
  });

  it('returns an empty string for an empty query object', () => {
    assert.equal(buildQuery({}), '');
  });

  it('serializes the sort field and order using the API parameter names', () => {
    assert.equal(
      buildQuery({ sort: { by: 'updatedAt', order: 'DESC' } }),
      'sort.by=updatedAt&sort.order=DESC',
    );
  });

  it('preserves ascending sort order', () => {
    assert.equal(
      buildQuery({ sort: { by: 'name', order: 'ASC' } }),
      'sort.by=name&sort.order=ASC',
    );
  });

  it('URL-encodes sort values safely', () => {
    assert.equal(
      buildQuery({ sort: { by: 'process name', order: 'ASC' } }),
      'sort.by=process+name&sort.order=ASC',
    );
  });
});
