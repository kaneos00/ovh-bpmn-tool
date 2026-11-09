import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RaciGovernanceApplicationService } from './raci-governance.application.service';
import { RaciReferenceActorTypeOrmEntity } from '../infrastructure/entities/raciReferenceActor.ormEntity';
import { RaciActorMappingTypeOrmEntity } from '../infrastructure/entities/raciActorMapping.ormEntity';
import { RaciActorEventTypeOrmEntity } from '../infrastructure/entities/raciActorEvent.ormEntity';

describe('RaciGovernanceApplicationService', () => {
  const access = {
    getAuthenticatedUserId: jest.fn(),
    hasOrganizationAdminRole: jest.fn(),
  };
  const projectRaci = {
    readOrganizationActorInventory: jest.fn(),
    readOrganizationActorById: jest.fn(),
  };
  const referenceActors = { find: jest.fn() };
  const mappings = { find: jest.fn() };
  const referenceRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ ...value, id: 'reference-1' })),
    findOne: jest.fn(),
  };
  const mappingRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ ...value, id: 'mapping-1' })),
    findOne: jest.fn(),
  };
  const eventRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const manager = {
    getRepository: jest.fn((entity) => {
      if (entity === RaciReferenceActorTypeOrmEntity) {
        return referenceRepository;
      }
      if (entity === RaciActorMappingTypeOrmEntity) {
        return mappingRepository;
      }
      if (entity === RaciActorEventTypeOrmEntity) return eventRepository;
      throw new Error('Unexpected repository');
    }),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  const headers = { 'x-user': 'admin' };
  let service: RaciGovernanceApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    access.getAuthenticatedUserId.mockReturnValue('admin');
    access.hasOrganizationAdminRole.mockReturnValue(true);
    projectRaci.readOrganizationActorById.mockResolvedValue({
      projectId: 'project-1',
      projectName: 'Alpha',
      actorId: 'local-1',
      actorName: 'Responsable IVV',
      normalizedName: 'responsable ivv',
      active: true,
      origin: 'manual',
    });
    referenceRepository.findOne.mockResolvedValue({
      id: 'reference-1',
      name: 'Responsable VV',
      normalizedName: 'responsable vv',
      actorType: 'function',
      description: null,
      active: true,
    });
    mappingRepository.findOne.mockResolvedValue(null);
    dataSource.transaction.mockImplementation((callback) => callback(manager));
    service = new RaciGovernanceApplicationService(
      access as never,
      projectRaci as never,
      dataSource as never,
      referenceActors as never,
      mappings as never,
    );
  });

  it('refuses every cross-project operation without organization-admin authority', async () => {
    access.hasOrganizationAdminRole.mockReturnValue(false);

    await expect(
      service.createReferenceActor(
        { name: 'Responsable VV', actorType: 'function' },
        headers,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('creates a reference actor and its audit event in one transaction', async () => {
    const result = await service.createReferenceActor(
      {
        name: '  Responsable VV  ',
        actorType: 'function',
        description: 'Pilotage IVV',
      },
      headers,
    );

    expect(result).toMatchObject({
      id: 'reference-1',
      name: 'Responsable VV',
      normalizedName: 'responsable vv',
      actorType: 'function',
      activeMappingCount: 0,
    });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'reference_actor.created',
        referenceActorId: 'reference-1',
        createdBy: 'admin',
      }),
    );
  });

  it('creates an explicit local mapping and audits it without changing the local actor', async () => {
    const result = await service.createActorMapping(
      { localActorId: 'local-1', referenceActorId: 'reference-1' },
      headers,
    );

    expect(result).toMatchObject({
      id: 'mapping-1',
      localActorId: 'local-1',
      referenceActorId: 'reference-1',
      active: true,
      localActor: { actorName: 'Responsable IVV' },
      referenceActor: { name: 'Responsable VV' },
    });
    expect(projectRaci.readOrganizationActorById).toHaveBeenCalledWith(
      'local-1',
      headers,
    );
    expect(eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'actor_mapping.created',
        localActorId: 'local-1',
        referenceActorId: 'reference-1',
        mappingId: 'mapping-1',
      }),
    );
  });

  it('does not create a second active mapping for a local actor', async () => {
    mappingRepository.findOne.mockResolvedValue({ id: 'existing-mapping' });

    await expect(
      service.createActorMapping(
        { localActorId: 'local-1', referenceActorId: 'reference-1' },
        headers,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mappingRepository.save).not.toHaveBeenCalled();
  });
});
