export type RaciCode = 'R' | 'A' | 'C' | 'I';
export type RaciStatus = 'explicit' | 'inferred' | 'missing';

export type RaciCell = { role: string; codes: RaciCode[]; status: RaciStatus };
export type RaciActivity = { elementId: string; activity: string; cells: RaciCell[] };
export type RaciMatrix = { roles: string[]; activities: RaciActivity[] };

type AnyElement = any;

const APPROVAL_PATTERN = /\b(approve|approval|validate|validation|authori[sz]e|authori[sz]ation|sign[- ]?off|approuver|approbation|valider|validation|autoriser|autorisation|signer|décider|decision|décision)\b/i;
const RACICODES: RaciCode[] = ['R', 'A', 'C', 'I'];

const getRawAttr = (element: AnyElement, name: string): unknown => {
  const businessObject = element?.businessObject ?? element;
  const value = businessObject?.get ? businessObject.get(name) : businessObject?.[name];
  if (value !== undefined && value !== null) return value;
  const qualified = `raci:${name}`;
  return businessObject?.get ? businessObject.get(qualified) : businessObject?.[qualified];
};

const getAttr = (element: AnyElement, name: string): string => String(getRawAttr(element, name) ?? '').trim();

const splitRoles = (value: unknown): string[] =>
  String(value ?? '').split(',').map(role => role.trim()).filter(Boolean);

const parseActors = (value: unknown): string[] => {
  if (value === undefined || value === null) return [];
  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map(actor => String(actor).trim()).filter(Boolean)));
    }
  } catch {
    // Backward compatibility with a comma-separated actor list.
  }

  return Array.from(new Set(splitRoles(raw)));
};

export const serializeRaciActors = (actors: string[]): string =>
  JSON.stringify(Array.from(new Set(actors.map(actor => actor.trim()).filter(Boolean))));

const getName = (element: AnyElement): string =>
  String(element?.businessObject?.name ?? element?.name ?? '').trim();

const getType = (element: AnyElement): string =>
  String(element?.businessObject?.$type ?? element?.$type ?? '');

const isActivity = (element: AnyElement): boolean =>
  /^bpmn:(Task|UserTask|ServiceTask|ManualTask|ScriptTask|BusinessRuleTask|SendTask|ReceiveTask|CallActivity|SubProcess|Transaction)$/.test(getType(element));

const roots = (definitions: AnyElement): AnyElement[] =>
  definitions?.rootElements ?? definitions?.businessObject?.rootElements ?? [];

const getProcessRoots = (definitions: AnyElement): AnyElement[] =>
  roots(definitions).filter((root: AnyElement) => root?.$type === 'bpmn:Process');

const getPrimaryProcess = (definitions: AnyElement): AnyElement | undefined =>
  getProcessRoots(definitions)[0];

const collectLanes = (definitions: AnyElement) => {
  const nodeToLane = new Map<string, string>();
  const roles = new Set<string>();

  const visitLane = (lane: AnyElement) => {
    const name = String(lane?.name ?? '').trim();
    if (name) {
      roles.add(name);
      for (const ref of lane?.flowNodeRef ?? []) if (ref?.id) nodeToLane.set(ref.id, name);
    }
    for (const child of lane?.childLaneSet?.lanes ?? []) visitLane(child);
  };

  for (const root of roots(definitions)) {
    for (const laneSet of root?.laneSets ?? []) {
      for (const lane of laneSet?.lanes ?? []) visitLane(lane);
    }
    if (root?.$type === 'bpmn:Participant' && root.name) roles.add(String(root.name).trim());
  }

  return { nodeToLane, roles };
};

const collectActivities = (definitions: AnyElement): AnyElement[] => {
  const result: AnyElement[] = [];

  const visit = (element: AnyElement) => {
    if (!element) return;
    if (isActivity(element)) result.push(element);
    for (const child of element?.flowElements ?? []) visit(child);
    for (const laneSet of element?.laneSets ?? []) {
      for (const lane of laneSet?.lanes ?? []) visit(lane);
    }
  };

  for (const root of roots(definitions)) {
    if (root?.$type === 'bpmn:Process') visit(root);
  }

  return result;
};

