export type RaciCode = 'R' | 'A' | 'C' | 'I';
export type RaciStatus = 'explicit' | 'inferred' | 'missing';

export type RaciCell = { role: string; codes: RaciCode[]; status: RaciStatus };
export type RaciActivity = { elementId: string; activity: string; cells: RaciCell[] };
export type RaciMatrix = { roles: string[]; activities: RaciActivity[] };

type AnyElement = any;

const APPROVAL_PATTERN = /\b(approve|approval|validate|validation|authori[sz]e|authori[sz]ation|sign[- ]?off|approuver|approbation|valider|validation|autoriser|autorisation|signer|décider|decision|décision)\b/i;

const splitRoles = (value: unknown): string[] =>
  String(value ?? '').split(',').map(role => role.trim()).filter(Boolean);

const getAttr = (element: AnyElement, name: string): string => {
  const businessObject = element?.businessObject ?? element;
  const value = businessObject?.get ? businessObject.get(name) : businessObject?.[name];
  if (value !== undefined && value !== null) return String(value).trim();
  const qualified = 'raci:' + name;
  const qualifiedValue = businessObject?.get ? businessObject.get(qualified) : businessObject?.[qualified];
  return String(qualifiedValue ?? '').trim();
};

const getName = (element: AnyElement): string =>
  String(element?.businessObject?.name ?? element?.name ?? '').trim();

const getType = (element: AnyElement): string =>
  String(element?.businessObject?.$type ?? element?.$type ?? '');

const isActivity = (element: AnyElement): boolean =>
  /^bpmn:(Task|UserTask|ServiceTask|ManualTask|ScriptTask|BusinessRuleTask|SendTask|ReceiveTask|CallActivity|SubProcess|Transaction)$/.test(getType(element));

const roots = (definitions: AnyElement): AnyElement[] =>
  definitions?.rootElements ?? definitions?.businessObject?.rootElements ?? [];

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
    for (const laneSet of root?.laneSets ?? []) for (const lane of laneSet?.lanes ?? []) visitLane(lane);
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
    for (const laneSet of element?.laneSets ?? []) for (const lane of laneSet?.lanes ?? []) visit(lane);
  };
  for (const root of roots(definitions)) if (root?.$type === 'bpmn:Process') visit(root);
  return result;
};

const collectMessageFlows = (definitions: AnyElement): AnyElement[] =>
  roots(definitions).flatMap((root: AnyElement) => root?.messageFlows ?? []);

const roleOf = (element: AnyElement, nodeToLane: Map<string, string>): string | undefined => {
  if (element?.id && nodeToLane.has(element.id)) return nodeToLane.get(element.id);
  let parent = element?.$parent;
  while (parent) {
    if (parent.$type === 'bpmn:Participant' && parent.name) return String(parent.name).trim();
    parent = parent.$parent;
  }
  return undefined;
};

const addCode = (cells: Map<string, Set<RaciCode>>, role: string | undefined, code: RaciCode) => {
  if (!role) return;
  const set = cells.get(role) ?? new Set<RaciCode>();
  set.add(code);
  cells.set(role, set);
};

const explicitRoles = (element: AnyElement, code: RaciCode): string[] => {
  const property = code === 'R' ? 'responsible' : code === 'A' ? 'accountable' : code === 'C' ? 'consulted' : 'informed';
  return splitRoles(getAttr(element, property));
};

export function deriveRaciMatrix(definitions: AnyElement): RaciMatrix {
  const { nodeToLane, roles } = collectLanes(definitions);
  const activities = collectActivities(definitions);
  const messageFlows = collectMessageFlows(definitions);

  return {
    roles: Array.from(roles).sort((a, b) => a.localeCompare(b)),
    activities: activities.map(element => {
      const cells = new Map<string, Set<RaciCode>>();
      const explicit = new Set<RaciCode>();

      (['R', 'A', 'C', 'I'] as RaciCode[]).forEach(code => {
        const assigned = explicitRoles(element, code);
        if (assigned.length) explicit.add(code);
        assigned.forEach(role => addCode(cells, role, code));
      });

      const laneRole = roleOf(element, nodeToLane);
      if (!explicit.has('R') && laneRole) addCode(cells, laneRole, 'R');
      if (!explicit.has('A') && laneRole && APPROVAL_PATTERN.test(getName(element))) addCode(cells, laneRole, 'A');

      for (const flow of messageFlows) {
        if (flow?.targetRef?.id === element?.id && !explicit.has('C')) addCode(cells, roleOf(flow.sourceRef, nodeToLane), 'C');
        if (flow?.sourceRef?.id === element?.id && !explicit.has('I')) addCode(cells, roleOf(flow.targetRef, nodeToLane), 'I');
      }

      const allRoles = new Set(roles);
      cells.forEach((_codes, role) => allRoles.add(role));

      const cellList = Array.from(allRoles).sort((a, b) => a.localeCompare(b)).map((role): RaciCell => {
        const codes = Array.from(cells.get(role) ?? []);
        const hasExplicitCode = codes.some(code => explicit.has(code));
        return { role, codes, status: hasExplicitCode ? 'explicit' : codes.length ? 'inferred' : 'missing' };
      });

      return { elementId: String(element?.id ?? ''), activity: getName(element) || String(element?.id ?? ''), cells: cellList };
    }),
  };
}
