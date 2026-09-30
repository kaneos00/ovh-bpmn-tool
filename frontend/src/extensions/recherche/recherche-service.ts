import { RechercheIndex } from './recherche-index';

export type RechercheSourceType =
  | 'process'
  | 'bpmn'
  | 'procedure'
  | 'role'
  | 'raci'
  | 'ai';

export type RechercheResult = {
  element: any;
  id: string;
  type: string;
  name: string;
  link?: string;
  documentation?: string;
  processId?: string;
  processName?: string;
  role?: string;
  raci?: string;
  metadata?: Record<string, unknown>;
  resourceId?: string;
  resourceType?: string;
  resourceName?: string;
  sourceType?: RechercheSourceType;
};

export type RechercheScope = 'current-process' | 'all-processes';

export type RechercheContext = {
  scope?: RechercheScope;
  processId?: string;
  processName?: string;
  currentElementId?: string;
  currentElementType?: string;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
};

export type RechercheProvider = (
  query: string,
  context?: RechercheContext,
) => Promise<RechercheResult[]>;

const attributeText = (businessObject: any, names: string[]) =>
  names
    .flatMap(name => [businessObject?.[name], businessObject?.[`camunda:${name}`]])
    .filter(Boolean)
    .map(value => String(value))
    .join(', ');

const documentationText = (businessObject: any) =>
  Array.isArray(businessObject?.documentation)
    ? businessObject.documentation.map((item: any) => item?.text || '').join(' ')
    : businessObject?.documentation?.text || '';

export class RechercheService {
  private provider?: RechercheProvider;
  private context: RechercheContext = {};

  setProvider(provider?: RechercheProvider) {
    this.provider = provider;
  }

  setContext(context: RechercheContext = {}) {
    this.context = { ...context };
  }

  getContext(): RechercheContext {
    return { ...this.context };
  }

  async search(
    query: string,
    elementRegistry: any,
    context: RechercheContext = {},
  ): Promise<RechercheResult[]> {
    if (!query.trim()) return [];

    const effectiveContext = { ...this.context, ...context };

    if (this.provider) {
      try {
        return (await this.provider(query, effectiveContext)).slice(0, 50);
      } catch {
        // Fallback to the local BPMN index when the repository provider is unavailable.
      }
    }

    const index = new RechercheIndex();

    elementRegistry
      .getAll()
      .filter((element: any) => element?.businessObject)
      .forEach((element: any) => {
        const businessObject = element.businessObject;
        const role = attributeText(businessObject, [
          'assignee',
          'candidateGroup',
          'candidateGroups',
          'candidateUser',
          'candidateUsers',
          'owner',
          'role',
        ]);
        const raci = attributeText(businessObject, [
          'raci',
          'responsible',
          'accountable',
          'consulted',
          'informed',
        ]);
        const sourceType: RechercheSourceType = role
          ? 'role'
          : raci
            ? 'raci'
            : 'bpmn';

        index.add({
          element,
          id: element.id,
          type: businessObject.$type || '',
          name: businessObject.name || '',
          link: businessObject.link,
          documentation: documentationText(businessObject),
          role: role || undefined,
          raci: raci || undefined,
          processId: effectiveContext.processId,
          processName: effectiveContext.processName,
          resourceId: effectiveContext.resourceId,
          resourceType: effectiveContext.resourceType,
          resourceName: effectiveContext.resourceName,
          sourceType,
          metadata: {
            source: 'local-bpmn',
            role: role || undefined,
            raci: raci || undefined,
          },
        });
      });

    return index.search(query, effectiveContext, 50);
  }
}
