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
    if (values.length === 4 && values.every(Number.isFinite)) {
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

type ShapeBounds = { x: number; y: number; width: number; height: number };

function collectShapeBounds(
  sourceSvg: SVGSVGElement,
  viewBox: { x: number; y: number; width: number; height: number },
): ShapeBounds[] {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.visibility = 'hidden';
  host.style.overflow = 'visible';

  const measurableSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
  measurableSvg.setAttribute('width', `${viewBox.width}px`);
  measurableSvg.setAttribute('height', `${viewBox.height}px`);
  measurableSvg.setAttribute(
    'viewBox',
    `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
  );
  host.appendChild(measurableSvg);
  document.body.appendChild(host);

  try {
    return Array.from(measurableSvg.querySelectorAll<SVGGElement>('g.djs-shape'))
      .flatMap(group => {
        try {
          const bounds = group.getBBox();
          const matrix = group.getCTM();
          if (!matrix || bounds.width <= 0 || bounds.height <= 0) return [];

          const points = [
            [bounds.x, bounds.y],
            [bounds.x + bounds.width, bounds.y],
            [bounds.x, bounds.y + bounds.height],
            [bounds.x + bounds.width, bounds.y + bounds.height],
          ].map(([x, y]) => ({
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f,
          }));
          const left = Math.min(...points.map(point => point.x));
          const right = Math.max(...points.map(point => point.x));
          const top = Math.min(...points.map(point => point.y));
          const bottom = Math.max(...points.map(point => point.y));

          // Pools and lanes span the diagram; treating them as indivisible
          // would make pagination impossible. Keep activity/event/gateway shapes.
          if (
            right - left > viewBox.width * 0.45 ||
            bottom - top > viewBox.height * 0.45
          ) {
            return [];
          }
          return [{ x: left, y: top, width: right - left, height: bottom - top }];
        } catch {
          return [];
        }
      });
  } finally {
    host.remove();
  }
}

function chooseSafeBoundaries(
  origin: number,
  length: number,
  tileSize: number,
  count: number,
  bounds: ShapeBounds[],
  axis: 'x' | 'y',
): number[] {
  const boundaries = [origin];
  const padding = 8;
  for (let index = 1; index < count; index += 1) {
    const nominal = origin + index * tileSize;
    const searchRadius = tileSize * 0.2;
    const minAllowed = nominal - searchRadius;
    const maxAllowed = nominal + searchRadius;
    const candidates = [nominal];

    bounds.forEach(bound => {
      const start = axis === 'x' ? bound.x : bound.y;
      const end = start + (axis === 'x' ? bound.width : bound.height);
      candidates.push(start - padding, end + padding);
    });

    const safeCandidates = candidates
      .filter(candidate => candidate >= minAllowed && candidate <= maxAllowed)
      .filter(candidate =>
        bounds.every(bound => {
          const start = axis === 'x' ? bound.x : bound.y;
          const end = start + (axis === 'x' ? bound.width : bound.height);
          return end <= candidate - padding || start >= candidate + padding;
        }),
      );

    const chosen = safeCandidates.length
      ? safeCandidates.reduce((best, candidate) =>
          Math.abs(candidate - nominal) < Math.abs(best - nominal) ? candidate : best,
        )
      : nominal;
    boundaries.push(chosen);
  }
  boundaries.push(origin + length);
  return boundaries;
}

function buildPageTiles(
  viewBox: { x: number; y: number; width: number; height: number },
  layout: SvgPageLayout,
  sourceSvg: SVGSVGElement,
): SvgPageTile[] {
  const bounds = collectShapeBounds(sourceSvg, viewBox);
  const xBoundaries = chooseSafeBoundaries(
    viewBox.x,
    viewBox.width,
    layout.tileWidth,
    layout.columns,
    bounds,
    'x',
  );
  const yBoundaries = chooseSafeBoundaries(
    viewBox.y,
    viewBox.height,
    layout.tileHeight,
    layout.rows,
    bounds,
    'y',
  );

  return layout.pages.map(tile => ({
    ...tile,
    x: xBoundaries[tile.column],
    y: yBoundaries[tile.row],
    width: xBoundaries[tile.column + 1] - xBoundaries[tile.column],
    height: yBoundaries[tile.row + 1] - yBoundaries[tile.row],
  }));
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
  const pageTiles = buildPageTiles(viewBox, layout, sourceSvg);
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
