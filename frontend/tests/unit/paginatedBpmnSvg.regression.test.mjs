import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  buildPageTiles,
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
  it('keeps a constant source window and print scale on edge tiles', () => {
    const viewBox = { x: -25, y: 17, width: 2400, height: 1700 };
    const layout = calculateSvgPageLayout(viewBox, 'portrait');
    const tiles = buildPageTiles(layout);

    assert.equal(tiles.length, layout.columns * layout.rows);
    for (const tile of tiles) {
      assert.equal(tile.width, layout.tileWidth);
      assert.equal(tile.height, layout.tileHeight);
      assert.equal(tile.x, viewBox.x + tile.column * layout.tileWidth);
      assert.equal(tile.y, viewBox.y + tile.row * layout.tileHeight);
    }
    assert.ok(tiles.some(tile => tile.x + tile.width > viewBox.x + viewBox.width),
      'the last column must keep a full-size viewport rather than scale down');
    assert.ok(tiles.some(tile => tile.y + tile.height > viewBox.y + viewBox.height),
      'the last row must keep a full-size viewport rather than scale down');
  });

  it('derives multi-page portrait and landscape layouts from the BPMN witness process', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const bpmn = readFileSync(resolve(here, '../fixtures/pagination-witness.bpmn'), 'utf8');
    const bounds = [...bpmn.matchAll(/<dc:Bounds\b[^>]*\bx="([\d.-]+)"[^>]*\by="([\d.-]+)"[^>]*\bwidth="([\d.-]+)"[^>]*\bheight="([\d.-]+)"[^>]*\/>/g)]
      .map(match => ({ x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) }));

    assert.ok(bounds.length >= 5, 'witness process should contain BPMN diagram shapes');
    assert.match(bpmn, /<bpmn:process\b/);
    assert.match(bpmn, /<bpmn:sequenceFlow\b/);

    const minX = Math.min(...bounds.map(bound => bound.x));
    const minY = Math.min(...bounds.map(bound => bound.y));
    const maxX = Math.max(...bounds.map(bound => bound.x + bound.width));
    const maxY = Math.max(...bounds.map(bound => bound.y + bound.height));
    const viewBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

    for (const orientation of orientations) {
      const layout = calculateSvgPageLayout(viewBox, orientation);
      assert.ok(layout.pages.length > 1, `witness process should paginate in ${orientation}`);
      assert.equal(layout.pages.length, layout.columns * layout.rows);
      assert.ok(layout.pages.every(page => page.width === layout.tileWidth && page.height === layout.tileHeight));
    }
  });

});
