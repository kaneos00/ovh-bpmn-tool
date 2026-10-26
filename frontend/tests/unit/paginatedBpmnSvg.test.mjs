import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateSvgPageLayout } from '../../.test-dist/shared/utils/paginatedBpmnSvg.js';

describe('calculateSvgPageLayout', () => {
  it('creates a single A4 portrait page for a small diagram', () => {
    const layout = calculateSvgPageLayout(
      { x: 0, y: 0, width: 500, height: 500 },
      'portrait',
    );

    assert.equal(layout.pageWidthMm, 210);
    assert.equal(layout.pageHeightMm, 297);
    assert.equal(layout.pages.length, 1);
    assert.equal(layout.pages[0].column, 0);
    assert.equal(layout.pages[0].row, 0);
  });

  it('splits a wide diagram into consecutive horizontal segments', () => {
    const layout = calculateSvgPageLayout(
      { x: 25, y: 40, width: 2000, height: 500 },
      'portrait',
    );

    assert.ok(layout.columns > 1);
    assert.equal(layout.rows, 1);
    assert.equal(layout.pages.length, layout.columns);
    assert.equal(layout.pages[0].x, 25);
    assert.equal(layout.pages[1].x, 25 + layout.tileWidth);
    assert.equal(layout.pages[0].page, 1);
    assert.equal(layout.pages.at(-1)?.page, layout.pages.length);
  });

  it('tiles tall and wide diagrams in row-major order', () => {
    const layout = calculateSvgPageLayout(
      { x: 0, y: 0, width: 2000, height: 1800 },
      'landscape',
    );

    assert.ok(layout.columns > 1);
    assert.ok(layout.rows > 1);
    assert.equal(layout.pages.length, layout.columns * layout.rows);
    assert.equal(layout.pages[layout.columns].row, 1);
    assert.equal(layout.pages[layout.columns].column, 0);
  });

  it('rejects invalid SVG dimensions', () => {
    assert.throws(
      () => calculateSvgPageLayout({ x: 0, y: 0, width: 0, height: 20 }, 'portrait'),
      /positives/,
    );
  });
});