const collectMessageFlows = (definitions: AnyElement): AnyElement[] =>
  roots(definitions).flatMap((root: AnyElement) => root?.messageFlows ?? []);

const collectParticipantProcesses = (definitions: AnyElement): Map<string, string> => {
  const processToParticipant = new Map<string, string>();

  for (const root of roots(definitions)) {
    if (root?.$type !== 'bpmn:Participant' || !root?.name) continue;

    const processRef = root.processRef;
    const processId = typeof processRef === 'string' ? processRef : processRef?.id;
    if (processId) processToParticipant.set(processId, String(root.name).trim());
  }

  return processToParticipant;
};

const roleOf = (
  element: AnyElement,
  nodeToLane: Map<string, string>,
  processToParticipant: Map<string, string>,
  allowedRoles?: Set<string>,
): string | undefined => {
  const laneRole = element?.id && nodeToLane.has(element.id)
    ? nodeToLane.get(element.id)
    : undefined;

  let participantRole: string | undefined;
  let parent = element?.$parent;
  while (parent) {
    if (parent.$type === 'bpmn:Lane' && parent.name && !laneRole) {
      return String(parent.name).trim();
    }
    if (parent.$type === 'bpmn:Participant' && parent.name) {
      participantRole = String(parent.name).trim();
    }
    if (parent.$type === 'bpmn:Process' && parent.id) {
      participantRole = processToParticipant.get(parent.id);
      break;
    }
    parent = parent.$parent;
  }

  if (laneRole && (!allowedRoles || allowedRoles.has(laneRole))) return laneRole;
  return participantRole;
};

const addCode = (cells: Map<string, Set<RaciCode>>, role: string | undefined, code: RaciCode) => {
  if (!role) return;
  const set = cells.get(role) ?? new Set<RaciCode>();
  set.add(code);
  cells.set(role, set);
};

const explicitRoles = (element: AnyElement, code: RaciCode): string[] => {
  const propertyByCode: Record<RaciCode, string> = {
    R: 'responsible',
    A: 'accountable',
    C: 'consulted',
    I: 'informed',
  };
  const property = propertyByCode[code];
  return splitRoles(getAttr(element, property));
};

export const inferRaciActors = (definitions: AnyElement): string[] => {
  const { roles } = collectLanes(definitions);

  for (const activity of collectActivities(definitions)) {
    RACICODES.forEach(code => explicitRoles(activity, code).forEach(role => roles.add(role)));
  }

  return Array.from(roles).sort((a, b) => a.localeCompare(b));
};

export const getConfiguredRaciActors = (definitions: AnyElement): string[] | undefined => {
  const process = getPrimaryProcess(definitions);
  if (!process) return undefined;

  const raw = getRawAttr(process, 'actors');
  return raw === undefined || raw === null ? undefined : parseActors(raw);
};

export const getRaciActors = (definitions: AnyElement): string[] =>
  getConfiguredRaciActors(definitions) ?? inferRaciActors(definitions);

export const getRaciProcess = (definitions: AnyElement): AnyElement | undefined =>
  getPrimaryProcess(definitions);

