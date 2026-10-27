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

/**
 * Extract visible labels embedded in large BPMN participant/lane shapes.
 * On continuation columns the original labels are outside the clipped source
 * viewport, so repeat their names in the page header rather than silently
 * losing the context of the process.
 */
function extractParticipantLabels(sourceSvg: SVGSVGElement): string[] {
  // Lightweight DOM shims used by unit tests may not implement selectors.
  if (typeof sourceSvg.querySelectorAll !== 'function') return [];
  const labels = new Set<string>();
  for (const shape of Array.from(sourceSvg.querySelectorAll('g.djs-element.djs-shape'))) {
    const visual = shape.querySelector('.djs-visual');
    const boundary = visual?.querySelector('rect[rx="0"]');
    if (!visual || !boundary) continue;

    const width = Number(boundary.getAttribute('width'));
    const height = Number(boundary.getAttribute('height'));
    // Pools/lanes are substantially larger than ordinary BPMN activities.
    if (!Number.isFinite(width) || !Number.isFinite(height) || Math.max(width, height) < 180) continue;

    const label = visual.querySelector('text');
    const value = label?.textContent?.replace(/\s+/g, ' ').trim();
    if (value) labels.add(value);
  }
  return Array.from(labels);
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
 * Choose full-size viewport origins that overlap when a nominal page boundary
 * would cross a protected BPMN shape. Overlap preserves the print scale and
 * guarantees that a shape no wider/taller than one viewport is fully visible
 * on at least one page. A small number of shapes may therefore be repeated.
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

function extractShapeBounds(sourceSvg: SVGSVGElement): SvgShapeBounds[] {
  if (typeof sourceSvg.querySelectorAll !== 'function') return [];
  const bounds: SvgShapeBounds[] = [];
  for (const shape of Array.from(sourceSvg.querySelectorAll('g.djs-element.djs-shape'))) {
    const transform = shape.getAttribute('transform') ?? '';
    // bpmn-js positions shapes with translate(x, y). Ignore unsupported
    // transforms rather than guessing at geometry and shifting page cuts.
    const translation = transform.match(/^\s*translate\(\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?\s*\)\s*$/);
    if (transform && !translation) continue;
    const rect = shape.querySelector('.djs-visual rect');
    if (!rect) continue;
    const x = Number(rect.getAttribute('x') ?? 0);
    const y = Number(rect.getAttribute('y') ?? 0);
    const width = Number(rect.getAttribute('width'));
    const height = Number(rect.getAttribute('height'));
    const tx = translation ? Number(translation[1]) : 0;
    const ty = translation ? Number(translation[2] ?? 0) : 0;
    if (![x, y, width, height, tx, ty].every(Number.isFinite) || width <= 0 || height <= 0) continue;
    // Ignore pools/lanes: their large boundaries are intended to span pages.
    if (Math.max(width, height) > 180) continue;
    bounds.push({ x: tx + x, y: ty + y, width, height });
  }
  return bounds;
}

export function buildShapeAwareTiles(
  layout: SvgPageLayout,
  viewBox: { x: number; y: number; width: number; height: number },
  shapes: SvgShapeBounds[],
): SvgPageTile[] {
  const xs = buildAxisTileOrigins(viewBox.x, viewBox.width, layout.tileWidth,
    shapes.map(shape => ({ start: shape.x, end: shape.x + shape.width })));
  const ys = buildAxisTileOrigins(viewBox.y, viewBox.height, layout.tileHeight,
    shapes.map(shape => ({ start: shape.y, end: shape.y + shape.height })));
  const count = xs.length * ys.length;
  if (count > MAX_EXPORT_PAGES) {
    throw new Error(`Le diagramme nécessite plus de ${MAX_EXPORT_PAGES} pages A4. Réduisez sa taille ou exportez-le par sections.`);
  }
  const tiles: SvgPageTile[] = [];
  for (let row = 0; row < ys.length; row += 1) {
    for (let column = 0; column < xs.length; column += 1) {
      tiles.push({
        page: tiles.length + 1, column, row, x: xs[column], y: ys[row],
        width: layout.tileWidth, height: layout.tileHeight,
        columns: xs.length, rows: ys.length,
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
  const participantLabels = extractParticipantLabels(sourceSvg);

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
    pageLabel.textContent = `Page ${tile.page}/${pageTiles.length}`;
    pageSvg.appendChild(pageLabel);

    // A clipped continuation column no longer contains the original pool/lane
    // labels at the left edge. Repeat the names as a compact, printable context
    // line above the diagram; this does not modify BPMN semantics or geometry.
    if (tile.column > 0 && participantLabels.length > 0) {
      const continuation = createText(
        pageDocument,
        `Participants / lanes : ${participantLabels.join(' · ')}`,
        layout.contentXmm,
        layout.contentYmm - options.fontSizeMm * 0.65,
        { ...fontOptions, fontSizeMm: Math.min(options.fontSizeMm, 2.5) },
      );
      continuation.setAttribute('fill', '#52616b');
      pageSvg.appendChild(continuation);
    }

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
    if (tile.column > 0 && tile.x < viewBox.x + tile.column * layout.tileWidth - 0.5) markers.push('Zone de raccord recouverte');
    if (tile.row > 0) markers.push('↑ Reprise de la page précédente');
    if (tile.row < tile.rows - 1) markers.push('Suite page suivante ↓');
    if (tile.row > 0 && tile.y < viewBox.y + tile.row * layout.tileHeight - 0.5) markers.push('Zone de raccord recouverte');

    if (markers.length) {
      pageSvg.appendChild(
        createText(pageDocument, markers.join('  ·  '), layout.contentXmm, markerY, fontOptions),
      );
    }

    return serializer.serializeToString(pageSvg);
  });
}
