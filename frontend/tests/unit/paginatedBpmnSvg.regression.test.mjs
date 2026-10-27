import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateSvgPageLayout,
  paginateBpmnSvg,
} from '../../.test-dist/shared/utils/paginatedBpmnSvg.js';

const orientations = ['portrait', 'landscape'];

describe('paginated BPMN SVG regression contracts', () => {
  for (const orientation of orientations) {
    it(`keeps page dimensions, printable area and numbering consistent in ${orientation}`, () => {
      const layout = calculateSvgPageLayout(
        { x: -25, y: 17, width: 2400, height: 1700 },
        orientation,
      );
      const expectedWidth = orientation === 'portrait' ? 210 : 297;
      const expectedHeight = orientation === 'portrait' ? 297 : 210;

      assert.equal(layout.pageWidthMm, expectedWidth);
      assert.equal(layout.pageHeightMm, expectedHeight);
      assert.ok(layout.contentXmm >= 0);
      assert.ok(layout.contentYmm > 0);
      assert.ok(layout.contentWidthMm > 0);
      assert.ok(layout.contentHeightMm > 0);
      assert.equal(layout.pages.length, layout.columns * layout.rows);
      assert.deepEqual(
        layout.pages.map(page => page.page),
        Array.from({ length: layout.pages.length }, (_, index) => index + 1),
      );

      for (const page of layout.pages) {
        assert.ok(page.width > 0);
        assert.ok(page.height > 0);
        assert.equal(page.columns, layout.columns);
        assert.equal(page.rows, layout.rows);
      }
    });
  }

  it('keeps tile coordinates deterministic and row-major', () => {
    const viewBox = { x: 13, y: 29, width: 1800, height: 1600 };
    const first = calculateSvgPageLayout(viewBox, 'landscape');
    const second = calculateSvgPageLayout(viewBox, 'landscape');

    assert.deepEqual(first, second);
    first.pages.forEach((page, index) => {
      assert.equal(page.page, index + 1);
      assert.equal(page.column, index % first.columns);
      assert.equal(page.row, Math.floor(index / first.columns));
    });
  });

  it('rejects malformed options before touching browser-only DOM APIs', () => {
    assert.throws(
      () => paginateBpmnSvg('<svg/>', null),
      /options/i,
    );
    assert.throws(
      () => paginateBpmnSvg('<svg/>', { orientation: 'square', fontFamily: 'Arial', fontSizeMm: 3 }),
      /orientation/i,
    );
    assert.throws(
      () => paginateBpmnSvg('<svg/>', { orientation: 'portrait', fontFamily: '  ', fontSizeMm: 3 }),
      /police/i,
    );
    for (const fontSizeMm of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(
        () => paginateBpmnSvg('<svg/>', { orientation: 'portrait', fontFamily: 'Arial', fontSizeMm }),
        /police/i,
      );
    }
  });

  it('rejects SVG dimensions that overflow safe page-count arithmetic', () => {
    assert.throws(
      () => calculateSvgPageLayout(
        { x: 0, y: 0, width: Number.MAX_VALUE, height: Number.MAX_VALUE },
        'portrait',
      ),
      /500 pages/,
    );
  });
});
