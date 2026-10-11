import { ForbiddenException } from '@nestjs/common';
import { ProjectProcessUsage } from './infrastructure/entities/projectProcess.ormEntity';
import { ProjectMemberRole } from './infrastructure/entities/projectMember.ormEntity';
import { ProjectResourceAccessService } from './projectResourceAccess.service';

describe('ProjectResourceAccessService', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('x-user'),
  };
  const projectProcesses = {
    find: jest.fn(),
  };
  const projectMembers = {
    find: jest.fn(),
  };
  let service: ProjectResourceAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectResourceAccessService(
      configService as never,
      projectProcesses as never,
      projectMembers as never,
    );
    projectProcesses.find.mockResolvedValue([]);
    projectMembers.find.mockResolvedValue([]);
  });

  const headers = { 'x-user': 'alice' };

  it('allows reading a resource that is not linked to a project', async () => {
    await expect(
      service.assertCanReadResource('resource-1', headers),
    ).resolves.toBeUndefined();
  });

  it('allows everyone to read a common process', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.Common,
      },
    ]);

    await expect(
      service.assertCanReadResource('resource-1', headers),
    ).resolves.toBeUndefined();
  });

  it('denies reading a project-specific process to a non-member', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
    ]);

    await expect(
      service.assertCanReadResource('resource-1', headers),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies editing a common process through generic endpoints', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.Common,
      },
    ]);

    await expect(
      service.assertCanEditResource('resource-1', headers),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a modeler to edit a project-specific process', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
    ]);
    projectMembers.find.mockResolvedValue([
      {
        projectId: 'project-1',
        userId: 'alice',
        role: ProjectMemberRole.Modeler,
      },
    ]);

    await expect(
      service.assertCanEditResource('resource-1', headers),
    ).resolves.toBeUndefined();
  });

  it('denies reading a process linked only to another project', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-2',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
    ]);
    projectMembers.find.mockResolvedValue([]);

    await expect(
      service.assertCanReadResource('resource-1', headers),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires edit access in every project that shares a process', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
      {
        projectId: 'project-2',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
    ]);
    projectMembers.find.mockResolvedValue([
      {
        projectId: 'project-1',
        userId: 'alice',
        role: ProjectMemberRole.Modeler,
      },
    ]);

    await expect(
      service.assertCanEditResource('resource-1', headers),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters project resources using the domain UUID value', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'private-resource',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
    ]);
    projectMembers.find.mockResolvedValue([]);

    const resources = [
      { id: { value: 'private-resource' }, name: 'Private' },
      { id: { value: 'legacy-resource' }, name: 'Legacy' },
    ];

    await expect(
      service.filterReadableResources(resources, headers),
    ).resolves.toEqual([{ id: { value: 'legacy-resource' }, name: 'Legacy' }]);
  });
});
