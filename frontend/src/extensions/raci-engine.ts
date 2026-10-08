export type RaciCode = 'R' | 'A' | 'C' | 'I';
export type RaciStatus = 'explicit' | 'inferred' | 'missing';

export type RaciCell = { role: string; codes: RaciCode[]; status: RaciStatus };
export type RaciActivity = { elementId: string; activity: string; cells: RaciCell[] };
export type RaciMatrix = { roles: string[]; activities: RaciActivity[] };

type AnyElement = any;

export type RaciActorSource = 'bpmn' | 'lane' | 'explicit' | 'manual';
export type RaciActor = {
  name: string;
  source: RaciActorSource;
  active: boolean;
  bpmnId?: string;
};

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

const normalizeActorName = (value: unknown): string => String(value ?? '').trim();

const parseConfiguredActors = (value: unknown): Array<Partial<RaciActor> & { name: string }> => {
  if (value === undefined || value === null) return [];
  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(actor => {
        if (typeof actor === 'string') return { name: normalizeActorName(actor) };
        if (actor && typeof actor === 'object') {
          return {
            name: normalizeActorName(actor.name),
            source: actor.source,
            active: actor.active,
            bpmnId: normalizeActorName(actor.bpmnId) || undefined,
          };
        }
        return { name: '' };
      }).filter(actor => Boolean(actor.name));
    }
  } catch {
    // Backward compatibility with a comma-separated actor list.
  }

  return splitRoles(raw).map(name => ({ name: normalizeActorName(name) }));
};

export const serializeRaciActors = (actors: RaciActor[]): string =>
  JSON.stringify(Array.from(new Map(
    actors.map(actor => ({
      name: normalizeActorName(actor.name),
      source: actor.source,
      active: actor.active !== false,
      ...(actor.bpmnId ? { bpmnId: actor.bpmnId } : {}),
    })).filter(actor => Boolean(actor.name)).map(actor => [actor.name.toLocaleLowerCase(), actor] as const),
  ).values()));

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
  const visitedLaneSets = new Set<any>();
  const visitedLanes = new Set<any>();

  // bpmn-moddle normally exposes lanes through Process.laneSets, but nested
  // lane sets are not guaranteed to be reachable only through the first level.
  // The Viewer works from the XML and sees every bpmn:lane element, so the
  // Modeler must recursively inspect every laneSet/lane as well.
  const visitLaneSet = (laneSet: AnyElement) => {
    if (!laneSet || visitedLaneSets.has(laneSet)) return;
    visitedLaneSets.add(laneSet);
    for (const lane of laneSet?.lanes ?? []) visitLane(lane);
  };

  const visitLane = (lane: AnyElement) => {
    if (!lane || visitedLanes.has(lane)) return;
    visitedLanes.add(lane);

    const name = String(lane?.name ?? '').trim();
    if (name) {
      roles.add(name);
      for (const ref of lane?.flowNodeRef ?? []) if (ref?.id) nodeToLane.set(ref.id, name);
    }

    visitLaneSet(lane?.childLaneSet);
  };

  const visitObject = (element: AnyElement) => {
    if (!element || typeof element !== 'object') return;
    if (element.$type === 'bpmn:Lane') {
      visitLane(element);
      return;
    }
    if (element.$type === 'bpmn:LaneSet') {
      visitLaneSet(element);
      return;
    }
  };

  for (const root of roots(definitions)) {
    for (const laneSet of root?.laneSets ?? []) visitLaneSet(laneSet);
    // Keep participant names as process-level roles.
    if (root?.$type === 'bpmn:Participant' && root.name) roles.add(String(root.name).trim());

    // Fallback for moddle structures where laneSets are not exposed directly
    // on the root process but lane objects are still present in the object graph.
    for (const value of Object.values(root ?? {})) {
      if (Array.isArray(value)) {
        for (const item of value) visitObject(item);
      } else {
        visitObject(value);
      }
    }
  }

  return { nodeToLane, roles };
};

