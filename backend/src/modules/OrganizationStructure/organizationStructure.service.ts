import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectResourceAccessService } from '../ProjectContext/projectResourceAccess.service';
import { JobFunctionTypeOrmEntity } from '../JobArchitecture/infrastructure/entities/jobFunction.ormEntity';
import { OrganizationPositionTypeOrmEntity } from './infrastructure/entities/organizationPosition.ormEntity';

type RequestHeaders = Record<string, string | undefined>;
type PositionInput = {
  title?: string;
  description?: string | null;
  functionId?: string | null;
  parentPositionId?: string | null;
  sortOrder?: number;
};
type PositionNode = OrganizationPositionTypeOrmEntity & {
  children: PositionNode[];
};

@Injectable()
export class OrganizationStructureService {
  constructor(
    @InjectRepository(OrganizationPositionTypeOrmEntity)
    private readonly positions: Repository<OrganizationPositionTypeOrmEntity>,
    @InjectRepository(JobFunctionTypeOrmEntity)
    private readonly functions: Repository<JobFunctionTypeOrmEntity>,
    private readonly projectAccess: ProjectResourceAccessService,
  ) {}

  async listPositions(includeInactive = false) {
    const rows = await this.positions.find({
      where: includeInactive ? {} : { active: true },
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
    return rows;
  }

  async getTree(includeInactive = false) {
    const rows = await this.listPositions(includeInactive);
    const byId = new Map<string, PositionNode>();
    rows.forEach((row) => byId.set(row.id, { ...row, children: [] }));
    const roots: PositionNode[] = [];
    byId.forEach((node) => {
      const parent = node.parentPositionId
        ? byId.get(node.parentPositionId)
        : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  async createPosition(input: PositionInput, headers: RequestHeaders) {
    const title = this.requiredText(input.title, 'title', 255);
    const parentPositionId = input.parentPositionId || null;
    if (parentPositionId) await this.assertParentExists(parentPositionId);
    const functionId = await this.validateFunction(input.functionId);
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    const entity = this.positions.create({
      title,
      description: input.description?.trim() || null,
      functionId,
      parentPositionId,
      sortOrder: this.validateSortOrder(input.sortOrder),
      active: true,
      createdBy,
    });
    return this.positions.save(entity);
  }

  async updatePosition(id: string, input: PositionInput) {
    const position = await this.positions.findOne({ where: { id } });
    if (!position) throw new NotFoundException('Organization position not found');
    if (input.title !== undefined) {
      position.title = this.requiredText(input.title, 'title', 255);
    }
    if (input.description !== undefined) {
      position.description = input.description?.trim() || null;
    }
    if (input.functionId !== undefined) {
      position.functionId = await this.validateFunction(input.functionId);
    }
    if (input.sortOrder !== undefined) {
      position.sortOrder = this.validateSortOrder(input.sortOrder);
    }
    if (input.parentPositionId !== undefined) {
      const parentId = input.parentPositionId || null;
      if (parentId === id) {
        throw new BadRequestException('A position cannot report to itself');
      }
      if (parentId) await this.assertParentExists(parentId);
      if (parentId && (await this.wouldCreateCycle(id, parentId))) {
        throw new ConflictException(
          'This reporting line would create an organization cycle',
        );
      }
      position.parentPositionId = parentId;
    }
    return this.positions.save(position);
  }

  async setPositionActive(id: string, active: boolean) {
    const position = await this.positions.findOne({ where: { id } });
    if (!position) throw new NotFoundException('Organization position not found');
    if (!active) {
      const activeChildren = await this.positions.count({
        where: { parentPositionId: id, active: true },
      });
      if (activeChildren > 0) {
        throw new ConflictException(
          'Move or deactivate active child positions before deactivating this position',
        );
      }
    } else if (position.parentPositionId) {
      await this.assertParentExists(position.parentPositionId);
      const parent = await this.positions.findOne({
        where: { id: position.parentPositionId },
      });
      if (parent && !parent.active) {
        throw new ConflictException(
          'An inactive parent position must be reactivated first',
        );
      }
    }
    position.active = active;
    return this.positions.save(position);
  }

  private async assertParentExists(id: string) {
    const parent = await this.positions.findOne({ where: { id } });
    if (!parent) throw new NotFoundException('Parent organization position not found');
    if (!parent.active) {
      throw new ConflictException('An inactive position cannot be selected as parent');
    }
  }

  private async validateFunction(id?: string | null): Promise<string | null> {
    if (!id) return null;
    const jobFunction = await this.functions.findOne({ where: { id, active: true } });
    if (!jobFunction) {
      throw new BadRequestException(
        'The selected job function does not exist or is inactive',
      );
    }
    return id;
  }

  private async wouldCreateCycle(positionId: string, proposedParentId: string) {
    const rows = await this.positions.find({
      select: ['id', 'parentPositionId'],
    });
    const parents = new Map(rows.map((row) => [row.id, row.parentPositionId]));
    let cursor: string | null = proposedParentId;
    const visited = new Set<string>();
    while (cursor) {
      if (cursor === positionId) return true;
      if (visited.has(cursor)) return true;
      visited.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
    return false;
  }

  private requiredText(value: unknown, field: string, maxLength: number) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${field} must contain at most ${maxLength} characters`,
      );
    }
    return normalized;
  }

  private validateSortOrder(value?: number) {
    if (value === undefined) return 0;
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('sortOrder must be a non-negative integer');
    }
    return value;
  }
}
