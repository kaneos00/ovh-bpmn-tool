import { BadRequestException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectMemberRole } from '../entities/projectMember.ormEntity';
import { ProjectProcessUsage } from '../entities/projectProcess.ormEntity';
import { ResourceTypeEnum } from '../../../../modules/ResourceContext/shared/types/Resource';

describe('ProjectController administration overview', () => {
  const projects = {
    find: jest.fn(),
    findOneBy: jest.fn().mockResolvedValue({
      id: 'project-a',
      name: 'Atlas',
      description: 'Operations',
    }),
  };
  const projectMembers = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((member) => member),
    save: jest.fn((member) => Promise.resolve(member)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const projectProcesses = {
    find: jest.fn(),
  };
  const resources = {
    find: jest.fn(),
  };

  let controller: ProjectController;

  beforeEach(() => {
    jest.clearAllMocks();
    projects.find.mockResolvedValue([
      { id: 'project-a', name: 'Atlas', description: 'Operations' },
      { id: 'project-b', name: 'RH', description: null },
    ]);
    projectMembers.find.mockResolvedValue([
      {
        projectId: 'project-a',
        userId: 'alice',
        role: ProjectMemberRole.Admin,
      },
      {
        projectId: 'project-b',
        userId: 'alice',
        role: ProjectMemberRole.Viewer,
      },
      {
        projectId: 'project-a',
        userId: 'bob',
        role: ProjectMemberRole.Modeler,
      },
    ]);
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-a',
        resourceId: 'process-shared',
        usage: ProjectProcessUsage.Common,
        sourceResourceId: null,
      },
      {
        projectId: 'project-b',
        resourceId: 'process-shared',
        usage: ProjectProcessUsage.Common,
        sourceResourceId: null,
      },
      {
        projectId: 'project-b',
        resourceId: 'process-variant',
        usage: ProjectProcessUsage.Variant,
        sourceResourceId: 'process-shared',
      },
    ]);
    resources.find.mockResolvedValue([
      {
        id: 'process-shared',
        name: 'Gestion commune',
        description: null,
        type: ResourceTypeEnum.Process,
      },
      {
        id: 'process-variant',
        name: 'Gestion RH',
        description: 'Variante locale',
        type: ResourceTypeEnum.Process,
      },
    ]);

    controller = new ProjectController(
      { getOrThrow: jest.fn().mockReturnValue('x-user') } as never,
      {} as never,
      projects as never,
      projectProcesses as never,
      resources as never,
      projectMembers as never,
      {} as never,
    );
  });

  it('aggregates each user and all their project roles', async () => {
    const result = await controller.getAdministrationOverview();

    expect(result.users).toEqual([
      {
        userId: 'alice',
        projects: [
          { projectId: 'project-a', projectName: 'Atlas', role: 'admin' },
          { projectId: 'project-b', projectName: 'RH', role: 'viewer' },
        ],
      },
      {
        userId: 'bob',
        projects: [
          { projectId: 'project-a', projectName: 'Atlas', role: 'modeler' },
        ],
      },
    ]);
  });

  it('shows the same shared resource for every project that references it', async () => {
    const result = await controller.getAdministrationOverview();
    const shared = result.processes.find(
      (process) => process.id === 'process-shared',
    );

    expect(shared?.projects).toEqual([
      {
        projectId: 'project-a',
        projectName: 'Atlas',
        usage: 'common',
        sourceResourceId: null,
      },
      {
        projectId: 'project-b',
        projectName: 'RH',
        usage: 'common',
        sourceResourceId: null,
      },
    ]);
    expect(
      result.projects.find((project) => project.id === 'project-a')
        ?.processes[0],
    ).toMatchObject({
      resourceId: 'process-shared',
      name: 'Gestion commune',
      usage: 'common',
    });
  });

  it('allows an organization administrator to set a project member role', async () => {
    const existing = {
      projectId: 'project-a',
      userId: 'alice',
      role: ProjectMemberRole.Viewer,
    };
    projectMembers.findOneBy.mockResolvedValue(existing);

    const result = await controller.setOrganizationProjectMember(
      'project-a',
      'alice',
      { role: ProjectMemberRole.Modeler },
      { 'x-user': 'org-admin' },
    );

    expect(result.role).toBe(ProjectMemberRole.Modeler);
    expect(projectMembers.save).toHaveBeenCalledWith(existing);
  });

  it('prevents an organization administrator from removing the last project admin', async () => {
    projectMembers.findOneBy.mockResolvedValue({
      projectId: 'project-a',
      userId: 'alice',
      role: ProjectMemberRole.Admin,
    });
    projectMembers.find.mockResolvedValue([
      {
        projectId: 'project-a',
        userId: 'alice',
        role: ProjectMemberRole.Admin,
      },
    ]);

    await expect(
      controller.removeOrganizationProjectMember('project-a', 'alice'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(projectMembers.delete).not.toHaveBeenCalled();
  });

  it('preserves variant source references and counts members per project', async () => {
    const result = await controller.getAdministrationOverview();

    expect(
      result.projects.find((project) => project.id === 'project-a')
        ?.membersCount,
    ).toBe(2);
    expect(
      result.projects.find((project) => project.id === 'project-b')
        ?.membersCount,
    ).toBe(1);
    expect(
      result.processes.find((process) => process.id === 'process-variant')
        ?.projects[0],
    ).toMatchObject({
      projectId: 'project-b',
      usage: 'variant',
      sourceResourceId: 'process-shared',
    });
  });
});
