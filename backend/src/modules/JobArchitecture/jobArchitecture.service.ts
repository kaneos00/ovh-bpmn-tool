import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectMemberRole } from '../ProjectContext/infrastructure/entities/projectMember.ormEntity';
import { ProjectResourceAccessService } from '../ProjectContext/projectResourceAccess.service';
import { CompetencyBlockTypeOrmEntity } from './infrastructure/entities/competencyBlock.ormEntity';
import { CompetencyTypeOrmEntity } from './infrastructure/entities/competency.ormEntity';
import { JobFunctionCompetencyBlockTypeOrmEntity } from './infrastructure/entities/jobFunctionCompetencyBlock.ormEntity';
import { JobFunctionTypeOrmEntity } from './infrastructure/entities/jobFunction.ormEntity';
import {
  PositionBlockApplicability,
  PositionCompetencyBlockTypeOrmEntity,
} from './infrastructure/entities/positionCompetencyBlock.ormEntity';
import { ProjectJobPositionTypeOrmEntity } from './infrastructure/entities/projectJobPosition.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

@Injectable()
export class JobArchitectureService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly projectAccess: ProjectResourceAccessService,
    @InjectRepository(JobFunctionTypeOrmEntity)
    private readonly functions: Repository<JobFunctionTypeOrmEntity>,
    @InjectRepository(CompetencyBlockTypeOrmEntity)
    private readonly blocks: Repository<CompetencyBlockTypeOrmEntity>,
    @InjectRepository(CompetencyTypeOrmEntity)
    private readonly competencies: Repository<CompetencyTypeOrmEntity>,
    @InjectRepository(JobFunctionCompetencyBlockTypeOrmEntity)
    private readonly functionBlocks: Repository<JobFunctionCompetencyBlockTypeOrmEntity>,
    @InjectRepository(ProjectJobPositionTypeOrmEntity)
    private readonly positions: Repository<ProjectJobPositionTypeOrmEntity>,
    @InjectRepository(PositionCompetencyBlockTypeOrmEntity)
    private readonly positionBlocks: Repository<PositionCompetencyBlockTypeOrmEntity>,
  ) {}

  async listFunctions() {
    const [functions, links, blocks, competencies] = await Promise.all([
      this.functions.find({ where: { active: true }, order: { name: 'ASC' } }),
      this.functionBlocks.find({ order: { sortOrder: 'ASC' } }),
      this.blocks.find({ where: { active: true }, order: { sortOrder: 'ASC', code: 'ASC' } }),
      this.competencies.find({ where: { active: true }, order: { code: 'ASC' } }),
    ]);
    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const competenciesByBlock = new Map<string, CompetencyTypeOrmEntity[]>();
    for (const competency of competencies) {
      const current = competenciesByBlock.get(competency.blockId) ?? [];
      current.push(competency);
      competenciesByBlock.set(competency.blockId, current);
    }
    const linksByFunction = new Map<string, typeof links>();
    for (const link of links) {
      const current = linksByFunction.get(link.functionId) ?? [];
      current.push(link);
      linksByFunction.set(link.functionId, current);
    }
    return functions.map((jobFunction) => ({
      ...jobFunction,
      competencyBlocks: (linksByFunction.get(jobFunction.id) ?? [])
        .map((link) => blockById.get(link.blockId))
        .filter((block): block is CompetencyBlockTypeOrmEntity => Boolean(block))
        .map((block) => ({
          ...block,
          competencies: competenciesByBlock.get(block.id) ?? [],
        })),
    }));
  }

  async createFunction(
    input: { code?: string; name?: string; description?: string | null },
    headers: RequestHeaders,
  ) {
    const code = this.requiredText(input.code, 'code', 64).toUpperCase();
    const name = this.requiredText(input.name, 'name', 255);
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    try {
      return await this.functions.save(
        this.functions.create({
          code,
          name,
          description: input.description?.trim() || null,
          active: true,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A function with this code already exists');
      }
      throw error;
    }
  }

  async createBlock(
    input: { code?: string; name?: string; description?: string | null; sortOrder?: number },
    headers: RequestHeaders,
  ) {
    const code = this.requiredText(input.code, 'code', 64).toUpperCase();
    const name = this.requiredText(input.name, 'name', 255);
    const sortOrder = this.validateSortOrder(input.sortOrder);
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    try {
      return await this.blocks.save(
        this.blocks.create({
          code,
          name,
          description: input.description?.trim() || null,
          sortOrder,
          active: true,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A competency block with this code already exists');
      }
      throw error;
    }
  }

  async createCompetency(
    blockId: string,
    input: { code?: string; name?: string; description?: string | null; referenceLevel?: number | null },
    headers: RequestHeaders,
  ) {
    const block = await this.blocks.findOne({ where: { id: blockId, active: true } });
    if (!block) throw new NotFoundException('Competency block not found');
    const code = this.requiredText(input.code, 'code', 64).toUpperCase();
    const name = this.requiredText(input.name, 'name', 255);
    const referenceLevel = this.validateLevel(input.referenceLevel);
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    try {
      return await this.competencies.save(
        this.competencies.create({
          blockId,
          code,
          name,
          description: input.description?.trim() || null,
          referenceLevel,
          active: true,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A competency with this code already exists in this block');
      }
      throw error;
    }
  }

  async addBlockToFunction(functionId: string, blockId: string, headers: RequestHeaders) {
    const [jobFunction, block] = await Promise.all([
      this.functions.findOne({ where: { id: functionId, active: true } }),
      this.blocks.findOne({ where: { id: blockId, active: true } }),
    ]);
    if (!jobFunction) throw new NotFoundException('Job function not found');
    if (!block) throw new NotFoundException('Competency block not found');
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    const current = await this.functionBlocks.count({ where: { functionId } });
    try {
      return await this.functionBlocks.save(
        this.functionBlocks.create({ functionId, blockId, sortOrder: current, createdBy }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('This block is already assigned to the function');
      }
      throw error;
    }
  }

  async listProjectPositions(projectId: string, headers: RequestHeaders) {
    await this.projectAccess.assertProjectRole(projectId, headers, ProjectMemberRole.Viewer);
    const positions = await this.positions.find({ where: { projectId, active: true }, order: { title: 'ASC' } });
    if (!positions.length) return [];
    const ids = positions.map((position) => position.id);
    const [blockRows, functionRows] = await Promise.all([
      this.positionBlocks.find({ where: ids.map((positionId) => ({ positionId })) }),
      this.functions.find(),
    ]);
    const functionById = new Map(functionRows.map((item) => [item.id, item]));
    const blocksByPosition = new Map<string, PositionCompetencyBlockTypeOrmEntity[]>();
    for (const row of blockRows) {
      const current = blocksByPosition.get(row.positionId) ?? [];
      current.push(row);
      blocksByPosition.set(row.positionId, current);
    }
    return positions.map((position) => ({
      ...position,
      function: functionById.get(position.functionId) ?? null,
      competencyBlocks: blocksByPosition.get(position.id) ?? [],
    }));
  }

  async createProjectPosition(
    projectId: string,
    input: { functionId?: string; title?: string; description?: string | null },
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(projectId, headers, ProjectMemberRole.Modeler);
    const functionId = this.requiredText(input.functionId, 'functionId', 36);
    const jobFunction = await this.functions.findOne({ where: { id: functionId, active: true } });
    if (!jobFunction) throw new NotFoundException('Job function not found');
    const title = this.requiredText(input.title, 'title', 255);
    const functionLinks = await this.functionBlocks.find({ where: { functionId }, order: { sortOrder: 'ASC' } });
    return this.dataSource.transaction(async (manager) => {
      const positionRepository = manager.getRepository(ProjectJobPositionTypeOrmEntity);
      const blockRepository = manager.getRepository(PositionCompetencyBlockTypeOrmEntity);
      const position = await positionRepository.save(
        positionRepository.create({
          projectId,
          functionId,
          title,
          description: input.description?.trim() || null,
          active: true,
          createdBy: userId,
        }),
      );
      if (functionLinks.length) {
        await blockRepository.save(
          functionLinks.map((link) =>
            blockRepository.create({
              positionId: position.id,
              blockId: link.blockId,
              applicability: 'not_assessed',
              requiredLevel: null,
              createdBy: userId,
            }),
          ),
        );
      }
      return { ...position, competencyBlocks: functionLinks.map((link) => ({
        blockId: link.blockId,
        applicability: 'not_assessed' as const,
        requiredLevel: null,
      })) };
    });
  }

  async replacePositionBlocks(
    projectId: string,
    positionId: string,
    input: { blocks?: Array<{ blockId?: string; applicability?: PositionBlockApplicability; requiredLevel?: number | null }> },
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(projectId, headers, ProjectMemberRole.Modeler);
    const position = await this.positions.findOne({ where: { id: positionId, projectId, active: true } });
    if (!position) throw new NotFoundException('Project job position not found');
    if (!Array.isArray(input.blocks)) throw new BadRequestException('blocks must be an array');

    const functionLinks = await this.functionBlocks.find({ where: { functionId: position.functionId } });
    const allowedBlockIds = new Set(functionLinks.map((link) => link.blockId));
    const seen = new Set<string>();
    const normalized = input.blocks.map((item, index) => {
      const blockId = this.requiredText(item.blockId, `blocks[${index}].blockId`, 36);
      if (!allowedBlockIds.has(blockId)) {
        throw new BadRequestException(`Block ${blockId} is not part of the selected function`);
      }
      if (seen.has(blockId)) throw new BadRequestException(`Block ${blockId} is duplicated`);
      seen.add(blockId);
      const applicability = item.applicability;
      if (!['required', 'optional', 'not_applicable', 'not_assessed'].includes(applicability ?? '')) {
        throw new BadRequestException(`blocks[${index}].applicability is invalid`);
      }
      return {
        positionId,
        blockId,
        applicability: applicability as PositionBlockApplicability,
        requiredLevel: this.validateLevel(item.requiredLevel),
        createdBy: userId,
      };
    });
    const byBlockId = new Map(normalized.map((item) => [item.blockId, item]));
    const rows = functionLinks.map((link) => byBlockId.get(link.blockId) ?? ({
      positionId,
      blockId: link.blockId,
      applicability: 'not_assessed' as const,
      requiredLevel: null,
      createdBy: userId,
    }));

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PositionCompetencyBlockTypeOrmEntity);
      await repository.delete({ positionId });
      return repository.save(repository.create(rows));
    });
  }

  private requiredText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(`${field} must be ${maxLength} characters or fewer`);
    }
    return normalized;
  }

  private validateLevel(value: number | null | undefined): number | null {
    if (value === undefined || value === null) return null;
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new BadRequestException('Competency levels must be integers from 1 to 5');
    }
    return value;
  }

  private validateSortOrder(value: number | undefined): number {
    if (value === undefined) return 0;
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new BadRequestException('sortOrder must be an integer between 0 and 10000');
    }
    return value;
  }
}
