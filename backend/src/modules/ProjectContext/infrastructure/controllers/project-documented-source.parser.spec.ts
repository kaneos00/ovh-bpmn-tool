import { extractBpmnDataElements } from './project-documented-source.controller';

describe('extractBpmnDataElements', () => {
  it('recovers documented metadata from BPMN data references and legacy source extensions', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="process-1" name="Gestion des contrats">
          <bpmn:dataObject id="contract-data" name="Contrat">
            <bpmn:documentation>Contrat signé et archivé</bpmn:documentation>
          </bpmn:dataObject>
          <bpmn:dataObjectReference id="contract-ref" dataObjectRef="contract-data" />
          <bpmn:dataStoreReference id="crm-ref" name="CRM" />
          <bpmn:extensionElements>
            <source id="crm-ref" bpmnType="database" description="Base clients" link="https://crm.example.test" location="Cloud" access="Equipe commerciale" retention="10 ans" authorizedPeople="Commercial" restrictions="Confidentiel" />
          </bpmn:extensionElements>
        </bpmn:process>
      </bpmn:definitions>`;

    const elements = extractBpmnDataElements(
      xml,
      'resource-1',
      'Gestion des contrats',
    );

    // Only BPMN data stores are eligible for documented-information associations.
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      resourceId: 'resource-1',
      processName: 'Gestion des contrats',
      elementId: 'crm-ref',
      elementName: 'CRM',
      elementType: 'dataStoreReference',
      description: 'Base clients',
      link: 'https://crm.example.test',
      location: 'Cloud',
      access: 'Equipe commerciale',
      retention: '10 ans',
      authorizedPeople: 'Commercial',
      restrictions: 'Confidentiel',
    });
  });

  it('ignores malformed or unsafe XML instead of breaking the project registry', () => {
    expect(
      extractBpmnDataElements(
        '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>',
        'r',
        'p',
      ),
    ).toEqual([]);
    expect(extractBpmnDataElements('<not-xml', 'r', 'p')).toEqual([]);
  });
});
