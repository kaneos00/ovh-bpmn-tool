/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

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
};

export type RechercheProvider = (
  query: string,
) => Promise<RechercheResult[]>;

export class RechercheService {
  private provider?: RechercheProvider;

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  setProvider(provider?: RechercheProvider) {
    this.provider = provider;
  }

  async search(query: string, elementRegistry: any): Promise<RechercheResult[]> {
    const normalizedQuery = this.normalize(query.trim());

    if (!normalizedQuery) {
      return [];
    }

    if (this.provider) {
      return this.provider(query);
    }

    const elements = elementRegistry.getAll();

    return elements
      .filter((element: any) => element?.businessObject)
      .map((element: any) => {
        const businessObject = element.businessObject;
        const documentation = Array.isArray(businessObject.documentation)
          ? businessObject.documentation
              .map((item: any) => item?.text || '')
              .join(' ')
          : businessObject.documentation?.text || '';

        return {
          element,
          id: element.id,
          type: businessObject.$type || '',
          name: businessObject.name || '',
          link: businessObject.link,
          documentation,
        };
      })
      .filter((result: RechercheResult) => {
        const haystack = [
          result.id,
          result.type,
          result.name,
          result.link || '',
          result.documentation || '',
        ]
          .join(' ')
          .toLowerCase();

        return this.normalize(haystack).includes(normalizedQuery);
      })
      .slice(0, 50);
  }
}


============================================================
FIN ANCIENNE VERSION
============================================================
*/

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
};

export type RechercheProvider = (
  query: string,
) => Promise<RechercheResult[]>;

export class RechercheService {
  private provider?: RechercheProvider;

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  setProvider(provider?: RechercheProvider) {
    this.provider = provider;
  }

  async search(query: string, elementRegistry: any): Promise<RechercheResult[]> {
    const normalizedQuery = this.normalize(query.trim());

    if (!normalizedQuery) {
      return [];
    }

    if (this.provider) {
      try {
        return (await this.provider(query)).slice(0, 50);
      } catch {
        // The local BPMN index remains available if the future API/AI provider
        // is temporarily unavailable.
      }
    }

    const elements = elementRegistry.getAll();

    return elements
      .filter((element: any) => element?.businessObject)
      .map((element: any) => {
        const businessObject = element.businessObject;
        const documentation = Array.isArray(businessObject.documentation)
          ? businessObject.documentation
              .map((item: any) => item?.text || '')
              .join(' ')
          : businessObject.documentation?.text || '';

        const result: RechercheResult = {
          element,
          id: element.id,
          type: businessObject.$type || '',
          name: businessObject.name || '',
          link: businessObject.link,
          documentation,
        };

        const fields = {
          id: this.normalize(result.id),
          name: this.normalize(result.name),
          type: this.normalize(result.type),
          link: this.normalize(result.link),
          documentation: this.normalize(result.documentation),
        };

        const score =
          fields.name === normalizedQuery
            ? 100
            : fields.id === normalizedQuery
              ? 90
              : fields.name.startsWith(normalizedQuery)
                ? 80
                : fields.id.startsWith(normalizedQuery)
                  ? 70
                  : fields.name.includes(normalizedQuery)
                    ? 60
                    : fields.id.includes(normalizedQuery)
                      ? 50
                      : fields.type.includes(normalizedQuery)
                        ? 30
                        : fields.link.includes(normalizedQuery)
                          ? 20
                          : fields.documentation.includes(normalizedQuery)
                            ? 10
                            : 0;

        return { result, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map(({ result }) => result);
  }
}