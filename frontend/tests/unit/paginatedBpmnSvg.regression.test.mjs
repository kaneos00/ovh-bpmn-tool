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
      const open = markup.match(/<svg\\b([^>]*)>/i);
      if (!open) return { documentElement: new TestSvgNode('html'), querySelector: () => null };
      const attributes = {};
      for (const match of open[1].matchAll(/([\\w:-]+)="([^"]*)"/g)) {
        attributes[match[1]] = match[2];
      }
      const inner = markup.slice(open.index + open[0].length).replace(/<\\/svg>\\s*$/i, '');
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

  it('generates paginated SVG output from the witness process in both orientations', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const bpmn = readFileSync(resolve(here, '../fixtures/pagination-witness.bpmn'), 'utf8');
    const bounds = [...bpmn.matchAll(/<dc:Bounds\\b[^>]*\\bx="([\\d.-]+)"[^>]*\\by="([\\d.-]+)"[^>]*\\bwidth="([\\d.-]+)"[^>]*\\bheight="([\\d.-]+)"[^>]*\\/>/g)]
      .map(match => ({ x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) }));
    const minX = Math.min(...bounds.map(bound => bound.x));
    const minY = Math.min(...bounds.map(bound => bound.y));
    const maxX = Math.max(...bounds.map(bound => bound.x + bound.width));
    const maxY = Math.max(...bounds.map(bound => bound.y + bound.height));
    const viewBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    const sourceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">${bounds.map((bound, index) => `<g data-witness-shape="${index}"><rect x="${bound.x}" y="${bound.y}" width="${bound.width}" height="${bound.height}"/></g>`).join('')}</svg>`;
    const restore = installSvgDomTestShim();

    try {
      for (const orientation of orientations) {
        const expected = calculateSvgPageLayout(viewBox, orientation);
        const pages = paginateBpmnSvg(sourceSvg, {
          orientation,
          fontFamily: 'Arial, sans-serif',
          fontSizeMm: 3.5,
          title: 'Pagination witness',
        });

        assert.equal(pages.length, expected.pages.length);
        pages.forEach((page, index) => {
          assert.match(page, new RegExp(`width="${expected.pageWidthMm}mm"`));
          assert.match(page, new RegExp(`height="${expected.pageHeightMm}mm"`));
          assert.match(page, new RegExp(`aria-label="Pagination witness — page ${index + 1} sur ${pages.length}"`));
          const svgTags = [...page.matchAll(/<svg\\b([^>]*)>/g)];
          assert.equal(svgTags.length, 2, 'each output must contain one A4 root and one source viewport');
          const nested = svgTags[1][1];
          assert.match(nested, /preserveAspectRatio="xMinYMin meet"/);
          assert.match(nested, /overflow="hidden"/);
          const nestedViewBox = nested.match(/viewBox="([^"]+)"/)?.[1].split(/\\s+/).map(Number);
          assert.equal(nestedViewBox?.[2], expected.tileWidth);
          assert.equal(nestedViewBox?.[3], expected.tileHeight);
        });
      }
    } finally {
      restore();
    }
  });

});
