import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  buildAxisTileOrigins,
  buildPageTiles,
  buildShapeAwareTiles,
  calculateSvgPageLayout,
  extractShapeBounds,
  paginateBpmnSvg,
} from '../../.test-dist/shared/utils/paginatedBpmnSvg.js';


class TestSvgNode {
  constructor(localName, attributes = {}, rawInner = null) {
    this.localName = localName;
    this.attributes = { ...attributes };
    this.rawInner = rawInner;
    this.children = [];
    this.textContent = null;
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  querySelector(selector) {
    if (!selector.includes('rect') || !this.rawInner) return null;
    const match = this.rawInner.match(/<rect\b([^>]*)\/?>(?:<\/rect>)?/i);
    if (!match) return null;
    const attributes = {};
    for (const item of match[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[item[1]] = item[2];
    return new TestSvgNode('rect', attributes);
  }
  querySelectorAll(selector) {
    if (selector !== 'g.djs-element.djs-shape' || !this.rawInner) return [];
    const result = [];
    for (const match of this.rawInner.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/gi)) {
      const attributes = {};
      for (const item of match[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[item[1]] = item[2];
      if ((attributes.class ?? '').split(/\s+/).includes('djs-element')
        && (attributes.class ?? '').split(/\s+/).includes('djs-shape')) {
        result.push(new TestSvgNode('g', attributes, match[2]));
      }
    }
    return result;
  }
  cloneNode() {
    const clone = new TestSvgNode(this.localName, this.attributes, this.rawInner);
    clone.textContent = this.textContent;
    clone.children = this.children.map(child => child.cloneNode(true));
    return clone;
  }
}

function serializeTestSvgNode(node) {
  const escapeXml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
    .join('');
  const inner = node.textContent !== null
    ? escapeXml(node.textContent)
    : node.children.length
      ? node.children.map(serializeTestSvgNode).join('')
      : node.rawInner ?? '';
  return `<${node.localName}${attributes}>${inner}</${node.localName}>`;
}

function installSvgDomTestShim() {
  const previous = {
    document: globalThis.document,
    DOMParser: globalThis.DOMParser,
    XMLSerializer: globalThis.XMLSerializer,
  };

  class TestDocument {
    constructor(rootName = 'svg') {
      this.documentElement = new TestSvgNode(rootName);
      this.implementation = {
        createDocument: (_namespace, name) => new TestDocument(name),
      };
    }
    createElementNS(_namespace, name) { return new TestSvgNode(name); }
    importNode(node) { return node.cloneNode(true); }
  }

  globalThis.document = new TestDocument();
  globalThis.DOMParser = class {
    parseFromString(markup) {
      const open = markup.match(/<svg\b([^>]*)>/i);
      if (!open) return { documentElement: new TestSvgNode('html'), querySelector: () => null };
      const attributes = {};
      for (const match of open[1].matchAll(/([\w:-]+)="([^"]*)"/g)) {
        attributes[match[1]] = match[2];
      }
      const inner = markup.slice(open.index + open[0].length).replace(/<\/svg>\s*$/i, '');
      return {
        documentElement: new TestSvgNode('svg', attributes, inner),
        querySelector: () => null,
      };
    }
  };
  globalThis.XMLSerializer = class {
    serializeToString(node) { return serializeTestSvgNode(node); }
  };

  return () => {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete globalThis[key];
      else globalThis[key] = previous[key];
    }
  };
}

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


  it('extracts real bpmn-js matrix-transformed task bounds and moves both page cuts', () => {
    const rect = {
      getAttribute(name) {
        return ({ x: '0', y: '0', width: '100', height: '80' })[name] ?? null;
      },
    };
    const visual = { querySelector: selector => selector === 'rect' ? rect : null };
    const shape = {
      getAttribute: name => name === 'transform' ? 'matrix(1, 0, 0, 1, 1119.93, 682.4)' : null,
      querySelector: selector => selector === '.djs-visual rect' ? rect : null,
    };
    // The real SVG element supports querySelectorAll; the previous implementation
    // only understood translate(...) and silently ignored bpmn-js matrix(...).
    const extracted = extractShapeBounds({ querySelectorAll: () => [shape] });
    assert.deepEqual(extracted, [{ x: 1119.93, y: 682.4, width: 100, height: 80 }]);

    const viewBox = { x: 155, y: 75, width: 2200, height: 1600 };
    const layout = calculateSvgPageLayout(viewBox, 'landscape');
    const tiles = buildShapeAwareTiles(layout, viewBox, extracted);
    assert.ok(tiles.some(tile =>
      tile.x <= 1119.93 && tile.x + tile.width >= 1219.93
      && tile.y <= 682.4 && tile.y + tile.height >= 762.4),
    'one page must contain the complete task even when both nominal cuts cross it');
    assert.ok(tiles.every(tile => {
      const overlapX = tile.x < 1219.93 && tile.x + tile.width > 1119.93;
      const overlapY = tile.y < 762.4 && tile.y + tile.height > 682.4;
      return !(overlapX && overlapY)
        || (tile.x <= 1119.93 && tile.x + tile.width >= 1219.93
          && tile.y <= 682.4 && tile.y + tile.height >= 762.4);
    }), 'no page may contain only a clipped fragment of this matrix-transformed task');
  });

  it('moves a page boundary to a task start so the preceding viewport ends before it', () => {
    const origins = buildAxisTileOrigins(0, 2500, 1000, [
      { start: 950, end: 1050 },
    ]);

    assert.deepEqual(origins, [0, 950, 1950]);
    assert.ok(origins.every(origin => Number.isFinite(origin)));
    assert.ok(origins.some(origin => origin <= 950 && origin + 1000 >= 1050),
      'at least one full-size page viewport must contain the complete task');
    assert.ok(origins[1] < origins[0] + 1000,
      'the next page starts at the task boundary before the nominal page edge');
    assert.equal(origins[1], 950,
      'the next viewport starts exactly at the task start; the preceding viewport must stop there');
  });


  it('keeps an entire task inside at least one viewport when a cut crosses it', () => {
    const viewBox = { x: 0, y: 0, width: 2500, height: 100 };
    const layout = calculateSvgPageLayout(viewBox, 'landscape');
    const task = { x: 1000, y: 20, width: 100, height: 60 };
    const tiles = buildShapeAwareTiles(layout, viewBox, [task]);

    assert.ok(tiles.length >= layout.pages.length,
      'shape-aware pagination may add pages but must not remove coverage');
    assert.ok(tiles.every(tile => tile.width > 0 && tile.width <= layout.tileWidth
      && tile.height > 0 && tile.height <= layout.tileHeight),
    'task-aware viewports may be shorter, but never larger than the printable source window');
    assert.ok(tiles.every(tile => {
      const overlapsTaskX = tile.x < task.x + task.width && tile.x + tile.width > task.x;
      return !overlapsTaskX || (tile.x <= task.x && tile.x + tile.width >= task.x + task.width);
    }), 'no page may show only part of a task horizontally');
    assert.ok(tiles.every(tile => {
      const overlapsTaskY = tile.y < task.y + task.height && tile.y + tile.height > task.y;
      return !overlapsTaskY || (tile.y <= task.y && tile.y + tile.height >= task.y + task.height);
    }), 'no page may show only part of a task vertically');
    assert.ok(tiles.some(tile =>
      tile.x <= task.x && tile.x + tile.width >= task.x + task.width
      && tile.y <= task.y && tile.y + tile.height >= task.y + task.height),
    'the complete task must be visible on at least one page');
    const firstColumn = tiles.find(tile => tile.column === 0);
    assert.ok(firstColumn.x + firstColumn.width < task.x,
      'the preceding page ends before the task so it cannot display a clipped fragment');
    assert.ok(firstColumn.x + firstColumn.width >= task.x - 5,
      'the cut keeps only a small safety gutter before the task');
  });

  it('does not add overlaps when page boundaries already fall in whitespace', () => {
    assert.deepEqual(
      buildAxisTileOrigins(0, 2500, 1000, [{ start: 1200, end: 1300 }]),
      [0, 1000, 2000],
    );
  });

  it('rejects invalid axis dimensions and never loops on impossible input', () => {
    assert.throws(() => buildAxisTileOrigins(0, 0, 100, []), /positives/i);
    assert.throws(() => buildAxisTileOrigins(0, 100, Number.NaN, []), /positives/i);
  });

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

  it('paginates matrix-transformed tasks without clipping them in either orientation', () => {
    // This is the transform syntax emitted by real bpmn-js SVGs. The task crosses
    // both nominal first-page boundaries, which must be moved before the task.
    const viewBox = { x: 0, y: 0, width: 2500, height: 1600 };
    const restore = installSvgDomTestShim();

    try {
      for (const orientation of orientations) {
        const layout = calculateSvgPageLayout(viewBox, orientation);
        const task = {
          x: layout.tileWidth - 40,
          y: layout.tileHeight - 30,
          width: 100,
          height: 80,
        };
        const sourceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1600">
          <g class="djs-element djs-shape" transform="matrix(1, 0, 0, 1, ${task.x}, ${task.y})">
            <rect x="0" y="0" width="${task.width}" height="${task.height}"/>
          </g>
        </svg>`;
        const pages = paginateBpmnSvg(sourceSvg, {
          orientation,
          fontFamily: 'Arial, sans-serif',
          fontSizeMm: 3.5,
          title: 'Matrix pagination witness',
        });

        assert.equal(pages.length, layout.pages.length);
        pages.forEach((page, index) => {
          assert.match(page, new RegExp(`width="${layout.pageWidthMm}mm"`));
          assert.match(page, new RegExp(`height="${layout.pageHeightMm}mm"`));
          assert.match(page, new RegExp(`aria-label="Matrix pagination witness — page ${index + 1} sur ${pages.length}"`));
          const svgTags = [...page.matchAll(/<svg\b([^>]*)>/g)];
          assert.equal(svgTags.length, 2, 'each output must contain one A4 root and one source viewport');
          const nested = svgTags[1][1];
          assert.match(nested, /preserveAspectRatio="xMinYMin meet"/);
          assert.match(nested, /overflow="hidden"/);
          const nestedViewBox = nested.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
          assert.ok(nestedViewBox?.[2] > 0 && nestedViewBox[2] <= layout.tileWidth);
          assert.ok(nestedViewBox?.[3] > 0 && nestedViewBox[3] <= layout.tileHeight);

          const [x, y, width, height] = nestedViewBox;
          const overlapsX = x < task.x + task.width && x + width > task.x;
          const overlapsY = y < task.y + task.height && y + height > task.y;
          assert.ok(!(overlapsX && overlapsY)
            || (x <= task.x && x + width >= task.x + task.width
              && y <= task.y && y + height >= task.y + task.height),
          'a page that intersects the task must contain the entire task');
          const nestedWidth = Number(nested.match(/\bwidth="([^"]+)"/)?.[1]);
          const nestedHeight = Number(nested.match(/\bheight="([^"]+)"/)?.[1]);
          assert.ok(Math.abs(nestedWidth - width * 25.4 / 96) < 0.001,
            'shortened viewports must keep the same horizontal print scale');
          assert.ok(Math.abs(nestedHeight - height * 25.4 / 96) < 0.001,
            'shortened viewports must keep the same vertical print scale');
        });
      }
    } finally {
      restore();
    }
  });

});
