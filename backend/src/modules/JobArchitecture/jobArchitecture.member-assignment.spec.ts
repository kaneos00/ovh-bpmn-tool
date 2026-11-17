import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobArchitectureService } from './jobArchitecture.service';

describe('JobArchitectureService project member job-position assignment', () => {
  const headers = { authorization: 'test' };
  let service: JobArchitectureService;
  let assertProjectRole: jest.Mock;
  let memberFindOne: jest.Mock;
  let assignmentFindOne: jest.Mock;
  let assignmentCreate: jest.Mock;
  let assignmentSave: jest.Mock;
  let assignmentRemove: jest.Mock;
  let positionFindOne: jest.Mock;
  let functionFindOne: jest.Mock;

  beforeEach(() => {
    assertProjectRole = jest.fn().mockResolvedValue('manager');
    memberFindOne = jest.fn().mockResolvedValue({
      projectId: 'project-1',
      userId: 'member-1',
    });
    assignmentFindOne = jest.fn().mockResolvedValue(null);
    assignmentCreate = jest.fn((value) => value);
    assignmentSave = jest.fn(async (value) => ({
      id: 'assignment-1',
      ...value,
    }));
    assignmentRemove = jest.fn().mockResolvedValue(undefined);
    positionFindOne = jest.fn().mockResolvedValue({
      id: 'position-1',
      projectId: 'project-1',
      functionId: 'function-1',
      active: true,
    });
    functionFindOne = jest.fn().mockResolvedValue({
      id: 'function-1',
      name: 'Analyste',
    });

    service = Object.create(JobArchitectureService.prototype) as JobArchitectureService;
    Object.assign(service, {
      projectAccess: { assertProjectRole },
      projectMembers: { findOne: memberFindOne },
      memberPositionAssignments: {
        findOne: assignmentFindOne,
        create: assignmentCreate,
        save: assignmentSave,
        remove: assignmentRemove,
      },
      positions: { findOne: positionFindOne },
      functions: { findOne: functionFindOne },
    });
  });

  it('assigns one active position to a member in the selected project', async () => {
    await expect(
      service.assignMemberJobPosition(
        'project-1',
        'member-1',
        'position-1',
        headers,
      ),
    ).resolves.toMatchObject({
      projectId: 'project-1',
      userId: 'member-1',
      positionId: 'position-1',
      position: { id: 'position-1' },
    });
    expect(assertProjectRole).toHaveBeenCalledWith(
      'project-1',
      headers,
      'modeler',
    );
    expect(memberFindOne).toHaveBeenCalledWith({
      where: { projectId: 'project-1', userId: 'member-1' },
    });
  });

  it('rejects a user who is not a member of the project', async () => {
    memberFindOne.mockResolvedValue(null);
    await expect(
      service.assignMemberJobPosition(
        'project-1',
        'outsider',
        'position-1',
        headers,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(assignmentSave).not.toHaveBeenCalled();
  });

  it('rejects a position that does not belong to the selected project', async () => {
    positionFindOne.mockResolvedValue(null);
    await expect(
      service.assignMemberJobPosition(
        'project-1',
        'member-1',
        'position-other',
        headers,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(assignmentSave).not.toHaveBeenCalled();
  });

  it('requires an explicit null to remove an assignment', async () => {
    await expect(
      service.assignMemberJobPosition(
        'project-1',
        'member-1',
        undefined,
        headers,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes the current project assignment when positionId is null', async () => {
    assignmentFindOne.mockResolvedValue({
      id: 'assignment-1',
      projectId: 'project-1',
      userId: 'member-1',
    });
    await expect(
      service.assignMemberJobPosition(
        'project-1',
        'member-1',
        null,
        headers,
      ),
    ).resolves.toMatchObject({
      projectId: 'project-1',
      userId: 'member-1',
      position: null,
    });
    expect(assignmentRemove).toHaveBeenCalledWith({
      id: 'assignment-1',
      projectId: 'project-1',
      userId: 'member-1',
    });
  });

  it('returns only the authenticated member position for the selected project', async () => {
    assignmentFindOne.mockResolvedValue({
      projectId: 'project-1',
      userId: 'member-1',
      positionId: 'position-1',
    });
    await expect(
      service.getMyJobPosition('project-1', headers),
    ).resolves.toMatchObject({
      projectId: 'project-1',
      userId: 'manager',
      position: { id: 'position-1' },
      function: { id: 'function-1' },
    });
    expect(assertProjectRole).toHaveBeenCalledWith(
      'project-1',
      headers,
      'viewer',
    );
  });
});
