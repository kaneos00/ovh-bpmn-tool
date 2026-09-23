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
};

export type RechercheProvider = (
  query: string,
) => Promise<RechercheResult[]>;

export class RechercheService {
  private provider?: RechercheProvider;

  setProvider(provider?: RechercheProvider) {
    this.provider = provider;
  }

  async search(query: string, elementRegistry: any): Promise<RechercheResult[]> {
    const normalizedQuery = query.trim().toLowerCase();

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

        return haystack.includes(normalizedQuery);
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
