import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
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

  const service = new ProjectResourceAccessService(
    configService as unknown as ConfigService,
    projectProcesses as unknown as Repository<ProjectProcessTypeOrmEntity>,
    projectMembers as unknown as Repository<ProjectMemberTypeOrmEntity>,
    resources as unknown as Repository<ResourceTypeOrmEntity>,
    processChangeProposals as unknown as Repository<ProcessChangeProposalTypeOrmEntity>,
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

    await expect(
      service.assertCanEditProposalResource('clone-1', {
        'x-user': 'validator-1',
        'x-groups': 'bpmn-tool-viewer-org',
      }),
    ).resolves.toBeUndefined();
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
});
