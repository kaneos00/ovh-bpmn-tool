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
const SVG_NS = 'http://www.w3.org/2000/svg';

export function calculateSvgPageLayout(
  viewBox: { x: number; y: number; width: number; height: number },
  orientation: SvgPageOrientation,
): SvgPageLayout {
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

/**
 * Cuts the rendered BPMN SVG into printable A4 viewports. It deliberately does
 * not rewrite BPMN XML or invent BPMN events: page continuations are export-only
 * labels, so the process semantics remain unchanged.
 */
export function paginateBpmnSvg(
  svgMarkup: string,
  options: PaginatedSvgOptions,
): string[] {
  if (!options.fontFamily.trim()) {
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
  const serializer = new XMLSerializer();
  const title = options.title?.trim() || 'Export BPMN';
  const fontOptions = {
    fontFamily: options.fontFamily,
    fontSizeMm: options.fontSizeMm,
  };

  return layout.pages.map(tile => {
    const pageDocument = document.implementation.createDocument(SVG_NS, 'svg', null);
    const pageSvg = pageDocument.documentElement;
    pageSvg.setAttribute('width', `${layout.pageWidthMm}mm`);
    pageSvg.setAttribute('height', `${layout.pageHeightMm}mm`);
    pageSvg.setAttribute('viewBox', `0 0 ${layout.pageWidthMm} ${layout.pageHeightMm}`);
    pageSvg.setAttribute('role', 'img');
    pageSvg.setAttribute('aria-label', `${title} — page ${tile.page} sur ${layout.pages.length}`);

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
