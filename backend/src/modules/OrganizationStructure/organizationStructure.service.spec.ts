import { BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JobFunctionTypeOrmEntity } from '../JobArchitecture/infrastructure/entities/jobFunction.ormEntity';
import { OrganizationPositionTypeOrmEntity } from './infrastructure/entities/organizationPosition.ormEntity';
import { OrganizationStructureService } from './organizationStructure.service';

describe('OrganizationStructureService', () => {
  const positions = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const functions = { findOne: jest.fn() };
  const projectAccess = { getAuthenticatedUserId: jest.fn(() => 'admin-1') };

  const service = new OrganizationStructureService(
    positions as unknown as Repository<OrganizationPositionTypeOrmEntity>,
    functions as unknown as Repository<JobFunctionTypeOrmEntity>,
    projectAccess as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects a self-reporting position', async () => {
    positions.findOne.mockResolvedValue({
      id: 'position-1',
      parentPositionId: null,
    });
    await expect(
      service.updatePosition('position-1', {
        parentPositionId: 'position-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a reporting line that would create a cycle', async () => {
    positions.findOne.mockResolvedValue({
      id: 'position-1',
      parentPositionId: null,
    });
    positions.find.mockResolvedValue([
      { id: 'position-1', parentPositionId: null },
      { id: 'position-2', parentPositionId: 'position-1' },
    ]);
    await expect(
      service.updatePosition('position-1', {
        parentPositionId: 'position-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents deactivating a position while it has active children', async () => {
    positions.findOne.mockResolvedValue({ id: 'position-1', active: true });
    positions.count.mockResolvedValue(1);
    await expect(
      service.setPositionActive('position-1', false),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(positions.save).not.toHaveBeenCalled();
  });

  it('does not accept an inactive function as the position reference', async () => {
    functions.findOne.mockResolvedValue(null);
    await expect(
      service.createPosition(
        { title: 'Direction', functionId: 'function-1' },
        { 'x-user': 'admin-1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
