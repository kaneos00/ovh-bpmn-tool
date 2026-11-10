import { XMLParser, XMLValidator } from 'fast-xml-parser';

const BPMN_ACTIVITY_NAMES = new Set([
  'task',
  'userTask',
  'serviceTask',
  'sendTask',
  'receiveTask',
  'manualTask',
  'businessRuleTask',
  'scriptTask',
  'callActivity',
  'subProcess',
  'transaction',
  'adHocSubProcess',
]);

/**
 * Extracts stable BPMN activity IDs from XML without depending on a particular
 * namespace prefix. XML syntax is validated before parsing; non-activity
 * elements (events, gateways, sequence flows, processes, shapes) are excluded.
 */
export function extractBpmnActivityIds(xml: string): Set<string> {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    throw new Error('Published BPMN content is not well-formed XML');
  }

  let document: unknown;
  try {
    document = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: false,
      trimValues: false,
    }).parse(xml);
  } catch {
    throw new Error('Published BPMN content could not be parsed');
  }

  const ids = new Set<string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;

    for (const [qualifiedName, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const localName = qualifiedName.split(':').pop() ?? qualifiedName;
      if (BPMN_ACTIVITY_NAMES.has(localName) && child && typeof child === 'object') {
        const id = (child as Record<string, unknown>)['@_id'];
        if (typeof id === 'string' && id.trim()) ids.add(id);
      }
      visit(child);
    }
  };

  visit(document);
  return ids;
}
