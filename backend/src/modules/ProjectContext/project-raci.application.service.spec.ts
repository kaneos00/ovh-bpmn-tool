import { NotFoundException } from '@nestjs/common';
import { ProjectMemberRole } from './infrastructure/entities/projectMember.ormEntity';
import { ProjectRaciApplicationService } from './project-raci.application.service';

describe('ProjectRaciApplicationService', () => {
  const access = { assertProjectRole: jest.fn() };
  const projectProcesses = { findOne: jest.fn() };
  const actors = { find: jest.fn() };
  const entries = { find: jest.fn() };
  const headers = { 'x-user': 'alice' };
  let service: ProjectRaciApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    access.assertProjectRole.mockResolvedValue('alice');
    projectProcesses.findOne.mockResolvedValue({
      projectId: 'project-1',
      resourceId: 'resource-1',
    });
    actors.find.mockResolvedValue([{ id: 'actor-1', name: 'Support' }]);
    entries.find.mockResolvedValue([
      { id: 'entry-1', resourceId: 'resource-1', taskId: 'Task_1' },
    ]);
    service = new ProjectRaciApplicationService(
      access as never,
      projectProcesses as never,
      actors as never,
      entries as never,
    );
  });

  it('requires Viewer membership before reading the scoped RACI data', async () => {
    await service.readProjectRaciScope('project-1', 'resource-1', headers);

    expect(access.assertProjectRole).toHaveBeenCalledWith(
      'project-1',
      headers,
      ProjectMemberRole.Viewer,
    );
  });

  it('checks the exact project/process link before reading rows', async () => {
    projectProcesses.findOne.mockResolvedValue(null);

    await expect(
      service.readProjectRaciScope('project-1', 'resource-2', headers),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(actors.find).not.toHaveBeenCalled();
    expect(entries.find).not.toHaveBeenCalled();
  });

  it('returns the project-wide actor registry and only the selected process assignments', async () => {
    const snapshot = await service.readProjectRaciScope(
      'project-1',
      'resource-1',
      headers,
    );

    expect(actors.find).toHaveBeenCalledWith({
      where: { projectId: 'project-1' },
      order: { active: 'DESC', name: 'ASC' },
    });
    expect(entries.find).toHaveBeenCalledWith({
      where: { projectId: 'project-1', resourceId: 'resource-1' },
      order: { taskName: 'ASC', actorName: 'ASC' },
    });
    expect(snapshot).toEqual({
      projectId: 'project-1',
      resourceId: 'resource-1',
      actors: [{ id: 'actor-1', name: 'Support' }],
      entries: [
        { id: 'entry-1', resourceId: 'resource-1', taskId: 'Task_1' },
      ],
    });
  });

  it('rejects reads when the caller is not a project Viewer', async () => {
    access.assertProjectRole.mockRejectedValue(new Error('forbidden'));

    await expect(
      service.readProjectRaciScope('project-1', 'resource-1', headers),
    ).rejects.toThrow('forbidden');

    expect(projectProcesses.findOne).not.toHaveBeenCalled();
  });

  it('exposes a project registry read without requiring a process identifier', async () => {
    const result = await service.readProjectRaciRegistry('project-1', headers);

    expect(result).toEqual([{ id: 'actor-1', name: 'Support' }]);
    expect(projectProcesses.findOne).not.toHaveBeenCalled();
  });
});
