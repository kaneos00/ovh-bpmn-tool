/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

Voir l'historique Git pour la version précédente.

============================================================
FIN ANCIENNE VERSION
============================================================
*/

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

export class RechercheService {
  private provider?: RechercheProvider;
  private context: RechercheContext = {};

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

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
    const normalizedQuery = this.normalize(query.trim());
    if (!normalizedQuery) return [];

    const effectiveContext = { ...this.context, ...context };

    if (this.provider) {
      try {
        return (await this.provider(query, effectiveContext)).slice(0, 50);
      } catch {
        // Fallback to the local BPMN index when the provider is unavailable.
      }
    }

    const elements = elementRegistry.getAll();

    return elements
      .filter((element: any) => element?.businessObject)
      .map((element: any) => {
        const businessObject = element.businessObject;
        const documentation = Array.isArray(businessObject.documentation)
          ? businessObject.documentation.map((item: any) => item?.text || '').join(' ')
          : businessObject.documentation?.text || '';

        const result: RechercheResult = {
          element,
          id: element.id,
          type: businessObject.$type || '',
          name: businessObject.name || '',
          link: businessObject.link,
          documentation,
          processId: effectiveContext.processId,
          processName: effectiveContext.processName,
          resourceId: effectiveContext.resourceId,
          resourceType: effectiveContext.resourceType,
          resourceName: effectiveContext.resourceName,
          sourceType: 'bpmn',
        };

        const fields = {
          id: this.normalize(result.id),
          name: this.normalize(result.name),
          type: this.normalize(result.type),
          link: this.normalize(result.link),
          documentation: this.normalize(result.documentation),
          processName: this.normalize(result.processName),
          resourceName: this.normalize(result.resourceName),
        };

        const score =
          fields.name === normalizedQuery ? 100 :
          fields.id === normalizedQuery ? 90 :
          fields.name.startsWith(normalizedQuery) ? 80 :
          fields.id.startsWith(normalizedQuery) ? 70 :
          fields.processName === normalizedQuery ? 65 :
          fields.name.includes(normalizedQuery) ? 60 :
          fields.id.includes(normalizedQuery) ? 50 :
          fields.processName.includes(normalizedQuery) ? 45 :
          fields.type.includes(normalizedQuery) ? 30 :
          fields.link.includes(normalizedQuery) ? 20 :
          fields.documentation.includes(normalizedQuery) ? 10 :
          fields.resourceName.includes(normalizedQuery) ? 10 : 0;

        return { result, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map(({ result }) => result);
  }
}
