import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ResourceTypeOrmEntity } from '../ResourceContext/infrastructure/entities/resource.ormEntity';
import {
  ProcessChangeProposalStatus,
  ProcessChangeProposalTypeOrmEntity,
} from './infrastructure/entities/processChangeProposal.ormEntity';
import {
  ProjectMemberRole,
  ProjectMemberTypeOrmEntity,
} from './infrastructure/entities/projectMember.ormEntity';
import {
  ProjectProcessTypeOrmEntity,
  ProjectProcessUsage,
} from './infrastructure/entities/projectProcess.ormEntity';
import { ProjectResourceAccessService } from './projectResourceAccess.service';

describe('ProjectResourceAccessService proposal editing', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) =>
      key === 'userHeader' ? 'x-user' : 'x-groups',
    ),
  };
  const projectProcesses = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };
  const projectMembers = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const resources = {
    find: jest.fn(),
  };
  const processChangeProposals = {
    findOne: jest.fn(),
  };
  const dataSource = {
    query: jest.fn(),
  };

  const service = new ProjectResourceAccessService(
    configService as unknown as ConfigService,
    projectProcesses as unknown as Repository<ProjectProcessTypeOrmEntity>,
    projectMembers as unknown as Repository<ProjectMemberTypeOrmEntity>,
    resources as unknown as Repository<ResourceTypeOrmEntity>,
    processChangeProposals as unknown as Repository<ProcessChangeProposalTypeOrmEntity>,
    dataSource as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the assigned validator to edit a project-specific proposal workspace', async () => {
    processChangeProposals.findOne.mockResolvedValue({
      projectId: 'project-1',
      sourceResourceId: 'source-1',
      cloneResourceId: 'clone-1',
      validatorUserId: 'validator-1',
      status: ProcessChangeProposalStatus.Submitted,
    });
    projectMembers.findOne.mockResolvedValue({
      role: ProjectMemberRole.Viewer,
    });
    projectProcesses.findOne.mockResolvedValue({
      usage: ProjectProcessUsage.ProjectSpecific,
    });
    dataSource.query.mockResolvedValue([{ id: 'validator-1' }]);

    await expect(
      service.assertCanEditProposalResource('clone-1', {
        'x-user': 'validator-1',
        'x-groups': 'bpmn-tool-viewer-org',
      }),
    ).resolves.toBeUndefined();
  });

  it('blocks an assigned validator after project membership is removed', async () => {
    processChangeProposals.findOne.mockResolvedValue({
      projectId: 'project-1',
      sourceResourceId: 'source-1',
      cloneResourceId: 'clone-1',
      validatorUserId: 'validator-1',
      status: ProcessChangeProposalStatus.Submitted,
    });
    projectMembers.findOne.mockResolvedValue(null);
    projectProcesses.findOne.mockResolvedValue({
      usage: ProjectProcessUsage.ProjectSpecific,
    });
    dataSource.query.mockResolvedValue([{ id: 'validator-1' }]);

    await expect(
      service.assertCanEditProposalResource('clone-1', {
        'x-user': 'validator-1',
        'x-groups': 'bpmn-tool-viewer-org',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks editing an approved proposal snapshot, including for organization administrators', async () => {
    processChangeProposals.findOne.mockResolvedValue({
      projectId: 'project-1',
      sourceResourceId: 'source-1',
      cloneResourceId: 'clone-1',
      validatorUserId: 'validator-1',
      status: ProcessChangeProposalStatus.Approved,
    });

    await expect(
      service.assertCanEditProposalResource('clone-1', {
        'x-user': 'admin-1',
        'x-groups': 'bpmn-tool-admin-org',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks generic deletion of proposal workspace contents', async () => {
    processChangeProposals.findOne.mockResolvedValue({
      projectId: 'project-1',
      cloneResourceId: 'clone-1',
      status: ProcessChangeProposalStatus.Submitted,
    });

    await expect(
      service.assertCanDeleteProposalResource('clone-1', {
        'x-user': 'admin-1',
        'x-groups': 'bpmn-tool-admin-org',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires project administrator access for common-process proposal workspaces', async () => {
    processChangeProposals.findOne.mockResolvedValue({
      projectId: 'project-1',
      sourceResourceId: 'source-1',
      cloneResourceId: 'clone-1',
      validatorUserId: null,
      status: ProcessChangeProposalStatus.Submitted,
    });
    projectMembers.findOne.mockResolvedValue({
      role: ProjectMemberRole.Modeler,
    });
    projectProcesses.findOne.mockResolvedValue({
      usage: ProjectProcessUsage.Common,
    });

    await expect(
      service.assertCanEditProposalResource('clone-1', {
        'x-user': 'modeler-1',
        'x-groups': 'bpmn-tool-viewer-org',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps the organization write requirement for non-proposal resources', async () => {
    processChangeProposals.findOne.mockResolvedValue(null);

    await expect(
      service.assertCanEditProposalResource('ordinary-resource', {
        'x-user': 'viewer-1',
        'x-groups': 'bpmn-tool-viewer-org',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectProcesses.find).not.toHaveBeenCalled();
  });

  it('allows deleting a source when all dependent variants are in the same deleted tree', async () => {
    projectProcesses.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ resourceId: 'variant-1' }]);

    await expect(
      service.assertCanDeleteResource(
        'source-1',
        new Set(['folder-1', 'source-1', 'variant-1']),
      ),
    ).resolves.toBeUndefined();
  });

  it('refuses deleting a source while a dependent variant survives outside the deleted tree', async () => {
    projectProcesses.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ resourceId: 'variant-1' }]);

    await expect(
      service.assertCanDeleteResource('source-1', new Set(['folder-1', 'source-1'])),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not block folder deletion for common or multi-project child processes that will be preserved', async () => {
    resources.find
      .mockResolvedValueOnce([
        { id: 'shared-child', parentId: 'folder-1' },
        { id: 'common-child', parentId: 'folder-1' },
      ])
      .mockResolvedValueOnce([]);
    projectProcesses.find
      .mockResolvedValueOnce([
        {
          resourceId: 'shared-child',
          projectId: 'project-1',
          usage: ProjectProcessUsage.ProjectSpecific,
        },
        {
          resourceId: 'shared-child',
          projectId: 'project-2',
          usage: ProjectProcessUsage.ProjectSpecific,
        },
        {
          resourceId: 'common-child',
          projectId: 'project-1',
          usage: ProjectProcessUsage.Common,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await expect(
      service.assertCanDeleteResourceTree('folder-1', {
        'x-user': 'admin-1',
        'x-groups': 'bpmn-tool-admin-org',
      }),
    ).resolves.toBeUndefined();

    expect(projectProcesses.find).toHaveBeenCalledTimes(4);
    expect(projectProcesses.find).toHaveBeenCalledWith({
      where: { resourceId: 'folder-1' },
    });
  });
});
