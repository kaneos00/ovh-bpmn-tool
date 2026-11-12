import { BadRequestException } from '@nestjs/common';
import { JobArchitectureService } from './jobArchitecture.service';

describe('JobArchitectureService.addPositionActivityMapping', () => {
  const headers = { authorization: 'test' };
  const validXml = `
    <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL">
      <process id="Process_1"><userTask id="Task_1"/></process>
    </definitions>`;

  let service: JobArchitectureService;
  let assertProjectRole: jest.Mock;
  let positionFindOne: jest.Mock;
  let processFindOne: jest.Mock;
  let positionBlockFindOne: jest.Mock;
  let contentFindOne: jest.Mock;
  let mappingFindOne: jest.Mock;
  let mappingCreate: jest.Mock;
  let mappingSave: jest.Mock;

  beforeEach(() => {
    assertProjectRole = jest.fn().mockResolvedValue('user-1');
    positionFindOne = jest.fn().mockResolvedValue({ id: 'position-1' });
    processFindOne = jest.fn().mockResolvedValue({ resourceId: 'resource-1' });
    positionBlockFindOne = jest.fn().mockResolvedValue({
      blockId: 'block-1',
      applicability: 'required',
    });
    contentFindOne = jest.fn().mockResolvedValue({
      content: validXml,
      version: 2,
    });
    mappingFindOne = jest.fn().mockResolvedValue(null);
    mappingCreate = jest.fn((value) => value);
    mappingSave = jest.fn((value) => Promise.resolve(value));

    service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: { assertProjectRole },
      positions: { findOne: positionFindOne },
      projectProcesses: { findOne: processFindOne },
      positionBlocks: { findOne: positionBlockFindOne },
      contents: { findOne: contentFindOne },
      activityMappings: {
        findOne: mappingFindOne,
        create: mappingCreate,
        save: mappingSave,
      },
    });
  });

  const addMapping = () =>
    service.addPositionActivityMapping(
      'project-1',
      'position-1',
      { resourceId: 'resource-1', taskId: 'Task_1', blockId: 'block-1' },
      headers,
    );

  it('accepts an activity ID present in the latest published BPMN XML', async () => {
    await expect(addMapping()).resolves.toMatchObject({
      resourceId: 'resource-1',
      taskId: 'Task_1',
      blockId: 'block-1',
    });
    expect(contentFindOne).toHaveBeenCalledWith({
      where: { resourceId: 'resource-1', status: 'published' },
      order: { version: 'DESC', createdAt: 'DESC' },
    });
    expect(mappingSave).toHaveBeenCalledTimes(1);
  });

  it('rejects a process that has no published content', async () => {
    contentFindOne.mockResolvedValue(null);
    await expect(addMapping()).rejects.toBeInstanceOf(BadRequestException);
    expect(contentFindOne).toHaveBeenCalledTimes(1);
    expect(mappingSave).not.toHaveBeenCalled();
  });

  it('rejects an ID that is absent from the latest published version', async () => {
    contentFindOne.mockResolvedValue({
      content: validXml.replace('Task_1', 'Task_renamed'),
      version: 3,
    });
    await expect(addMapping()).rejects.toThrow('not found as an activity');
    expect(mappingSave).not.toHaveBeenCalled();
  });

  it('rejects malformed published XML instead of accepting an unchecked mapping', async () => {
    contentFindOne.mockResolvedValue({
      content: '<definitions><process></definitions>',
      version: 3,
    });
    await expect(addMapping()).rejects.toThrow('not well-formed XML');
    expect(mappingSave).not.toHaveBeenCalled();
  });

  it('rejects an existing BPMN element when it is not an activity', async () => {
    contentFindOne.mockResolvedValue({
      content: validXml.replace(
        '<userTask id="Task_1"/>',
        '<exclusiveGateway id="Task_1"/>',
      ),
      version: 3,
    });
    await expect(addMapping()).rejects.toThrow('not found as an activity');
    expect(mappingSave).not.toHaveBeenCalled();
  });
});

