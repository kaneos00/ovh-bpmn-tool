import {
  extractBpmnDataElements,
  ProjectDocumentedSourceController,
} from './project-documented-source.controller';
import { ProjectDocumentedSourceTypeOrmEntity } from '../entities/projectDocumentedSource.ormEntity';
import { ProjectDocumentedSourceReferenceTypeOrmEntity } from '../entities/projectDocumentedSourceReference.ormEntity';
import { ProjectDocumentedSourceProcessTypeOrmEntity } from '../entities/projectDocumentedSourceProcess.ormEntity';

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

    expect(elements).toHaveLength(2);
    expect(elements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        resourceId: 'resource-1',
        processName: 'Gestion des contrats',
        elementId: 'contract-ref',
        elementName: 'Contrat',
        elementType: 'dataObjectReference',
        description: 'Contrat signé et archivé',
      }),
      expect.objectContaining({
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
      }),
    ]));
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

describe('ProjectDocumentedSourceController.synchronize', () => {
  it('creates one project source for each new data object and data store, then stays idempotent', async () => {
    const xml = `<?xml version="1.0"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="process-1" name="Gestion clients">
          <bpmn:dataStore id="store-1" name="Base CRM" />
          <bpmn:dataStoreReference id="store-reference-1" dataStoreRef="store-1" />
          <bpmn:dataObject id="order-data" name="Commande" />
          <bpmn:dataObjectReference id="object-reference-1" dataObjectRef="order-data" />
        </bpmn:process>
      </bpmn:definitions>`;
    const persistedReferences = new Map<string, Record<string, unknown>>();
    const sourceRepository = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: 'source-1',
      })),
    };
    const referenceRepository = {
      findOne: jest.fn(async (query: { where?: { elementId?: string } }) => persistedReferences.get(query.where?.elementId ?? '') ?? null),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => {
        persistedReferences.set(String(value.elementId), value);
        return value;
      }),
    };
    const membershipRepository = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn(async (value: Record<string, unknown>) => value),
    };
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn((entity: unknown) =>
        entity === ProjectDocumentedSourceTypeOrmEntity
          ? sourceRepository
          : entity === ProjectDocumentedSourceReferenceTypeOrmEntity
            ? referenceRepository
            : entity === ProjectDocumentedSourceProcessTypeOrmEntity
              ? membershipRepository
              : undefined,
      ),
    };
    const controller = Object.create(
      ProjectDocumentedSourceController.prototype,
    ) as ProjectDocumentedSourceController;
    Object.assign(controller, {
      access: { assertProjectRole: jest.fn().mockResolvedValue('user-1') },
      projectProcesses: {
        findOne: jest.fn().mockResolvedValue({
          projectId: 'project-1',
          resourceId: 'process-1',
        }),
      },
      resources: {
        findOne: jest.fn().mockResolvedValue({
          id: 'process-1',
          name: 'Gestion clients',
        }),
      },
      contents: {
        findOne: jest.fn().mockResolvedValue({
          content: xml,
          version: 1,
          updatedAt: new Date(),
        }),
      },
      dataSource: {
        transaction: jest.fn(async (work: (value: unknown) => unknown) =>
          work(manager),
        ),
      },
    });

    const first = await controller.synchronize(
      'project-1',
      { resourceId: 'process-1' },
      {},
    );
    const second = await controller.synchronize(
      'project-1',
      { resourceId: 'process-1' },
      {},
    );

    expect(first).toEqual({ created: 2, skipped: 0 });
    expect(second).toEqual({ created: 0, skipped: 2 });
    expect(sourceRepository.save).toHaveBeenCalledTimes(2);
    expect(sourceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        kind: 'database',
        name: 'Base CRM',
        createdBy: 'user-1',
      }),
    );
    expect(referenceRepository.save).toHaveBeenCalledTimes(2);
    expect(membershipRepository.save).toHaveBeenCalledTimes(2);
    expect(membershipRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', resourceId: 'process-1', createdBy: 'user-1' }),
    );
    expect(referenceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        sourceId: expect.any(String),
        resourceId: 'process-1',
        elementId: 'store-reference-1',
        elementName: 'Base CRM',
        elementType: 'dataStoreReference',
        createdBy: 'user-1',
      }),
    );
    expect(referenceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        sourceId: expect.any(String),
        resourceId: 'process-1',
        elementId: 'object-reference-1',
        elementName: 'Commande',
        elementType: 'dataObjectReference',
        createdBy: 'user-1',
      }),
    );
  });
});
