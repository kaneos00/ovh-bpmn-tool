import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProjectProcessUsage } from './infrastructure/entities/projectProcess.ormEntity';
import { ProjectMemberRole } from './infrastructure/entities/projectMember.ormEntity';
import { ProjectResourceAccessService } from './projectResourceAccess.service';

describe('ProjectResourceAccessService', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) =>
      key === 'userGroupsHeader' ? 'x-user-groups' : 'x-user',
    ),
  };
  const projectProcesses = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const projectMembers = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const resources = {
    find: jest.fn(),
  };
  let service: ProjectResourceAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectResourceAccessService(
      configService as never,
      projectProcesses as never,
      projectMembers as never,
      resources as never,
    );
    projectProcesses.find.mockResolvedValue([]);
    projectProcesses.count.mockResolvedValue(0);
    projectMembers.find.mockResolvedValue([]);
    resources.find.mockResolvedValue([]);
  });

  const headers = { 'x-user': 'alice' };

  it('enforces the shared Viewer, Modeler and Admin role hierarchy', async () => {
    projectMembers.findOne.mockResolvedValue({
      projectId: 'project-1',
      userId: 'alice',
      role: ProjectMemberRole.Modeler,
    });

    await expect(
      service.assertProjectRole('project-1', headers, ProjectMemberRole.Viewer),
    ).resolves.toBe('alice');
    await expect(
      service.assertProjectRole(
        'project-1',
        headers,
        ProjectMemberRole.Modeler,
      ),
    ).resolves.toBe('alice');
    await expect(
      service.assertProjectRole('project-1', headers, ProjectMemberRole.Admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applies consistent organization admin and read-write group checks', () => {
    const organizationAdminHeaders = {
      'x-user-groups': 'bpmn-tool-admin-global',
    };
    const organizationModelerHeaders = {
      'x-user-groups': 'bpmn-tool-readwrite-global',
    };

    expect(service.hasOrganizationAdminRole(organizationAdminHeaders)).toBe(
      true,
    );
    expect(
      service.hasOrganizationReadWriteRole(organizationAdminHeaders),
    ).toBe(false);
    expect(
      service.hasOrganizationAdminRole(organizationModelerHeaders),
    ).toBe(false);
    expect(
      service.hasOrganizationReadWriteRole(organizationModelerHeaders),
    ).toBe(true);
    expect(service.hasOrganizationAdminRole({})).toBe(false);
  });

  it('rejects project access when the authenticated identity is missing', async () => {
    await expect(
      service.assertProjectRole('project-1', {}, ProjectMemberRole.Viewer),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

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

  it('denies a viewer from editing a project-specific process', async () => {
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
        role: ProjectMemberRole.Viewer,
      },
    ]);

    await expect(
      service.assertCanEditResource('resource-1', headers),
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

  it('allows an organization admin to edit a common process only when explicitly enabled', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.Common,
      },
    ]);

    await expect(
      service.assertCanEditResource(
        'resource-1',
        {
          ...headers,
          'x-user-groups': 'bpmn-tool-admin-global',
        },
        { allowCommonForOrganizationAdmin: true },
      ),
    ).resolves.toBeUndefined();
  });

  it('does not allow a modeler group to bypass the common-process guard', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'resource-1',
        usage: ProjectProcessUsage.Common,
      },
    ]);

    await expect(
      service.assertCanEditResource(
        'resource-1',
        {
          ...headers,
          'x-user-groups': 'bpmn-tool-readwrite-global',
        },
        { allowCommonForOrganizationAdmin: true },
      ),
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

  it('blocks deletion of a source process while variants depend on it', async () => {
    projectProcesses.count.mockResolvedValue(1);

    await expect(
      service.assertCanDeleteResource('source-process'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deletion of a common process through generic resource endpoints', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'common-process',
        usage: ProjectProcessUsage.Common,
      },
    ]);

    await expect(
      service.assertCanDeleteResource('common-process'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks deletion of a process shared by multiple projects', async () => {
    projectProcesses.find.mockResolvedValue([
      {
        projectId: 'project-1',
        resourceId: 'shared-process',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
      {
        projectId: 'project-2',
        resourceId: 'shared-process',
        usage: ProjectProcessUsage.ProjectSpecific,
      },
    ]);

    await expect(
      service.assertCanDeleteResource('shared-process'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks descendants before deleting a folder tree', async () => {
    resources.find
      .mockResolvedValueOnce([{ id: 'child-process', parentId: 'folder' }])
      .mockResolvedValueOnce([]);
    projectProcesses.find.mockImplementation(({ where }) =>
      where.resourceId === 'child-process'
        ? [
            {
              projectId: 'project-1',
              resourceId: 'child-process',
              usage: ProjectProcessUsage.Common,
            },
          ]
        : [],
    );

    await expect(
      service.assertCanDeleteResourceTree('folder', headers),
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