describe('JobArchitectureService.getProjectConsistencyDiagnostics', () => {
  it('distinguishes inactive, unlinked, and missing RACI actors and ignores archived links', async () => {
    const service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: {
        assertProjectRole: jest.fn().mockResolvedValue('user-1'),
      },
      positions: {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'position-active', title: 'Responsable projet' },
          ]),
      },
      raciActors: {
        find: jest.fn().mockResolvedValue([
          { id: 'actor-linked', normalizedName: 'responsable', active: true },
          {
            id: 'actor-archived-link',
            normalizedName: 'chef de projet',
            active: true,
          },
          {
            id: 'actor-inactive',
            normalizedName: 'ancien rôle',
            active: false,
          },
        ]),
      },
      raciEntries: {
        find: jest
          .fn()
          .mockResolvedValue([
            { actorName: 'Responsable' },
            { actorName: 'Chef de projet' },
            { actorName: 'Ancien rôle' },
            { actorName: 'Rôle inconnu' },
          ]),
      },
      raciMappings: {
        find: jest.fn().mockResolvedValue([
          { positionId: 'position-active', raciActorId: 'actor-linked' },
          {
            positionId: 'position-archived',
            raciActorId: 'actor-archived-link',
          },
          { positionId: 'position-active', raciActorId: 'actor-inactive' },
        ]),
      },
      activityMappings: { find: jest.fn().mockResolvedValue([]) },
      positionBlocks: { find: jest.fn().mockResolvedValue([]) },
    });

    const result = await service.getProjectConsistencyDiagnostics('project-1', {
      authorization: 'test',
    });

    expect(result.unmappedRaciActors).toEqual([
      {
        name: 'Chef de projet',
        actorId: 'actor-archived-link',
        reason: 'actor_not_linked_to_a_position',
      },
      {
        name: 'Ancien rôle',
        actorId: 'actor-inactive',
        reason: 'actor_inactive',
      },
      {
        name: 'Rôle inconnu',
        actorId: null,
        reason: 'actor_not_in_registry',
      },
    ]);
    expect(result.counts).toMatchObject({
      positions: 1,
      raciActors: 2,
      raciEntries: 4,
      raciActorMappings: 1,
      activityMappings: 0,
    });
  });

  it('flags RACI assignments whose actor is linked to a position but whose activity is not linked to that position', async () => {
    const service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: {
        assertProjectRole: jest.fn().mockResolvedValue('user-1'),
      },
      positions: {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'position-1', title: 'Responsable projet' },
          ]),
      },
      raciActors: {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'actor-1', normalizedName: 'responsable', active: true },
          ]),
      },
      raciEntries: {
        find: jest.fn().mockResolvedValue([
          {
            actorName: 'Responsable',
            taskName: 'Valider le dossier',
            taskId: 'Task_1',
            resourceId: 'process-1',
            role: 'R',
          },
          {
            actorName: 'Responsable',
            taskName: 'Contrôler le résultat',
            taskId: 'Task_2',
            resourceId: 'process-1',
            role: 'A',
          },
        ]),
      },
      raciMappings: {
        find: jest
          .fn()
          .mockResolvedValue([
            { positionId: 'position-1', raciActorId: 'actor-1' },
          ]),
      },
      activityMappings: {
        find: jest.fn().mockResolvedValue([
          {
            id: 'activity-map-1',
            positionId: 'position-1',
            resourceId: 'process-1',
            taskId: 'Task_1',
            blockId: 'block-1',
          },
        ]),
      },
      contents: {
        find: jest
          .fn()
          .mockResolvedValue([
            { resourceId: 'process-1', content: validXml, version: 2 },
          ]),
      },
      positionBlocks: { find: jest.fn().mockResolvedValue([]) },
    });

    const result = await service.getProjectConsistencyDiagnostics('project-1', {
      authorization: 'test',
    });

    expect(result.raciAssignmentsWithoutPositionActivity).toEqual([
      {
        actorName: 'Responsable',
        taskName: 'Contrôler le résultat',
        taskId: 'Task_2',
        resourceId: 'process-1',
        role: 'A',
        positionIds: ['position-1'],
        positionTitles: ['Responsable projet'],
      },
    ]);
    expect(result.positionValidation).toEqual([
      {
        positionId: 'position-1',
        positionTitle: 'Responsable projet',
        status: 'to_review',
        counts: {
          competencyBlocks: 0,
          competencyBlocksNotAssessed: 0,
          raciActors: 1,
          raciActorsWithoutAssignments: 0,
          requiredBlocksWithoutActivities: 0,
          raciAssignmentsWithoutActivity: 1,
          staleActivityMappings: 0,
        },
        unassessedBlockIds: [],
        unusedRaciActors: [],
        missingRequiredBlockIds: [],
      },
    ]);
  });

  it('marks a position as ready only when competencies, RACI roles and BPMN links are aligned', async () => {
    const service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: {
        assertProjectRole: jest.fn().mockResolvedValue('user-1'),
      },
      positions: {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'position-1', title: 'Responsable projet' },
          ]),
      },
      raciActors: {
        find: jest.fn()
          .mockResolvedValue([
            {
              id: 'actor-1',
              normalizedName: 'responsable',
              name: 'Responsable',
              active: true,
            },
          ]),
      },
      raciEntries: {
        find: jest.fn().mockResolvedValue([
          {
            actorName: 'Responsable',
            taskName: 'Valider le dossier',
            taskId: 'Task_1',
            resourceId: 'process-1',
            role: 'R',
          },
        ]),
      },
      raciMappings: {
        find: jest
          .fn()
          .mockResolvedValue([
            { positionId: 'position-1', raciActorId: 'actor-1' },
          ]),
      },
      activityMappings: {
        find: jest.fn().mockResolvedValue([
          {
            id: 'activity-map-1',
            positionId: 'position-1',
            resourceId: 'process-1',
            taskId: 'Task_1',
            blockId: 'block-1',
          },
        ]),
      },
      contents: {
        find: jest
          .fn()
          .mockResolvedValue([
            { resourceId: 'process-1', content: validXml, version: 2 },
          ]),
      },
      positionBlocks: {
        find: jest.fn().mockResolvedValue([
          {
            positionId: 'position-1',
            blockId: 'block-1',
            applicability: 'required',
          },
        ]),
      },
    });

    const result = await service.getProjectConsistencyDiagnostics('project-1', {
      authorization: 'test',
    });

    expect(result.positionValidation[0]).toMatchObject({
      positionId: 'position-1',
      status: 'ready',
      counts: {
        competencyBlocks: 1,
        competencyBlocksNotAssessed: 0,
        raciActors: 1,
        raciActorsWithoutAssignments: 0,
        requiredBlocksWithoutActivities: 0,
        raciAssignmentsWithoutActivity: 0,
      },
    });
  });

  it('keeps a position incomplete while competency blocks remain unassessed or no RACI role is linked', async () => {
    const service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: {
        assertProjectRole: jest.fn().mockResolvedValue('user-1'),
      },
      positions: {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'position-1', title: 'Responsable projet' },
          ]),
      },
      raciActors: { find: jest.fn().mockResolvedValue([]) },
      raciEntries: { find: jest.fn().mockResolvedValue([]) },
      raciMappings: { find: jest.fn().mockResolvedValue([]) },
      activityMappings: { find: jest.fn().mockResolvedValue([]) },
      positionBlocks: {
        find: jest.fn().mockResolvedValue([
          {
            positionId: 'position-1',
            blockId: 'block-1',
            applicability: 'not_assessed',
          },
        ]),
      },
    });

    const result = await service.getProjectConsistencyDiagnostics('project-1', {
      authorization: 'test',
    });

    expect(result.positionValidation[0]).toMatchObject({
      positionId: 'position-1',
      status: 'to_complete',
      counts: {
        competencyBlocks: 1,
        competencyBlocksNotAssessed: 1,
        raciActors: 0,
      },
      unassessedBlockIds: ['block-1'],
    });
  });

  it('marks saved BPMN mappings as stale when the latest publication no longer contains the activity', async () => {
    const service = Object.create(
      JobArchitectureService.prototype,
    ) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: {
        assertProjectRole: jest.fn().mockResolvedValue('user-1'),
      },
      positions: {
        find: jest
          .fn()
          .mockResolvedValue([
            { id: 'position-1', title: 'Responsable projet' },
          ]),
      },
      raciActors: {
        find: jest.fn()
          .mockResolvedValue([
            {
              id: 'actor-1',
              normalizedName: 'responsable',
              name: 'Responsable',
              active: true,
            },
          ]),
      },
      raciEntries: {
        find: jest.fn().mockResolvedValue([
          {
            actorName: 'Responsable',
            taskName: 'Valider le dossier',
            taskId: 'Task_1',
            resourceId: 'process-1',
            role: 'R',
          },
        ]),
      },
      raciMappings: {
        find: jest
          .fn()
          .mockResolvedValue([
            { positionId: 'position-1', raciActorId: 'actor-1' },
          ]),
      },
      activityMappings: {
        find: jest.fn().mockResolvedValue([
          {
            id: 'activity-map-old',
            positionId: 'position-1',
            resourceId: 'process-1',
            taskId: 'Task_1',
            blockId: 'block-1',
          },
        ]),
      },
      contents: {
        find: jest.fn().mockResolvedValue([
          {
            resourceId: 'process-1',
            content: validXml.replace('Task_1', 'Task_renamed'),
            version: 3,
          },
        ]),
      },
      positionBlocks: {
        find: jest.fn().mockResolvedValue([
          {
            positionId: 'position-1',
            blockId: 'block-1',
            applicability: 'required',
          },
        ]),
      },
    });

    const result = await service.getProjectConsistencyDiagnostics('project-1', {
      authorization: 'test',
    });

    expect(result.staleActivityMappings).toEqual([
      {
        id: 'activity-map-old',
        positionId: 'position-1',
        resourceId: 'process-1',
        taskId: 'Task_1',
        blockId: 'block-1',
        reason: 'activity_not_in_latest_published_version',
      },
    ]);
    expect(result.positionValidation[0]).toMatchObject({
      status: 'to_review',
      counts: {
        staleActivityMappings: 1,
        requiredBlocksWithoutActivities: 1,
      },
    });
  });
});
