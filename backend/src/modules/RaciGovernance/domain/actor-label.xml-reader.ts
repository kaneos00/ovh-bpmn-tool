import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ActorLabelNormalizer } from './actor-label.normalizer';

const BPMN_MODEL_NAMESPACE = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const RACI_NAMESPACE = 'https://ovh-bpmn-tool.local/schema/raci';

const RACI_ROLES = [
  'responsible',
  'accountable',
  'consulted',
  'informed',
] as const;

export type RaciRole = (typeof RACI_ROLES)[number];

export interface ActorLabelOccurrence {
  elementId?: string;
  elementType: string;
  field: string;
  label: string;
  normalizedLabel: string;
  source: 'raci-attribute' | 'raci-actors-json';
  role?: RaciRole;
  actorIndex?: number;
  actorSource?: string;
  active?: boolean;
  bpmnId?: string;
}

export class ActorLabelXmlReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActorLabelXmlReadError';
  }
}

type XmlAttributes = Record<string, unknown>;
type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: true,
});

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function localName(qualifiedName: string): string {
  const separator = qualifiedName.indexOf(':');
  return separator === -1
    ? qualifiedName
    : qualifiedName.slice(separator + 1);
}

function namespacePrefix(qualifiedName: string): string {
  const separator = qualifiedName.indexOf(':');
  return separator === -1 ? '' : qualifiedName.slice(0, separator);
}

function resolveNamespace(
  qualifiedName: string,
  namespaces: Record<string, string>,
): string | undefined {
  return namespaces[namespacePrefix(qualifiedName)];
}

function readNamespaceDeclarations(
  attributes: XmlAttributes,
  inherited: Record<string, string>,
): Record<string, string> {
  const namespaces = { ...inherited };

  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value !== 'string' || !key.startsWith('@_xmlns:')) {
      continue;
    }

    namespaces[key.slice('@_xmlns:'.length)] = value;
  }

  const defaultNamespace = asString(attributes['@_xmlns']);
  if (defaultNamespace !== undefined) {
    namespaces[''] = defaultNamespace;
  }

  return namespaces;
}

function readJsonActors(
  rawValue: string,
  elementId: string | undefined,
  elementType: string,
): ActorLabelOccurrence[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new ActorLabelXmlReadError(
      `Invalid JSON in raci:actors on ${elementType} ${elementId ?? '(without id)'}.`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ActorLabelXmlReadError(
      `raci:actors must contain a JSON array on ${elementType} ${elementId ?? '(without id)'}.`,
    );
  }

  const occurrences: ActorLabelOccurrence[] = [];

  parsed.forEach((entry: unknown, actorIndex: number) => {
    if (
      entry === null ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      typeof (entry as Record<string, unknown>).name !== 'string'
    ) {
      throw new ActorLabelXmlReadError(
        `Invalid actor entry at raci:actors[${actorIndex}] on ${elementType} ${elementId ?? '(without id)'}.`,
      );
    }

    const actor = entry as Record<string, unknown>;
    const label = actor.name as string;
    const normalizedLabel = ActorLabelNormalizer.normalize(label);

    if (!normalizedLabel) {
      return;
    }

    const actorSource = asString(actor.source);
    const bpmnId = asString(actor.bpmnId);

    occurrences.push({
      elementId,
      elementType,
      field: 'raci:actors.name',
      label,
      normalizedLabel,
      source: 'raci-actors-json',
      actorIndex,
      ...(actorSource === undefined ? {} : { actorSource }),
      ...(typeof actor.active === 'boolean' ? { active: actor.active } : {}),
      ...(bpmnId === undefined ? {} : { bpmnId }),
    });
  });

  return occurrences;
}

/**
 * Extracts RACI actor labels from a BPMN XML document without modifying it.
 *
 * Only elements in the BPMN model namespace are inspected. RACI attributes
 * are recognized by namespace URI, so an alternative XML prefix is supported.
 * Repeated labels are intentionally retained as separate occurrences.
 */
export class ActorLabelXmlReader {
  read(xml: string): ActorLabelOccurrence[] {
    if (typeof xml !== 'string' || !xml.trim()) {
      throw new ActorLabelXmlReadError('The BPMN XML document is empty.');
    }

    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      const detail = validation.err;
      throw new ActorLabelXmlReadError(
        `Malformed BPMN XML at line ${detail.line}, column ${detail.col}: ${detail.msg}`,
      );
    }

    let document: unknown;
    try {
      document = parser.parse(xml);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown XML parser error';
      throw new ActorLabelXmlReadError(
        `Unable to parse BPMN XML: ${message}`,
      );
    }

    if (!Array.isArray(document)) {
      throw new ActorLabelXmlReadError(
        'The BPMN XML parser returned an unexpected document shape.',
      );
    }

    const occurrences: ActorLabelOccurrence[] = [];

    const visit = (
      nodes: unknown[],
      inheritedNamespaces: Record<string, string>,
    ): void => {
      for (const candidate of nodes) {
        if (
          candidate === null ||
          typeof candidate !== 'object' ||
          Array.isArray(candidate)
        ) {
          continue;
        }

        const node = candidate as XmlNode;
        const tagName = Object.keys(node).find((key) => key !== ':@');
        if (!tagName) {
          continue;
        }

        const attributes =
          node[':@'] && typeof node[':@'] === 'object'
            ? (node[':@'] as XmlAttributes)
            : {};
        const namespaces = readNamespaceDeclarations(
          attributes,
          inheritedNamespaces,
        );
        const elementType = localName(tagName);
        const isBpmnElement =
          resolveNamespace(tagName, namespaces) === BPMN_MODEL_NAMESPACE;

        if (isBpmnElement) {
          const elementId = asString(attributes['@_id']);

          for (const [attributeName, attributeValue] of Object.entries(
            attributes,
          )) {
            if (typeof attributeValue !== 'string') {
              continue;
            }

            const match = /^@_([^:]+):([^:]+)$/.exec(attributeName);
            if (!match) {
              continue;
            }

            const [, prefix, fieldName] = match;
            if (namespaces[prefix] !== RACI_NAMESPACE) {
              continue;
            }

            if (
              (RACI_ROLES as readonly string[]).includes(fieldName)
            ) {
              const normalizedLabel =
                ActorLabelNormalizer.normalize(attributeValue);
              if (normalizedLabel) {
                occurrences.push({
                  elementId,
                  elementType,
                  field: `raci:${fieldName}`,
                  label: attributeValue,
                  normalizedLabel,
                  source: 'raci-attribute',
                  role: fieldName as RaciRole,
                });
              }
            } else if (fieldName === 'actors') {
              occurrences.push(
                ...readJsonActors(attributeValue, elementId, elementType),
              );
            }
          }
        }

        const children = node[tagName];
        if (Array.isArray(children)) {
          visit(children, namespaces);
        }
      }
    };

    visit(document, {});
    return occurrences;
  }
}
