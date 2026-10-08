import type { RaciActivity, RaciCell, RaciCode, RaciMatrix, RaciStatus } from './raci-engine';

const RACICODES: RaciCode[] = ['R', 'A', 'C', 'I'];
const APPROVAL_PATTERN = /\\b(approve|approval|validate|validation|authori[sz]e|authori[sz]ation|sign[- ]?off|approuver|approbation|valider|validation|autoriser|autorisation|signer|décider|decision|décision)\\b/i;
const ACTIVITY_TYPES = new Set([
  'Task',
  'UserTask',
  'ServiceTask',
  'ManualTask',
  'ScriptTask',
  'BusinessRuleTask',
  'SendTask',
  'ReceiveTask',
  'CallActivity',
  'SubProcess',
  'Transaction',
]);

const localName = (element: Element): string => element.localName || element.tagName.split(':').pop() || '';

const textAttr = (element: Element | undefined, name: string): string =>
  String(element?.getAttribute(name) ?? element?.getAttribute(`raci:${name}`) ?? '').trim();

const splitRoles = (value: string): string[] =>
  value.split(',').map(role => role.trim()).filter(Boolean);

const parseActors = (value: string): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return Array.from(new Set(parsed.map(actor => String(actor).trim()).filter(Boolean)));
    }
  } catch {
    // Backward compatibility with comma-separated actor lists.
  }

  return Array.from(new Set(splitRoles(value)));
};

const unique = (values: string[]): string[] =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

const getActivities = (document: Document): Element[] =>
  Array.from(document.getElementsByTagName('*')).filter(element =>
    ACTIVITY_TYPES.has(localName(element)),
  );

const getProcesses = (document: Document): Element[] =>
  Array.from(document.getElementsByTagName('*')).filter(
    element => localName(element) === 'process',
  );

const getLanes = (document: Document): Element[] =>
  Array.from(document.getElementsByTagName('*')).filter(
    element => localName(element) === 'lane',
  );

const getMessageFlows = (document: Document): Element[] =>
  Array.from(document.getElementsByTagName('*')).filter(
    element => localName(element) === 'messageFlow',
  );

const getParticipants = (document: Document): Element[] =>
  Array.from(document.getElementsByTagName('*')).filter(
    element => localName(element) === 'participant',
  );

const findById = (document: Document, id: string): Element | undefined =>
  Array.from(document.getElementsByTagName('*')).find(element => element.getAttribute('id') === id);

const getExplicitRoles = (activity: Element, code: RaciCode): string[] => {
  const property: Record<RaciCode, string> = {
    R: 'responsible',
    A: 'accountable',
    C: 'consulted',
    I: 'informed',
  };
  return splitRoles(textAttr(activity, property[code]));
};

const getConfiguredProcessActors = (process: Element | undefined): string[] | undefined => {
  if (!process) return undefined;
  const hasActors = process.hasAttribute('actors') || process.hasAttribute('raci:actors');
  return hasActors ? parseActors(textAttr(process, 'actors')) : undefined;
};