const collectActivities = (definitions: AnyElement): AnyElement[] => {
  const result: AnyElement[] = [];
  const visited = new Set<any>();

  const visit = (element: AnyElement) => {
    if (!element || visited.has(element)) return;
    visited.add(element);

    if (isActivity(element)) result.push(element);

    // Normal BPMN containment: Process/SubProcess.flowElements.
    for (const child of element?.flowElements ?? []) visit(child);

    // Keep lane traversal for completeness, but never require a lane to
    // discover activities. A participant may reference a process with no
    // lanes at all (for example, the Pizza Customer pool).
    for (const laneSet of element?.laneSets ?? []) {
      for (const lane of laneSet?.lanes ?? []) {
        for (const ref of lane?.flowNodeRef ?? []) visit(ref);
        visit(lane?.childLaneSet);
      }
    }

    // Some moddle graphs expose referenced processes through Participants
    // rather than making the process collection the only reliable entry
    // point. Follow processRef explicitly so participant-only pools are
    // included even when they have no LaneSet.
    if (element?.$type === 'bpmn:Participant' && element.processRef) {
      const process = typeof element.processRef === 'string'
        ? roots(definitions).find((root: AnyElement) => root?.id === element.processRef)
        : element.processRef;
      visit(process);
    }

    // A LaneSet can contain nested lane sets. Their flowNodeRef values point
    // back to activities; visit those references without making lanes the
    // source of truth for activity discovery.
    if (element?.$type === 'bpmn:LaneSet') {
      for (const lane of element?.lanes ?? []) visit(lane);
    }
  };

  // Start from every process root, not only the primary process.
  for (const root of roots(definitions)) {
    if (root?.$type === 'bpmn:Process') visit(root);
  }

  // Also start from every participant so a participant-only process is
  // discoverable even if its process is not exposed in rootElements.
  for (const root of roots(definitions)) {
    if (root?.$type === 'bpmn:Participant') visit(root);
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

const discoverRaciActors = (definitions: AnyElement): RaciActor[] => {
  const discovered = new Map<string, RaciActor>();

  const add = (name: unknown, source: RaciActorSource, bpmnId?: string) => {
    const normalized = normalizeActorName(name);
    if (!normalized) return;
    const key = normalized.toLocaleLowerCase();
    const current = discovered.get(key);
    const priority: Record<RaciActorSource, number> = { bpmn: 4, lane: 3, explicit: 2, manual: 1 };
    if (!current || priority[source] > priority[current.source]) {
      discovered.set(key, {
        name: normalized,
        source,
        active: true,
        ...(bpmnId ? { bpmnId } : {}),
      });
    }
  };

  for (const root of roots(definitions)) {
    if (root?.$type === 'bpmn:Participant') add(root.name, 'bpmn', root.id);
    for (const laneSet of root?.laneSets ?? []) {
      const visitLane = (lane: AnyElement) => {
        add(lane?.name, 'lane', lane?.id);
        for (const child of lane?.childLaneSet?.lanes ?? []) visitLane(child);
      };
      for (const lane of laneSet?.lanes ?? []) visitLane(lane);
    }
  }

  for (const activity of collectActivities(definitions)) {
    RACICODES.forEach(code => explicitRoles(activity, code).forEach(role => add(role, 'explicit')));
  }

  return Array.from(discovered.values());
};

const mergeConfiguredActors = (definitions: AnyElement): RaciActor[] | undefined => {
  const process = getPrimaryProcess(definitions);
  if (!process) return undefined;

  const raw = getRawAttr(process, 'actors');
  if (raw === undefined || raw === null) return undefined;

  const configured = parseConfiguredActors(raw);
  const discovered = discoverRaciActors(definitions);
  const discoveredByName = new Map(discovered.map(actor => [actor.name.toLocaleLowerCase(), actor]));
  const discoveredById = new Map(
    discovered.filter(actor => actor.bpmnId).map(actor => [actor.bpmnId!, actor]),
  );
  const result = new Map<string, RaciActor>();
  const consumed = new Set<string>();

  for (const actor of configured) {
    const exact = discoveredByName.get(actor.name.toLocaleLowerCase());
    const identity = actor.bpmnId ? discoveredById.get(actor.bpmnId) : undefined;
    const match = exact ?? identity;

    if (match) {
      result.set(actor.name.toLocaleLowerCase(), {
        ...match,
        name: actor.name,
        active: actor.active !== false,
      });
      consumed.add(match.name.toLocaleLowerCase());
      continue;
    }

    result.set(actor.name.toLocaleLowerCase(), {
      name: actor.name,
      source: actor.source && ['bpmn', 'lane', 'explicit', 'manual'].includes(actor.source)
        ? actor.source as RaciActorSource
        : 'manual',
      active: actor.active !== false,
      ...(actor.bpmnId ? { bpmnId: actor.bpmnId } : {}),
    });
  }

  // V0.4 stored source/active but not bpmnId. When there is exactly one
  // missing BPMN actor and exactly one new BPMN actor of the same source,
  // treat it as a rename rather than creating two active actors.
  const unmatchedDiscovered = discovered.filter(actor => !consumed.has(actor.name.toLocaleLowerCase()));
  for (const source of ['bpmn', 'lane'] as const) {
    const missingConfigured = Array.from(result.values()).filter(
      actor => actor.source === source && !discoveredByName.has(actor.name.toLocaleLowerCase()) && !actor.bpmnId,
    );
    const newDiscovered = unmatchedDiscovered.filter(actor => actor.source === source);
    if (missingConfigured.length === 1 && newDiscovered.length === 1) {
      const oldActor = missingConfigured[0];
      const renamed = newDiscovered[0];
      result.set(oldActor.name.toLocaleLowerCase(), { ...oldActor, active: false });
      result.set(renamed.name.toLocaleLowerCase(), { ...renamed, active: true });
      consumed.add(renamed.name.toLocaleLowerCase());
    }
  }

  for (const actor of discovered) {
    if (!consumed.has(actor.name.toLocaleLowerCase()) && !result.has(actor.name.toLocaleLowerCase())) {
      result.set(actor.name.toLocaleLowerCase(), actor);
    }
  }

  return Array.from(result.values()).sort((a, b) => a.name.localeCompare(b.name));
};

export const getRaciActorList = (definitions: AnyElement): RaciActor[] =>
  mergeConfiguredActors(definitions) ?? discoverRaciActors(definitions);

export const inferRaciActors = (definitions: AnyElement): string[] =>
  getRaciActorList(definitions).filter(actor => actor.active).map(actor => actor.name);

export const getConfiguredRaciActors = (definitions: AnyElement): string[] | undefined => {
  const configured = mergeConfiguredActors(definitions);
  return configured?.filter(actor => actor.active).map(actor => actor.name);
};

export const getConfiguredRaciActorList = (definitions: AnyElement): RaciActor[] | undefined =>
  mergeConfiguredActors(definitions);

export const getRaciActors = (definitions: AnyElement): string[] =>
  getRaciActorList(definitions).filter(actor => actor.active).map(actor => actor.name);

export const getRaciProcess = (definitions: AnyElement): AnyElement | undefined =>
  getPrimaryProcess(definitions);

export function deriveRaciMatrix(definitions: AnyElement): RaciMatrix {
  const { nodeToLane } = collectLanes(definitions);
  const processToParticipant = collectParticipantProcesses(definitions);
  const activities = collectActivities(definitions);
  // The configured actor list is authoritative when present: inactive actors
  // remain persisted in the BPMN but must not appear in the matrix.
  const roles = new Set(getRaciActorList(definitions)
    .filter(actor => actor.active)
    .map(actor => actor.name));
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
      const participantRole = (() => {
        let parent = element?.$parent;
        while (parent) {
          if (parent.$type === 'bpmn:Process' && parent.id) {
            return processToParticipant.get(parent.id);
          }
          parent = parent.$parent;
        }
        return undefined;
      })();

      // A task directly belonging to a collaboration participant (for example
      // "Pizza Customer") has no lane to provide its RACI role. Treat the
      // participant as the actor and infer R for normal work, or A for
      // approval/decision work. This keeps participant-only pools visible in
      // the inferred matrix just like lane-based actors.
      const inferredParticipantRole = participantRole && roles.has(participantRole)
        ? participantRole
        : undefined;
      const inferredRole = laneRole ?? inferredParticipantRole;

      if (!explicit.has('R') && inferredRole && roles.has(inferredRole)) addCode(cells, inferredRole, 'R');
      if (!explicit.has('A') && inferredRole && roles.has(inferredRole) && APPROVAL_PATTERN.test(getName(element))) {
        addCode(cells, inferredRole, 'A');
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
