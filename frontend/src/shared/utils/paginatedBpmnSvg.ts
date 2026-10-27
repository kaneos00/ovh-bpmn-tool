export type SvgPageOrientation = 'portrait' | 'landscape';

export type PaginatedSvgOptions = {
  orientation: SvgPageOrientation;
  fontFamily: string;
  fontSizeMm: number;
  title?: string;
};

export type SvgPageTile = {
  page: number;
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
};

export type SvgPageLayout = {
  pageWidthMm: number;
  pageHeightMm: number;
  contentXmm: number;
  contentYmm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  pages: SvgPageTile[];
};

const MM_PER_INCH = 25.4;
const SVG_UNITS_PER_INCH = 96;
const MARGIN_MM = 10;
const HEADER_MM = 12;
const FOOTER_MM = 12;
// Fail fast rather than freezing the browser or triggering hundreds of downloads.
const MAX_EXPORT_PAGES = 500;
// Leave a small safety gutter so the centered SVG stroke is not clipped at the cut.
const SHAPE_CUT_PADDING = 4;
const SVG_NS = 'http://www.w3.org/2000/svg';

export function calculateSvgPageLayout(
  viewBox: { x: number; y: number; width: number; height: number },
  orientation: SvgPageOrientation,
): SvgPageLayout {
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    throw new Error("L'orientation doit être « portrait » ou « landscape ».");
  }
  if (
    !Number.isFinite(viewBox.x) ||
    !Number.isFinite(viewBox.y) ||
    !Number.isFinite(viewBox.width) ||
    !Number.isFinite(viewBox.height) ||
    viewBox.width <= 0 ||
    viewBox.height <= 0
  ) {
    throw new Error('Le viewBox SVG doit avoir une largeur et une hauteur positives.');
  }

  const pageWidthMm = orientation === 'portrait' ? 210 : 297;
  const pageHeightMm = orientation === 'portrait' ? 297 : 210;
  const contentXmm = MARGIN_MM;
  const contentYmm = MARGIN_MM + HEADER_MM;
  const contentWidthMm = pageWidthMm - MARGIN_MM * 2;
  const contentHeightMm = pageHeightMm - contentYmm - MARGIN_MM - FOOTER_MM;
  const tileWidth = (contentWidthMm / MM_PER_INCH) * SVG_UNITS_PER_INCH;
  const tileHeight = (contentHeightMm / MM_PER_INCH) * SVG_UNITS_PER_INCH;
  const columns = Math.max(1, Math.ceil(viewBox.width / tileWidth));
  const rows = Math.max(1, Math.ceil(viewBox.height / tileHeight));
  const pageCount = columns * rows;
  if (
    !Number.isSafeInteger(columns) ||
    !Number.isSafeInteger(rows) ||
    !Number.isSafeInteger(pageCount) ||
    pageCount > MAX_EXPORT_PAGES
  ) {
    throw new Error(
      `Le diagramme nécessite plus de ${MAX_EXPORT_PAGES} pages A4. Réduisez sa taille ou exportez-le par sections.`,
    );
  }
  const pages: SvgPageTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      pages.push({
        page: pages.length + 1,
        column,
        row,
        x: viewBox.x + column * tileWidth,
        y: viewBox.y + row * tileHeight,
        width: tileWidth,
        height: tileHeight,
        columns,
        rows,
      });
    }
  }

  return {
    pageWidthMm,
    pageHeightMm,
    contentXmm,
    contentYmm,
    contentWidthMm,
    contentHeightMm,
    tileWidth,
    tileHeight,
    columns,
    rows,
    pages,
  };
}

function parseViewBox(svg: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const rawViewBox = svg.getAttribute('viewBox');
  if (rawViewBox) {
    const values = rawViewBox.trim().split(/[\s,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
      return { x: values[0], y: values[1], width: values[2], height: values[3] };
    }
  }

  const width = Number.parseFloat(svg.getAttribute('width') ?? '');
  const height = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { x: 0, y: 0, width, height };
  }

  throw new Error('Le SVG BPMN ne contient pas de viewBox ni de dimensions exploitables.');
}

