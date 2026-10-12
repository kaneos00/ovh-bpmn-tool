import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectMemberRole } from '../entities/projectMember.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../entities/projectRaciActor.ormEntity';
import { ProjectRaciRole } from '../entities/projectRaciEntry.ormEntity';
import { ProjectRaciController } from './project-raci.controller';

describe('ProjectRaciController actor register', () => {
  const configService = { getOrThrow: jest.fn().mockReturnValue('x-user') };
  const dataSource = { transaction: jest.fn() };
  const projectMembers = { findOne: jest.fn() };
  const projectProcesses = { find: jest.fn() };
  const entries = {
    find: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    createQueryBuilder: jest.fn(),
  };
  const actors = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn((value) => Promise.resolve(value)),
    create: jest.fn((value) => value),
  };
  let controller: ProjectRaciController;

  const headers = { 'x-user': 'alice' };
  const membership = {
    projectId: 'project-1',
    userId: 'alice',
    role: ProjectMemberRole.Modeler,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dataSource.transaction.mockReset();
    configService.getOrThrow.mockReturnValue('x-user');
    projectMembers.findOne.mockResolvedValue(membership);
    projectProcesses.find.mockResolvedValue([]);
    actors.find.mockResolvedValue([]);
    actors.findOne.mockResolvedValue(null);
    actors.save.mockImplementation((value) => Promise.resolve(value));
    actors.create.mockImplementation((value) => value);
  });

  it('requires project membership before exposing the actor register', async () => {
    projectMembers.findOne.mockResolvedValue(null);

    await expect(
      controllerCall().getProjectActors('project-1', headers),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a manually entered actor with a normalized unique key', async () => {
    const result = await controllerCall().createProjectActor(
      'project-1',
      { name: '  Support Métier  ' },
      headers,
    );

    expect(actors.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        name: 'Support Métier',
        normalizedName: 'support métier',
        active: true,
        origin: 'manual',
        createdBy: 'alice',
      }),
    );
    expect(result.name).toBe('Support Métier');
  });

  it('rejects duplicate actor names regardless of letter case', async () => {
    actors.findOne.mockResolvedValue({
      id: 'actor-1',
      normalizedName: 'support métier',
    });

    await expect(
      controllerCall().createProjectActor(
        'project-1',
        { name: 'SUPPORT MÉTIER' },
        headers,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not reactivate an actor explicitly deactivated when syncing BPMN names', async () => {
    const inactiveActor = {
      id: 'actor-1',
      projectId: 'project-1',
      name: 'Support',
      normalizedName: 'support',
      active: false,
      origin: 'manual',
    };
    actors.find.mockResolvedValue([inactiveActor]);

    const result = await controllerCall().syncProjectActors(
      'project-1',
      { names: ['Support', 'SUPPORT', '  support  '] },
      headers,
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(actors.save).not.toHaveBeenCalled();
    expect(result).toEqual([inactiveActor]);
    expect(result[0].active).toBe(false);
  });

  it('renames an actor and updates its existing RACI assignments in one transaction', async () => {
    const actor = {
      id: 'actor-1',
      projectId: 'project-1',
      name: 'Support',
      normalizedName: 'support',
      active: true,
      origin: 'manual',
    };
    const actorRepository = {
      findOne: jest.fn()
        .mockResolvedValueOnce(actor)
        .mockResolvedValueOnce(null),
      save: jest.fn(async (value) => value),
    };
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const entryRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const manager = {
      getRepository: jest.fn((entity) => (
        entity === ProjectRaciActorTypeOrmEntity
          ? actorRepository
          : entryRepository
      )),
    };
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    const result = await controllerCall().renameProjectActor(
      'project-1',
      'actor-1',
      { name: 'Operations' },
      headers,
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(entryRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(queryBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({ actorName: 'Operations' }),
    );
    expect(actorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Operations',
        normalizedName: 'operations',
      }),
    );
    expect(result.name).toBe('Operations');
  });

  it('deactivates an actor without deleting its existing assignments', async () => {
    const actor = {
      id: 'actor-1',
      projectId: 'project-1',
      name: 'Support',
      normalizedName: 'support',
      active: true,
      origin: 'manual',
    };
    actors.findOne.mockResolvedValue(actor);

    const result = await controllerCall().setProjectActorActive(
      'project-1',
      'actor-1',
      { active: false },
      headers,
    );

    expect(result.active).toBe(false);
    expect(entries.delete).not.toHaveBeenCalled();
    expect(entries.save).not.toHaveBeenCalled();
  });

  it('rejects matrix assignments to actors outside the project register', async () => {
    await expect(
      controllerCall().replaceProjectRaci(
        'project-1',
        {
          entries: [
            {
              resourceId: 'resource-1',
              taskId: 'Activity_1',
              taskName: 'Validate request',
              actorName: 'Unknown actor',
              role: ProjectRaciRole.Responsible,
            },
          ],
        },
        headers,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(projectProcesses.find).not.toHaveBeenCalled();
  });

  function controllerCall() {
    if (!controller) {
      controller = new ProjectRaciController(
        configService as never,
        dataSource as never,
        projectMembers as never,
        projectProcesses as never,
        entries as never,
        actors as never,
      );
    }
    return controller;
  }
});