export const deriveRaciMatrixFromXml = (xmlContent: string): RaciMatrix => {
  const document = new DOMParser().parseFromString(xmlContent, 'text/xml');
  const activities = getActivities(document);
  const processes = getProcesses(document);
  const process = processes[0];
  const lanes = getLanes(document);
  const participants = getParticipants(document);
  const messageFlows = getMessageFlows(document);
  const laneByNode = new Map<string, string>();
  const participantByProcess = new Map<string, string>();

  for (const lane of lanes) {
    const role = textAttr(lane, 'name');
    if (!role) continue;

    for (const reference of Array.from(lane.children).filter(child => localName(child) === 'flowNodeRef')) {
      const id = (reference.textContent ?? '').trim();
      if (id) laneByNode.set(id, role);
    }
  }

  for (const participant of participants) {
    const role = textAttr(participant, 'name');
    const processRef = textAttr(participant, 'processRef');
    if (role && processRef) participantByProcess.set(processRef, role);
  }

  const configuredActors = getConfiguredProcessActors(process);
  const inferredActors = unique([
    ...lanes.map(lane => textAttr(lane, 'name')),
    ...participants.map(participant => textAttr(participant, 'name')),
    ...activities.flatMap(activity => RACICODES.flatMap(code => getExplicitRoles(activity, code))),
  ]);
  // A configured actor list is authoritative when it contains actors. If it is
  // explicitly empty, keep the viewer usable by falling back to actors that are
  // actually present in the BPMN (lanes, participants, or explicit RACI roles).
  const roles = unique(
    configuredActors && configuredActors.length > 0 ? configuredActors : inferredActors,
  ).sort((a, b) => a.localeCompare(b));
  const allowedRoles = new Set(roles);

  const roleOf = (element: Element | undefined): string | undefined => {
    if (!element) return undefined;

    const laneRole = laneByNode.get(element.getAttribute('id') ?? '');
    if (laneRole && allowedRoles.has(laneRole)) return laneRole;

    let parent: Element | null = element.parentElement;
    while (parent) {
      if (localName(parent) === 'lane') {
        const role = textAttr(parent, 'name');
        if (role && allowedRoles.has(role)) return role;
      }
      if (localName(parent) === 'process') {
        const role = participantByProcess.get(parent.getAttribute('id') ?? '');
        if (role && allowedRoles.has(role)) return role;
        break;
      }
      parent = parent.parentElement;
    }

    return undefined;
  };

  const byTarget = new Map<string, Element[]>();
  const bySource = new Map<string, Element[]>();

  for (const flow of messageFlows) {
    const source = flow.getAttribute('sourceRef');
    const target = flow.getAttribute('targetRef');

    if (source) bySource.set(source, [...(bySource.get(source) ?? []), flow]);
    if (target) byTarget.set(target, [...(byTarget.get(target) ?? []), flow]);
  }

  return {
    roles,
    activities: activities.map((activity): RaciActivity => {
      const cells = new Map<string, Set<RaciCode>>();
      const explicit = new Set<RaciCode>();

      const addCode = (role: string | undefined, code: RaciCode) => {
        if (!role || !allowedRoles.has(role)) return;
        const codes = cells.get(role) ?? new Set<RaciCode>();
        codes.add(code);
        cells.set(role, codes);
      };

      for (const code of RACICODES) {
        const assigned = getExplicitRoles(activity, code);
        if (assigned.length) explicit.add(code);
        assigned.forEach(role => addCode(role, code));
      }

      const activityRole = roleOf(activity);

      if (!explicit.has('R') && activityRole) addCode(activityRole, 'R');

      if (
        !explicit.has('A') &&
        activityRole &&
        APPROVAL_PATTERN.test(textAttr(activity, 'name'))
      ) {
        addCode(activityRole, 'A');
      }

      if (!explicit.has('C')) {
        for (const flow of byTarget.get(activity.getAttribute('id') ?? '') ?? []) {
          addCode(roleOf(findById(document, flow.getAttribute('sourceRef') ?? '')), 'C');
        }
      }

      if (!explicit.has('I')) {
        for (const flow of bySource.get(activity.getAttribute('id') ?? '') ?? []) {
          addCode(roleOf(findById(document, flow.getAttribute('targetRef') ?? '')), 'I');
        }
      }

      const cellList = roles.map((role): RaciCell => {
        const codes = Array.from(cells.get(role) ?? []);
        const hasExplicitCode = codes.some(code => explicit.has(code));
        let status: RaciStatus;
        if (codes.length === 0) {
          status = 'missing';
        } else if (hasExplicitCode) {
          status = 'explicit';
        } else {
          status = 'inferred';
        }

        return { role, codes, status };
      });

      return {
        elementId: activity.getAttribute('id') ?? '',
        activity: textAttr(activity, 'name') || activity.getAttribute('id') || 'Unnamed activity',
        cells: cellList,
      };
    }),
  };
};

export type RaciActivityIssueCode = 'missing-r' | 'missing-a' | 'multiple-a';

export type RaciActivityIssue = {
  activityId: string;
  activity: string;
  codes: RaciActivityIssueCode[];
};

export type RaciAnalysis = {
  issues: RaciActivityIssue[];
  unusedActors: string[];
};

export const analyzeRaciMatrix = (matrix: RaciMatrix): RaciAnalysis => {
  const issues = matrix.activities.map(activity => {
    const activeCells = activity.cells.filter(cell => cell.codes.length > 0);
    const hasR = activeCells.some(cell => cell.codes.includes('R'));
    const accountableCount = activeCells.filter(cell => cell.codes.includes('A')).length;
    const codes: RaciActivityIssueCode[] = [];

    if (!hasR) codes.push('missing-r');
    if (accountableCount === 0) codes.push('missing-a');
    if (accountableCount > 1) codes.push('multiple-a');

    return {
      activityId: activity.elementId,
      activity: activity.activity,
      codes,
    };
  }).filter(issue => issue.codes.length > 0);

  const usedActors = new Set<string>();
  for (const activity of matrix.activities) {
    for (const cell of activity.cells) {
      if (cell.codes.length) usedActors.add(cell.role);
    }
  }

  return {
    issues,
    unusedActors: matrix.roles.filter(role => !usedActors.has(role)),
  };
};

export const getRaciIssueLabel = (code: RaciActivityIssueCode): string => {
  switch (code) {
    case 'missing-r':
      return 'R manquant';
    case 'missing-a':
      return 'A manquant';
    case 'multiple-a':
      return 'Plusieurs A';
    default:
      return 'Anomalie RACI';
  }
};