function createText(
  document: XMLDocument,
  text: string,
  x: number,
  y: number,
  options: { fontFamily: string; fontSizeMm: number; anchor?: string },
): SVGTextElement {
  const element = document.createElementNS(SVG_NS, 'text');
  element.setAttribute('x', String(x));
  element.setAttribute('y', String(y));
  element.setAttribute('font-family', options.fontFamily);
  element.setAttribute('font-size', String(options.fontSizeMm));
  element.setAttribute('fill', '#263238');
  if (options.anchor) element.setAttribute('text-anchor', options.anchor);
  element.textContent = text;
  return element;
}

/**
 * Keep every source viewport identical so all pages share the same print scale.
 * Edge pages intentionally retain the unused area instead of stretching their
 * smaller remaining source region to fill the printable A4 area.
 */
export function buildPageTiles(layout: SvgPageLayout): SvgPageTile[] {
  return layout.pages.map(tile => ({ ...tile }));
}

export type SvgShapeBounds = { x: number; y: number; width: number; height: number };

/**
 * Choose page origins that snap a nominal boundary to the start of a protected
 * BPMN shape. buildShapeAwareTiles shortens the preceding viewport to that
 * same coordinate, so no page contains a clipped fragment of the shape.
 */
export function buildAxisTileOrigins(
  start: number,
  extent: number,
  tileSize: number,
  protectedRanges: Array<{ start: number; end: number }>,
): number[] {
  if (![start, extent, tileSize].every(Number.isFinite) || extent <= 0 || tileSize <= 0) {
    throw new Error('Les dimensions de pagination doivent être positives et finies.');
  }
  const end = start + extent;
  const origins = [start];
  while (origins[origins.length - 1] + tileSize < end) {
    const current = origins[origins.length - 1];
    const nominal = current + tileSize;
    const crossing = protectedRanges
      .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end)
        && range.start > current + 0.5 && range.start < nominal
        && range.end > nominal && range.end - range.start <= tileSize)
      .sort((a, b) => a.start - b.start)[0];
    const next = crossing ? crossing.start : nominal;
    if (!(next > current)) throw new Error('Impossible de calculer les recouvrements de pagination.');
    origins.push(next);
    if (origins.length > MAX_EXPORT_PAGES) {
      throw new Error(`Le diagramme nécessite plus de ${MAX_EXPORT_PAGES} pages A4. Réduisez sa taille ou exportez-le par sections.`);
    }
  }
  return origins;
}