export function deriveRaciMatrix(definitions: AnyElement): RaciMatrix {
  const { nodeToLane } = collectLanes(definitions);
  const processToParticipant = collectParticipantProcesses(definitions);
  const activities = collectActivities(definitions);
  const configuredActors = getConfiguredRaciActors(definitions);
  const roles = new Set(configuredActors ?? inferRaciActors(definitions));
  const messageFlows = collectMessageFlows(definitions);
  const messageFlowsByTarget = new Map<string, AnyElement[]>();
  const messageFlowsBySource = new Map<string, AnyElement[]>();

  for (const flow of messageFlows) {
    const targetId = flow?.targetRef?.id;
    if (targetId) {
      const flows = messageFlowsByTarget.get(targetId) ?? [];
      flows.push(flow);
      messageFlowsByTarget.set(targetId, flows);
    }

    const sourceId = flow?.sourceRef?.id;
    if (sourceId) {
      const flows = messageFlowsBySource.get(sourceId) ?? [];
      flows.push(flow);
      messageFlowsBySource.set(sourceId, flows);
    }
  }

  return {
    roles: Array.from(roles).sort((a, b) => a.localeCompare(b)),
    activities: activities.map(element => {
      const cells = new Map<string, Set<RaciCode>>();
      const explicit = new Set<RaciCode>();

      RACICODES.forEach(code => {
        const assigned = explicitRoles(element, code);
        if (assigned.length) explicit.add(code);
        assigned.filter(role => roles.has(role)).forEach(role => addCode(cells, role, code));
      });

      const laneRole = roleOf(element, nodeToLane, processToParticipant, roles);
      if (!explicit.has('R') && laneRole && roles.has(laneRole)) addCode(cells, laneRole, 'R');
      if (!explicit.has('A') && laneRole && roles.has(laneRole) && APPROVAL_PATTERN.test(getName(element))) {
        addCode(cells, laneRole, 'A');
      }

      if (!explicit.has('C')) {
        for (const flow of messageFlowsByTarget.get(element?.id) ?? []) {
          const role = roleOf(flow.sourceRef, nodeToLane, processToParticipant, roles);
          if (role && roles.has(role)) addCode(cells, role, 'C');
        }
      }

      if (!explicit.has('I')) {
        for (const flow of messageFlowsBySource.get(element?.id) ?? []) {
          const role = roleOf(flow.targetRef, nodeToLane, processToParticipant, roles);
          if (role && roles.has(role)) addCode(cells, role, 'I');
        }
      }

      const cellList = Array.from(roles)
        .sort((a, b) => a.localeCompare(b))
        .map((role): RaciCell => {
          const codes = Array.from(cells.get(role) ?? []);
          const hasExplicitCode = codes.some(code => explicit.has(code));
          let status: RaciStatus = 'missing';
          if (codes.length > 0) status = 'inferred';
          if (hasExplicitCode) status = 'explicit';

          return {
            role,
            codes,
            status,
          };
        });

      return {
        elementId: String(element?.id ?? ''),
        activity: getName(element) || String(element?.id ?? ''),
        cells: cellList,
      };
    }),
  };
}

export type RaciActivityIssueCode = 'missing-r' | 'missing-a' | 'multiple-a';
export type RaciActivityIssue = { activityId: string; activity: string; codes: RaciActivityIssueCode[] };
export type RaciAnalysis = { issues: RaciActivityIssue[]; unusedActors: string[] };
export const analyzeRaciMatrix = (matrix: RaciMatrix): RaciAnalysis => {
  const issues = matrix.activities.map(activity => {
    const activeCells = activity.cells.filter(cell => cell.codes.length > 0);
    const hasR = activeCells.some(cell => cell.codes.includes('R'));
    const accountableCount = activeCells.filter(cell => cell.codes.includes('A')).length;
    const codes: RaciActivityIssueCode[] = [];
    if (!hasR) codes.push('missing-r');
    if (accountableCount === 0) codes.push('missing-a');
    if (accountableCount > 1) codes.push('multiple-a');
    return { activityId: activity.elementId, activity: activity.activity, codes };
  }).filter(issue => issue.codes.length > 0);
  const usedActors = new Set<string>();
  for (const activity of matrix.activities) for (const cell of activity.cells) if (cell.codes.length) usedActors.add(cell.role);
  return { issues, unusedActors: matrix.roles.filter(role => !usedActors.has(role)) };
};
export const getRaciIssueLabel = (code: RaciActivityIssueCode): string => {
  switch (code) { case 'missing-r': return 'R manquant'; case 'missing-a': return 'A manquant'; case 'multiple-a': return 'Plusieurs A'; default: return 'Anomalie RACI'; }
};
