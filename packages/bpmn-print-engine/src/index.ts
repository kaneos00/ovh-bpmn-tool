/**
 * Public API for the independent BPMN print engine.
 *
 * Algorithms are intentionally not exported until their contracts and tests
 * are implemented in the linked issues. This entry point is the stable import
 * boundary for KHI Flows adapters and future host applications.
 */
export type {
  DiagramBounds,
  PagePlan,
  PagedPrintDocument,
  PlannedPage,
  PrintElementRef,
  PrintOptions,
  PrintOrientation,
  PrintPaperFormat,
} from "./types.js";