export function extractShapeBounds(sourceSvg: SVGSVGElement): SvgShapeBounds[] {
  if (typeof sourceSvg.querySelectorAll !== 'function') return [];
  const bounds: SvgShapeBounds[] = [];
  for (const shape of Array.from(sourceSvg.querySelectorAll('g.djs-element.djs-shape'))) {
    const transform = shape.getAttribute('transform') ?? '';
    // Real bpmn-js SVGs normally position shapes with matrix(1, 0, 0, 1, x, y),
    // not translate(x, y). Support both forms and compute the transformed
    // axis-aligned bounds so the pagination planner sees the actual coordinates.
    let a = 1;
    let b = 0;
    let c = 0;
    let d = 1;
    let e = 0;
    let f = 0;
    if (transform) {
      const translation = transform.match(/^\s*translate\(\s*(-?[\d.eE+-]+)(?:[ ,]+(-?[\d.eE+-]+))?\s*\)\s*$/);
      const matrix = transform.match(/^\s*matrix\(\s*([^)]*)\s*\)\s*$/);
      if (translation) {
        e = Number(translation[1]);
        f = Number(translation[2] ?? 0);
      } else if (matrix) {
        const values = matrix[1].split(/[ ,]+/).map(Number);
        if (values.length !== 6 || !values.every(Number.isFinite)) continue;
        [a, b, c, d, e, f] = values;
      } else {
        // Do not guess when an SVG shape uses an unsupported transform.
        continue;
      }
    }
    const visual = shape.querySelector('.djs-visual') ?? shape;
    if (!visual) continue;
    // Do not let a transparent hit-area or the outline determine the task size.
    // Query inside djs-visual only and prefer the largest ordinary rectangle;
    // this also works with BPMN extensions that prepend decorative rects.
    const rects = typeof visual.querySelectorAll === 'function'
      ? Array.from(visual.querySelectorAll('rect'))
      : [visual.querySelector('rect')].filter((rect): rect is SVGRectElement => Boolean(rect));
    const candidates = rects.map(rect => ({
      rect,
      x: Number(rect.getAttribute('x') ?? 0),
      y: Number(rect.getAttribute('y') ?? 0),
      width: Number(rect.getAttribute('width')),
      height: Number(rect.getAttribute('height')),
    })).filter(candidate =>
      [candidate.x, candidate.y, candidate.width, candidate.height].every(Number.isFinite)
      && candidate.width > 0 && candidate.height > 0
      && Math.max(candidate.width, candidate.height) <= 180,
    ).sort((left, right) => right.width * right.height - left.width * left.height);
    const candidate = candidates[0];
    if (!candidate) continue;
    const { x, y, width, height } = candidate;
    if (![x, y, width, height, a, b, c, d, e, f].every(Number.isFinite) || width <= 0 || height <= 0) continue;
    // Pools/lanes are intentionally large and may span multiple pages.
    if (Math.max(width, height) > 180) continue;
    const corners = [
      [x, y], [x + width, y], [x, y + height], [x + width, y + height],
    ].map(([px, py]) => ({ x: a * px + c * py + e, y: b * px + d * py + f }));
    const minX = Math.min(...corners.map(point => point.x));
    const maxX = Math.max(...corners.map(point => point.x));
    const minY = Math.min(...corners.map(point => point.y));
    const maxY = Math.max(...corners.map(point => point.y));
    bounds.push({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  }
  return bounds;
}

export function buildShapeAwareTiles(
  layout: SvgPageLayout,
  viewBox: { x: number; y: number; width: number; height: number },
  shapes: SvgShapeBounds[],
): SvgPageTile[] {
  const xRanges = shapes
    .filter(shape => [shape.x, shape.width].every(Number.isFinite) && shape.width > 0)
    .map(shape => ({ start: shape.x - SHAPE_CUT_PADDING, end: shape.x + shape.width + SHAPE_CUT_PADDING }));
  const yRanges = shapes
    .filter(shape => [shape.y, shape.height].every(Number.isFinite) && shape.height > 0)
    .map(shape => ({ start: shape.y - SHAPE_CUT_PADDING, end: shape.y + shape.height + SHAPE_CUT_PADDING }));

  // Plan cuts against every protected shape, then validate the resulting cuts
  // globally. This second pass is intentional: moving a cut around one shape
  // must not leave it inside a different shape that happened to be farther
  // from the original nominal boundary.
  const safeOrigins = (start: number, extent: number, tileSize: number,
    ranges: Array<{ start: number; end: number }>): number[] => {
    const end = start + extent;
    const origins = [start];
    while (origins[origins.length - 1] + tileSize < end) {
      const current = origins[origins.length - 1];
      const nominal = current + tileSize;
      let candidate = nominal;

      // First move the nominal cut to the start of a shape it crosses.
      // Then repeat the check at the *new* coordinate: that coordinate may
      // itself fall inside another task (the exact failure in Parking test 4).
      for (let pass = 0; pass < ranges.length + 1; pass += 1) {
        let crossing: { start: number; end: number } | undefined;
        for (const range of ranges) {
          if (range.start > current + 0.5
            && range.start < candidate - 0.5
            && range.end > candidate
            && range.end - range.start <= tileSize
            && (!crossing || range.start < crossing.start)) {
            crossing = range;
          }
        }
        if (!crossing) break;
        candidate = crossing.start;
      }

      if (!(candidate > current + 0.5)) {
        throw new Error('Impossible de sécuriser toutes les coupures du diagramme.');
      }
      origins.push(candidate);
      if (origins.length > MAX_EXPORT_PAGES) {
        throw new Error(`Le diagramme nécessite plus de ${MAX_EXPORT_PAGES} pages A4. Réduisez sa taille ou exportez-le par sections.`);
      }
    }
    return origins;
  };
  const xs = safeOrigins(viewBox.x, viewBox.width, layout.tileWidth, xRanges);
  const ys = safeOrigins(viewBox.y, viewBox.height, layout.tileHeight, yRanges);
  const count = xs.length * ys.length;
  if (count > MAX_EXPORT_PAGES) {
    throw new Error(`Le diagramme nécessite plus de ${MAX_EXPORT_PAGES} pages A4. Réduisez sa taille ou exportez-le par sections.`);
  }
  const axisSegments = (origins: number[], tileSize: number) =>
    origins.map((origin, index) => {
      const nextOrigin = origins[index + 1];
      const naturalEnd = origin + tileSize;
      // When the next page starts at a task boundary before the nominal page
      // edge, stop this page there too. Otherwise the task would still appear
      // clipped on the preceding page despite being complete on the next one.
      const end = nextOrigin !== undefined && nextOrigin < naturalEnd - 0.5
        ? nextOrigin
        : naturalEnd;
      return { origin, size: end - origin };
    });
  const xSegments = axisSegments(xs, layout.tileWidth);
  const ySegments = axisSegments(ys, layout.tileHeight);
  const tiles: SvgPageTile[] = [];
  for (let row = 0; row < ySegments.length; row += 1) {
    for (let column = 0; column < xSegments.length; column += 1) {
      tiles.push({
        page: tiles.length + 1, column, row,
        x: xSegments[column].origin, y: ySegments[row].origin,
        width: xSegments[column].size, height: ySegments[row].size,
        columns: xSegments.length, rows: ySegments.length,
      });
    }
  }
  return tiles;
}

/**
 * Cuts the rendered BPMN SVG into printable A4 viewports. It deliberately does
 * not rewrite BPMN XML or invent BPMN events: page continuations are export-only
 * labels, so the process semantics remain unchanged.
 */
/**
 * Cuts the rendered BPMN SVG into printable A4 viewports. It deliberately does
 * not rewrite BPMN XML or invent BPMN events: page continuations are export-only
 * labels, so the process semantics remain unchanged.
 */
export function paginateBpmnSvg(
  svgMarkup: string,
  options: PaginatedSvgOptions,
): string[] {
  if (!options || typeof options !== 'object') {
    throw new Error("Les options d'export sont obligatoires.");
  }
  if (options.orientation !== 'portrait' && options.orientation !== 'landscape') {
    throw new Error("L'orientation doit être « portrait » ou « landscape ».");
  }
  if (typeof options.fontFamily !== 'string' || !options.fontFamily.trim()) {
    throw new Error('La famille de police ne peut pas être vide.');
  }
  if (!Number.isFinite(options.fontSizeMm) || options.fontSizeMm <= 0) {
    throw new Error('La taille de police doit être un nombre positif.');
  }

  const parser = new DOMParser();
  const sourceDocument = parser.parseFromString(svgMarkup, 'image/svg+xml');
  if (sourceDocument.querySelector('parsererror')) {
    throw new Error('Le SVG généré par le modeleur est invalide.');
  }

  const sourceSvg = sourceDocument.documentElement as unknown as SVGSVGElement;
  if (sourceSvg.localName !== 'svg') {
    throw new Error('Le document exporté ne contient pas de racine SVG.');
  }

  const viewBox = parseViewBox(sourceSvg);
  const layout = calculateSvgPageLayout(viewBox, options.orientation);
  const pageTiles = buildShapeAwareTiles(layout, viewBox, extractShapeBounds(sourceSvg));
  const serializer = new XMLSerializer();
  const title = options.title?.trim() || 'Export BPMN';
  const fontOptions = {
    fontFamily: options.fontFamily,
    fontSizeMm: options.fontSizeMm,
  };

  return pageTiles.map(tile => {
    const pageDocument = document.implementation.createDocument(SVG_NS, 'svg', null);
    const pageSvg = pageDocument.documentElement;
    pageSvg.setAttribute('width', `${layout.pageWidthMm}mm`);
    pageSvg.setAttribute('height', `${layout.pageHeightMm}mm`);
    pageSvg.setAttribute('viewBox', `0 0 ${layout.pageWidthMm} ${layout.pageHeightMm}`);
    pageSvg.setAttribute('font-family', options.fontFamily);
    pageSvg.setAttribute('role', 'img');
    pageSvg.setAttribute('aria-label', `${title} — page ${tile.page} sur ${pageTiles.length}`);

    const background = pageDocument.createElementNS(SVG_NS, 'rect');
    background.setAttribute('width', String(layout.pageWidthMm));
    background.setAttribute('height', String(layout.pageHeightMm));
    background.setAttribute('fill', '#ffffff');
    pageSvg.appendChild(background);

    pageSvg.appendChild(
      createText(
        pageDocument,
        title,
        layout.contentXmm,
        MARGIN_MM + options.fontSizeMm,
        { ...fontOptions, fontSizeMm: options.fontSizeMm * 1.25 },
      ),
    );

    const pageLabel = pageDocument.createElementNS(SVG_NS, 'text');
    pageLabel.setAttribute('x', String(layout.pageWidthMm - MARGIN_MM));
    pageLabel.setAttribute('y', String(MARGIN_MM + options.fontSizeMm));
    pageLabel.setAttribute('text-anchor', 'end');
    pageLabel.setAttribute('font-family', options.fontFamily);
    pageLabel.setAttribute('font-size', String(options.fontSizeMm));
    pageLabel.setAttribute('fill', '#52616b');
    pageLabel.textContent = `Page ${tile.page}/${layout.pages.length}`;
    pageSvg.appendChild(pageLabel);

    const nestedSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
    nestedSvg.setAttribute('x', String(layout.contentXmm));
    nestedSvg.setAttribute('y', String(layout.contentYmm));
    nestedSvg.setAttribute('width', String(layout.contentWidthMm));
    nestedSvg.setAttribute('height', String(layout.contentHeightMm));
    nestedSvg.setAttribute('viewBox', `${tile.x} ${tile.y} ${tile.width} ${tile.height}`);
    nestedSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    nestedSvg.setAttribute('font-family', options.fontFamily);
    nestedSvg.setAttribute('overflow', 'hidden');
    nestedSvg.removeAttribute('style');
    pageSvg.appendChild(pageDocument.importNode(nestedSvg, true));

    const markerY = layout.contentYmm + layout.contentHeightMm + options.fontSizeMm * 1.8;
    const markers: string[] = [];
    if (tile.column > 0) markers.push('← Reprise du segment précédent');
    if (tile.column < tile.columns - 1) markers.push('Suite du segment →');
    if (tile.row > 0) markers.push('↑ Reprise de la page précédente');
    if (tile.row < tile.rows - 1) markers.push('Suite page suivante ↓');

    if (markers.length) {
      pageSvg.appendChild(
        createText(pageDocument, markers.join('  ·  '), layout.contentXmm, markerY, fontOptions),
      );
    }

    return serializer.serializeToString(pageSvg);
  });
}
