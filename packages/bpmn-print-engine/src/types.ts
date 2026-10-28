/** Orientation of a physical print page. */
export type PrintOrientation = "portrait" | "landscape";

/** Supported paper format. A4 is the initial target; the contract is extensible. */
export type PrintPaperFormat = "A4";

/** Explicit physical print settings. Units are millimetres unless documented otherwise. */
export interface PrintOptions {
  readonly paper: PrintPaperFormat;
  readonly orientation: PrintOrientation;
  readonly marginsMm: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  /** Optional requested scale. If omitted, the planner's documented fit policy applies. */
  readonly scale?: number;
  /** Safety cap for output page count. */
  readonly maxPages?: number;
}

/** A source diagram's coordinate bounds, independent of any DOM implementation. */
export interface DiagramBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Coordinate window and physical placement of one page in the print plan. */
export interface PlannedPage {
  readonly pageNumber: number;
  readonly row: number;
  readonly column: number;
  readonly sourceBounds: DiagramBounds;
  readonly paperWidthMm: number;
  readonly paperHeightMm: number;
  readonly contentWidthMm: number;
  readonly contentHeightMm: number;
  readonly orientation: PrintOrientation;
}

/** Result of the pure pagination stage. */
export interface PagePlan {
  readonly paper: PrintPaperFormat;
  readonly orientation: PrintOrientation;
  readonly pages: readonly PlannedPage[];
  readonly sourceBounds: DiagramBounds;
}

/** A source BPMN element referenced by the print representation. */
export interface PrintElementRef {
  readonly sourceId: string;
  readonly kind: string;
  readonly pageNumbers: readonly number[];
}

/**
 * Neutral intermediate representation. Its full shape and continuation
 * semantics will be specified by the partitioning implementation ticket.
 */
export interface PagedPrintDocument {
  readonly sourceFingerprint?: string;
  readonly pages: readonly {
    readonly pageNumber: number;
    readonly elements: readonly PrintElementRef[];
  }[];
}
