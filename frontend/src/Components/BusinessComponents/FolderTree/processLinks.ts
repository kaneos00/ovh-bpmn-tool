export type ProcessResource = { id: string };

export type ProcessLinkInfo<TResource extends ProcessResource = ProcessResource> = {
  resource: TResource;
  processIds: string[];
  targets: string[];
};

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

export const getProcessLinks = (xml: string) => {
  if (!xml || typeof DOMParser === 'undefined') {
    return { processIds: [] as string[], targets: [] as string[] };
  }
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) {
    return { processIds: [] as string[], targets: [] as string[] };
  }

  return {
    processIds: Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'process'))
      .map(element => element.getAttribute('id')?.trim() || '')
      .filter(Boolean),
    targets: [
      ...Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity'))
        .map(element => element.getAttribute('calledElement')?.trim() || ''),
      // A collapsed BPMN sub-process can represent a separately modelled
      // resource in this repository. Link it only when its BPMN id resolves
      // unambiguously to another process resource below.
      ...Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'subProcess'))
        .filter(element => element.getAttribute('isExpanded') === 'false')
        .map(element => element.getAttribute('id')?.trim() || ''),
    ].filter(Boolean),
  };
};

export const resolveLinkedChildren = <TResource extends ProcessResource>(
  processInfo: ProcessLinkInfo<TResource>[],
): Map<string, TResource[]> => {
  // Resource IDs are unambiguous and always take precedence. BPMN process
  // IDs can be duplicated across imported models, so resolve them only when
  // exactly one resource declares that ID; guessing would create false links.
  const byIdentifier = new Map<string, TResource>();
  processInfo.forEach(info => byIdentifier.set(info.resource.id, info.resource));

  const resourcesByProcessId = new Map<string, TResource[]>();
  processInfo.forEach(info => {
    info.processIds.forEach(id => {
      const matches = resourcesByProcessId.get(id) ?? [];
      if (!matches.some(candidateResource => candidateResource.id === info.resource.id)) {
        matches.push(info.resource);
      }
      resourcesByProcessId.set(id, matches);
    });
  });
  resourcesByProcessId.forEach((matches, processId) => {
    if (matches.length === 1 && !byIdentifier.has(processId)) {
      byIdentifier.set(processId, matches[0]);
    }
  });

  const resolvedTargets = new Map<string, TResource[]>();
  processInfo.forEach(info => {
    const targets = Array.from(new Set(info.targets))
      .map(targetId => byIdentifier.get(targetId))
      .filter((target): target is TResource => target !== undefined && target.id !== info.resource.id)
      .filter((target, index, all) => all.findIndex(candidate => candidate.id === target.id) === index);
    resolvedTargets.set(info.resource.id, targets);
  });

  // Build an acyclic forest incrementally. Checking reachability against the
  // full candidate graph would reject every edge in a cycle; checking only
  // already accepted edges preserves the earliest valid links deterministically.
  const reaches = (
    graph: Map<string, TResource[]>,
    fromId: string,
    soughtId: string,
    visited = new Set<string>(),
  ): boolean => {
    if (fromId === soughtId) return true;
    if (visited.has(fromId)) return false;
    visited.add(fromId);
    return (graph.get(fromId) ?? []).some(target => reaches(graph, target.id, soughtId, visited));
  };
  const parentByTarget = new Map<string, string>();
  const linked = new Map<string, TResource[]>(
    processInfo.map(info => [info.resource.id, [] as TResource[]] as const),
  );

  processInfo.forEach(info => {
    (resolvedTargets.get(info.resource.id) ?? []).forEach(target => {
      if (parentByTarget.has(target.id)) return;
      if (reaches(linked, target.id, info.resource.id)) return;

      parentByTarget.set(target.id, info.resource.id);
      linked.get(info.resource.id)?.push(target);
    });
  });

  return linked;
};

/**
 * Resolves a resource ID first, then a unique BPMN process ID.
 * Ambiguous BPMN IDs deliberately return undefined instead of guessing.
 */
export const resolveProcessTarget = <TResource extends ProcessResource>(
  targetId: string,
  processInfo: Array<{ resource: TResource; processIds: string[] }>,
): TResource | undefined => {
  const directMatch = processInfo.find(info => info.resource.id === targetId);
  if (directMatch) return directMatch.resource;

  const matches = processInfo
    .filter(info => info.processIds.includes(targetId))
    .map(info => info.resource)
    .filter((resource, index, all) =>
      all.findIndex(candidate => candidate.id === resource.id) === index,
    );

  return matches.length === 1 ? matches[0] : undefined;
};
