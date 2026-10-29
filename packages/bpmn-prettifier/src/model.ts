export type LaneOrientation = "horizontal" | "vertical";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutLane {
  id: string;
  participantId: string;
  orientation: LaneOrientation;
  bounds: Bounds;
}

export interface LayoutElement {
  id: string;
  kind: string;
  bounds: Bounds;
  laneId?: string;
  /** BPMN boundary event attachment; the event should follow its host activity. */
  attachedToId?: string;
  layoutLocked?: boolean;
}

export interface LayoutDiagram {
  lanes: LayoutLane[];
  elements: LayoutElement[];
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface LayoutDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  message: string;
  elementIds: string[];
  laneId?: string;
}

export interface LayoutRuleOptions {
  alignElements?: boolean;
  equalizeLaneCrossAxisSize?: boolean;
  preventNewOverlaps?: boolean;
  maxDisplacement?: number;
}

export interface PrettyficationResult {
  diagram: LayoutDiagram;
  appliedRules: string[];
  diagnostics: LayoutDiagnostic[];
}

export interface VerificationResult {
  diagnostics: LayoutDiagnostic[];
  valid: boolean;
}
