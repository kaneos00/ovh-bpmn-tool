import type { RechercheContext, RechercheResult } from './recherche-service';

export type RechercheIndexKind =
  | 'process'
  | 'bpmn-element'
  | 'procedure'
  | 'role'
  | 'raci';

export type RechercheIndexEntry = RechercheResult & {
  kind: RechercheIndexKind;
  searchText: string;
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const buildRechercheSearchText = (result: RechercheResult): string =>
  [
    result.id,
    result.name,
    result.type,
    result.documentation,
    result.processId,
    result.processName,
    result.resourceId,
    result.resourceName,
    result.role,
    result.raci,
    result.link,
  ]
    .filter(Boolean)
    .join(' ');

export const inferRechercheKind = (result: RechercheResult): RechercheIndexKind => {
  if (result.sourceType === 'process') return 'process';
  if (result.sourceType === 'procedure') return 'procedure';
  if (result.sourceType === 'role') return 'role';
  if (result.sourceType === 'raci') return 'raci';
  return 'bpmn-element';
};

export const toRechercheIndexEntry = (
  result: RechercheResult,
  kind: RechercheIndexKind = inferRechercheKind(result),
): RechercheIndexEntry => ({
  ...result,
  kind,
  searchText: buildRechercheSearchText(result),
});

export const scoreRechercheResult = (result: RechercheResult, query: string): number => {
  const q = normalize(query.trim());
  if (!q) return 0;

  const fields = {
    name: normalize(result.name),
    id: normalize(result.id),
    type: normalize(result.type),
    documentation: normalize(result.documentation),
    processName: normalize(result.processName),
    resourceName: normalize(result.resourceName),
    role: normalize(result.role),
    raci: normalize(result.raci),
    searchText: normalize(buildRechercheSearchText(result)),
  };

  if (fields.name === q) return 100;
  if (fields.id === q) return 90;
  if (fields.name.startsWith(q)) return 80;
  if (fields.id.startsWith(q)) return 70;
  if (fields.processName === q || fields.resourceName === q) return 65;
  if (fields.name.includes(q)) return 60;
  if (fields.id.includes(q)) return 50;
  if (fields.processName.includes(q) || fields.resourceName.includes(q)) return 45;
  if (fields.type.includes(q)) return 30;
  if (fields.role.includes(q) || fields.raci.includes(q)) return 20;
  if (fields.documentation.includes(q)) return 10;
  if (fields.searchText.includes(q)) return 5;
  return 0;
};

export class RechercheIndex {
  private entries: RechercheIndexEntry[] = [];

  clear() {
    this.entries = [];
  }

  add(result: RechercheResult, kind?: RechercheIndexKind) {
    this.entries.push(toRechercheIndexEntry(result, kind));
  }

  addMany(results: RechercheResult[]) {
    results.forEach(result => this.add(result));
  }

  all(): RechercheIndexEntry[] {
    return [...this.entries];
  }

  byProcess(processId?: string): RechercheIndexEntry[] {
    if (!processId) return this.all();
    return this.entries.filter(entry => entry.processId === processId);
  }

  search(
    query: string,
    context: RechercheContext = {},
    maxResults = 50,
  ): RechercheResult[] {
    const scoped = context.processId
      ? this.byProcess(context.processId)
      : this.entries;

    return scoped
      .map(entry => ({ entry, score: scoreRechercheResult(entry, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ entry }) => entry);
  }

  toStructuredDocuments(): Array<Record<string, unknown>> {
    return this.entries.map(entry => ({
      id: entry.id,
      kind: entry.kind,
      sourceType: entry.sourceType,
      title: entry.name || entry.id,
      type: entry.type,
      documentation: entry.documentation || '',
      processId: entry.processId,
      processName: entry.processName,
      resourceId: entry.resourceId,
      resourceType: entry.resourceType,
      resourceName: entry.resourceName,
      role: entry.role,
      raci: entry.raci,
      link: entry.link,
      metadata: entry.metadata,
    }));
  }
}
