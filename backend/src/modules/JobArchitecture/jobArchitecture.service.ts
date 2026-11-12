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
import { ProjectProcessTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectProcess.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciActor.ormEntity';
import { ProjectRaciEntryTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { CompetencyBlockTypeOrmEntity } from './infrastructure/entities/competencyBlock.ormEntity';
import { CompetencyTypeOrmEntity } from './infrastructure/entities/competency.ormEntity';
import { JobFunctionCompetencyBlockTypeOrmEntity } from './infrastructure/entities/jobFunctionCompetencyBlock.ormEntity';
import { JobFunctionTypeOrmEntity } from './infrastructure/entities/jobFunction.ormEntity';
import {
  PositionBlockApplicability,
  PositionCompetencyBlockTypeOrmEntity,
} from './infrastructure/entities/positionCompetencyBlock.ormEntity';
import { ProjectJobPositionTypeOrmEntity } from './infrastructure/entities/projectJobPosition.ormEntity';
import { PositionRaciActorMappingTypeOrmEntity } from './infrastructure/entities/positionRaciActorMapping.ormEntity';
import { PositionCompetencyRequirementTypeOrmEntity } from './infrastructure/entities/positionCompetencyRequirement.ormEntity';
import { PositionActivityMappingTypeOrmEntity } from './infrastructure/entities/positionActivityMapping.ormEntity';
import { ContentTypeOrmEntity } from '../ResourceContext/infrastructure/entities/content.ormEntity';
import { ContentStatusEnum } from '../ResourceContext/shared/types/Content';
import { extractBpmnActivityIds } from './infrastructure/bpmnActivityIds';

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
    @InjectRepository(ProjectRaciActorTypeOrmEntity)
    private readonly raciActors: Repository<ProjectRaciActorTypeOrmEntity>,
    @InjectRepository(ProjectRaciEntryTypeOrmEntity)
    private readonly raciEntries: Repository<ProjectRaciEntryTypeOrmEntity>,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(PositionRaciActorMappingTypeOrmEntity)
    private readonly raciMappings: Repository<PositionRaciActorMappingTypeOrmEntity>,
    @InjectRepository(PositionActivityMappingTypeOrmEntity)
    private readonly activityMappings: Repository<PositionActivityMappingTypeOrmEntity>,
    @InjectRepository(ContentTypeOrmEntity)
    private readonly contents: Repository<ContentTypeOrmEntity>,
    @InjectRepository(PositionCompetencyRequirementTypeOrmEntity)
    private readonly competencyRequirements: Repository<PositionCompetencyRequirementTypeOrmEntity>,
  ) {}

  async listFunctions() {
    const [functions, links, blocks, competencies] = await Promise.all([
      this.functions.find({
        where: { active: true },
        order: { name: 'ASC' },
      }),
      this.functionBlocks.find({ order: { sortOrder: 'ASC' } }),
      this.blocks.find({
        where: { active: true },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
      this.competencies.find({
        where: { active: true },
        order: { code: 'ASC' },
      }),
    ]);

    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const competenciesByBlock = new Map<string, CompetencyTypeOrmEntity[]>();
    for (const competency of competencies) {
      const current = competenciesByBlock.get(competency.blockId) ?? [];
      current.push(competency);
      competenciesByBlock.set(competency.blockId, current);
    }

    const linksByFunction = new Map<
      string,
      JobFunctionCompetencyBlockTypeOrmEntity[]
    >();
    for (const link of links) {
      const current = linksByFunction.get(link.functionId) ?? [];
      current.push(link);
      linksByFunction.set(link.functionId, current);
    }

    return functions.map((jobFunction) => ({
      ...jobFunction,
      competencyBlocks: (linksByFunction.get(jobFunction.id) ?? [])
        .map((link) => blockById.get(link.blockId))
        .filter((block): block is CompetencyBlockTypeOrmEntity =>
          Boolean(block),
        )
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
    input: {
      code?: string;
      name?: string;
      description?: string | null;
      sortOrder?: number;
    },
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
        throw new ConflictException(
          'A competency block with this code already exists',
        );
      }
      throw error;
    }
  }

  async createCompetency(
    blockId: string,
    input: {
      code?: string;
      name?: string;
      description?: string | null;
      referenceLevel?: number | null;
      category?: 'technical' | 'methodological' | 'behavioral';
    },
    headers: RequestHeaders,
  ) {
    const block = await this.blocks.findOne({
      where: { id: blockId, active: true },
    });
    if (!block) throw new NotFoundException('Competency block not found');

    const code = this.requiredText(input.code, 'code', 64).toUpperCase();
    const name = this.requiredText(input.name, 'name', 255);
    const referenceLevel = this.validateLevel(input.referenceLevel);
    const category = input.category ?? 'technical';
    if (!['technical', 'methodological', 'behavioral'].includes(category)) {
      throw new BadRequestException('Competency category is invalid');
    }
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);

    try {
      return await this.competencies.save(
        this.competencies.create({
          blockId,
          code,
          name,
          description: input.description?.trim() || null,
          referenceLevel,
          category,
          active: true,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'A competency with this code already exists in this block',
        );
      }
      throw error;
    }
  }

  async addBlockToFunction(
    functionId: string,
    blockId: string,
    headers: RequestHeaders,
  ) {
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
        this.functionBlocks.create({
          functionId,
          blockId,
          sortOrder: current,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'This block is already assigned to the function',
        );
      }
      throw error;
    }
  }

  async listProjectPositions(projectId: string, headers: RequestHeaders) {
    await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );
    const positions = await this.positions.find({
      where: { projectId, active: true },
      order: { title: 'ASC' },
    });
    if (!positions.length) return [];

    const ids = positions.map((position) => position.id);
    const [blockRows, functionRows] = await Promise.all([
      this.positionBlocks.find({
        where: ids.map((positionId) => ({ positionId })),
      }),
      this.functions.find(),
    ]);

    const functionById = new Map(functionRows.map((item) => [item.id, item]));
    const blocksByPosition = new Map<
      string,
      PositionCompetencyBlockTypeOrmEntity[]
    >();
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
    input: {
      functionId?: string;
      title?: string;
      description?: string | null;
    },
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const functionId = this.requiredText(input.functionId, 'functionId', 36);
    const jobFunction = await this.functions.findOne({
      where: { id: functionId, active: true },
    });
    if (!jobFunction) throw new NotFoundException('Job function not found');

    const title = this.requiredText(input.title, 'title', 255);
    const functionLinks = await this.functionBlocks.find({
      where: { functionId },
      order: { sortOrder: 'ASC' },
    });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const positionRepository = manager.getRepository(
          ProjectJobPositionTypeOrmEntity,
        );
        const blockRepository = manager.getRepository(
          PositionCompetencyBlockTypeOrmEntity,
        );
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

        return {
          ...position,
          competencyBlocks: functionLinks.map((link) => ({
            blockId: link.blockId,
            applicability: 'not_assessed' as const,
            requiredLevel: null,
          })),
        };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'A position with this title already exists in the project',
        );
      }
      throw error;
    }
  }

  async replacePositionBlocks(
    projectId: string,
    positionId: string,
    input: {
      blocks?: Array<{
        blockId?: string;
        applicability?: PositionBlockApplicability;
        requiredLevel?: number | null;
      }>;
    },
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const position = await this.positions.findOne({
      where: { id: positionId, projectId, active: true },
    });
    if (!position) {
      throw new NotFoundException('Project job position not found');
    }
    if (!Array.isArray(input.blocks)) {
      throw new BadRequestException('blocks must be an array');
    }

    const functionLinks = await this.functionBlocks.find({
      where: { functionId: position.functionId },
    });
    const allowedBlockIds = new Set(functionLinks.map((link) => link.blockId));
    const seen = new Set<string>();

    const normalized = input.blocks.map((item, index) => {
      const blockId = this.requiredText(
        item.blockId,
        `blocks[${index}].blockId`,
        36,
      );
      if (!allowedBlockIds.has(blockId)) {
        throw new BadRequestException(
          `Block ${blockId} is not part of the selected function`,
        );
      }
      if (seen.has(blockId)) {
        throw new BadRequestException(`Block ${blockId} is duplicated`);
      }
      seen.add(blockId);

      const applicability = item.applicability;
      if (
        !['required', 'optional', 'not_applicable', 'not_assessed'].includes(
          applicability ?? '',
        )
      ) {
        throw new BadRequestException(
          `blocks[${index}].applicability is invalid`,
        );
      }

      const requiredLevel = this.validateLevel(item.requiredLevel);
      if (
        (applicability === 'not_applicable' ||
          applicability === 'not_assessed') &&
        requiredLevel !== null
      ) {
        throw new BadRequestException(
          'A non-applicable or unassessed block cannot have a required level',
        );
      }

      return {
        positionId,
        blockId,
        applicability: applicability as PositionBlockApplicability,
        requiredLevel,
        createdBy: userId,
      };
    });

    const excludedBlockIds = normalized
      .filter((item) =>
        ['not_applicable', 'not_assessed'].includes(item.applicability),
      )
      .map((item) => item.blockId);
    if (excludedBlockIds.length) {
      const linkedActivities = await this.activityMappings.find({
        where: excludedBlockIds.map((blockId) => ({ positionId, blockId })),
      });
      if (linkedActivities.length) {
        throw new BadRequestException(
          'Remove activity mappings before marking their competency block as non-applicable or not assessed',
        );
      }
    }

    const byBlockId = new Map(normalized.map((item) => [item.blockId, item]));
    const rows = functionLinks.map(
      (link) =>
        byBlockId.get(link.blockId) ?? {
          positionId,
          blockId: link.blockId,
          applicability: 'not_assessed' as const,
          requiredLevel: null,
          createdBy: userId,
        },
    );

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(
        PositionCompetencyBlockTypeOrmEntity,
      );
      const existingRows = await repository.find({ where: { positionId } });
      const existingByBlockId = new Map(
        existingRows.map((row) => [row.blockId, row]),
      );
      const rowsToSave = rows.map((row) => {
        const existing = existingByBlockId.get(row.blockId);
        return existing
          ? repository.merge(existing, {
              applicability: row.applicability,
              requiredLevel: row.requiredLevel,
            })
          : repository.create(row);
      });
      return repository.save(rowsToSave);
    });
  }

  async getPositionCompetencyRequirements(
    projectId: string,
    positionId: string,
    headers: RequestHeaders,
  ) {
    await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );
    const position = await this.positions.findOne({
      where: { id: positionId, projectId, active: true },
    });
    if (!position) {
      throw new NotFoundException('Project job position not found');
    }

    const positionBlocks = await this.positionBlocks.find({
      where: { positionId },
    });
    if (!positionBlocks.length) return [];
    const blockIds = positionBlocks.map((block) => block.blockId);
    const [competencies, overrides] = await Promise.all([
      this.competencies.find({
        where: blockIds.map((blockId) => ({ blockId, active: true })),
        order: { code: 'ASC' },
      }),
      this.competencyRequirements.find({ where: { positionId } }),
    ]);
    const blockById = new Map(
      positionBlocks.map((block) => [block.blockId, block]),
    );
    const overrideByCompetencyId = new Map(
      overrides.map((override) => [override.competencyId, override]),
    );

    return competencies.map((competency) => {
      const block = blockById.get(competency.blockId);
      const override = overrideByCompetencyId.get(competency.id);
      const isApplicable =
        block !== undefined &&
        ['required', 'optional'].includes(block.applicability);
      const requiredLevel = isApplicable
        ? (override?.requiredLevel ??
          block.requiredLevel ??
          competency.referenceLevel)
        : null;
      const levelSource =
        override?.requiredLevel != null
          ? 'position'
          : block?.requiredLevel != null
            ? 'block'
            : 'function';

      return {
        ...competency,
        applicability: block?.applicability ?? 'not_assessed',
        blockRequiredLevel: block?.requiredLevel ?? null,
        competencyLevelOverride: override?.requiredLevel ?? null,
        requiredLevel,
        levelSource: isApplicable ? levelSource : 'not_applicable',
      };
    });
  }

  async updatePositionCompetencyRequirements(
    projectId: string,
    positionId: string,
    input: {
      competencies?: Array<{
        competencyId?: string;
        requiredLevel?: number | null;
      }>;
    },
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const position = await this.positions.findOne({
      where: { id: positionId, projectId, active: true },
    });
    if (!position) {
      throw new NotFoundException('Project job position not found');
    }
    if (!Array.isArray(input.competencies)) {
      throw new BadRequestException('competencies must be an array');
    }

    const positionBlocks = await this.positionBlocks.find({
      where: { positionId },
    });
    const blockById = new Map(
      positionBlocks.map((block) => [block.blockId, block]),
    );
    const seen = new Set<string>();
    const normalized = input.competencies.map((item, index) => {
      const competencyId = this.requiredText(
        item.competencyId,
        `competencies[${index}].competencyId`,
        36,
      );
      if (seen.has(competencyId)) {
        throw new BadRequestException(
          `Competency ${competencyId} is duplicated`,
        );
      }
      seen.add(competencyId);
      return {
        competencyId,
        requiredLevel: this.validateLevel(item.requiredLevel),
      };
    });

    const competencyRows = normalized.length
      ? await this.competencies.find({
          where: normalized.map((item) => ({
            id: item.competencyId,
            active: true,
          })),
        })
      : [];
    const competencyById = new Map(
      competencyRows.map((competency) => [competency.id, competency]),
    );
    const validated = normalized.map((item) => {
      const competency = competencyById.get(item.competencyId);
      if (!competency) {
        throw new NotFoundException(
          `Active competency ${item.competencyId} not found`,
        );
      }
      const block = blockById.get(competency.blockId);
      if (!block || !['required', 'optional'].includes(block.applicability)) {
        throw new BadRequestException(
          'Competency overrides require a required or optional position block',
        );
      }
      return {
        competencyId: competency.id,
        blockId: competency.blockId,
        requiredLevel: item.requiredLevel,
      };
    });

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(
        PositionCompetencyRequirementTypeOrmEntity,
      );
      const existingRows = await repository.find({ where: { positionId } });
      const existingByCompetencyId = new Map(
        existingRows.map((row) => [row.competencyId, row]),
      );
      const rowsToSave = validated
        .filter((item) => item.requiredLevel !== null)
        .map((item) => {
          const existing = existingByCompetencyId.get(item.competencyId);
          return existing
            ? repository.merge(existing, {
                requiredLevel: item.requiredLevel,
                createdBy: userId,
              })
            : repository.create({
                positionId,
                blockId: item.blockId,
                competencyId: item.competencyId,
                requiredLevel: item.requiredLevel,
                createdBy: userId,
              });
        });
      const inheritedCompetencyIds = validated
        .filter((item) => item.requiredLevel === null)
        .map((item) => item.competencyId);
      if (inheritedCompetencyIds.length) {
        await repository.delete(
          inheritedCompetencyIds.map((competencyId) => ({
            positionId,
            competencyId,
          })),
        );
      }
      return rowsToSave.length ? repository.save(rowsToSave) : [];
    });
  }

  async listPositionMappings(
    projectId: string,
    positionId: string,
    headers: RequestHeaders,
  ) {
    await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );
    const position = await this.positions.findOne({
      where: { id: positionId, projectId, active: true },
    });
    if (!position) {
      throw new NotFoundException('Project job position not found');
    }
    const [raciActors, activities] = await Promise.all([
      this.raciMappings.find({ where: { projectId, positionId } }),
      this.activityMappings.find({ where: { projectId, positionId } }),
    ]);
    return { raciActors, activities };
  }

  async addPositionRaciActor(
    projectId: string,
    positionId: string,
    raciActorId: string,
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const [position, actor] = await Promise.all([
      this.positions.findOne({
        where: { id: positionId, projectId, active: true },
      }),
      this.raciActors.findOne({
        where: { id: raciActorId, projectId, active: true },
      }),
    ]);
    if (!position) {
      throw new NotFoundException('Project job position not found');
    }
    if (!actor) {
      throw new NotFoundException(
        'Active RACI actor not found in this project',
      );
    }
    const existing = await this.raciMappings.findOne({
      where: { projectId, positionId, raciActorId },
    });
    if (existing) {
      throw new ConflictException(
        'This RACI actor is already linked to the position',
      );
    }
    return this.raciMappings.save(
      this.raciMappings.create({
        projectId,
        positionId,
        raciActorId,
        createdBy: userId,
      }),
    );
  }

  async addPositionActivityMapping(
    projectId: string,
    positionId: string,
    input: { resourceId?: string; taskId?: string; blockId?: string },
    headers: RequestHeaders,
  ) {
    const userId = await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const position = await this.positions.findOne({
      where: { id: positionId, projectId, active: true },
    });
    if (!position) {
      throw new NotFoundException('Project job position not found');
    }

    const resourceId = this.requiredText(input.resourceId, 'resourceId', 36);
    const taskId = this.requiredText(input.taskId, 'taskId', 255);
    const blockId = this.requiredText(input.blockId, 'blockId', 36);
    const [process, positionBlock] = await Promise.all([
      this.projectProcesses.findOne({ where: { projectId, resourceId } }),
      this.positionBlocks.findOne({ where: { positionId, blockId } }),
    ]);
    if (!process) {
      throw new NotFoundException('BPMN process is not linked to this project');
    }
    if (
      !positionBlock ||
      !['required', 'optional'].includes(positionBlock.applicability)
    ) {
      throw new BadRequestException(
        'Activities can only be mapped to required or optional position blocks',
      );
    }

    const publishedContent = await this.contents.findOne({
      where: { resourceId, status: ContentStatusEnum.Published },
      order: { version: 'DESC', createdAt: 'DESC' },
    });
    if (!publishedContent) {
      throw new BadRequestException(
        'The BPMN process has no published content; publish it before mapping activities',
      );
    }

    let publishedActivityIds: Set<string>;
    try {
      publishedActivityIds = extractBpmnActivityIds(publishedContent.content);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(detail);
    }
    if (!publishedActivityIds.has(taskId)) {
      throw new BadRequestException(
        `BPMN element "${taskId}" was not found as an activity in the latest published content`,
      );
    }

    const existing = await this.activityMappings.findOne({
      where: { projectId, positionId, resourceId, taskId, blockId },
    });
    if (existing) {
      throw new ConflictException(
        'This activity is already mapped to this block',
      );
    }
    return this.activityMappings.save(
      this.activityMappings.create({
        projectId,
        positionId,
        resourceId,
        taskId,
        blockId,
        createdBy: userId,
      }),
    );
  }

  async removePositionRaciActor(
    projectId: string,
    positionId: string,
    mappingId: string,
    headers: RequestHeaders,
  ) {
    await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const result = await this.raciMappings.delete({
      id: mappingId,
      projectId,
      positionId,
    });
    if (!result.affected) {
      throw new NotFoundException('RACI actor mapping not found');
    }
    return { deleted: true };
  }

  async removePositionActivityMapping(
    projectId: string,
    positionId: string,
    mappingId: string,
    headers: RequestHeaders,
  ) {
    await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const result = await this.activityMappings.delete({
      id: mappingId,
      projectId,
      positionId,
    });
    if (!result.affected) {
      throw new NotFoundException('Activity mapping not found');
    }
    return { deleted: true };
  }

  async getProjectConsistencyDiagnostics(
    projectId: string,
    headers: RequestHeaders,
  ) {
    await this.projectAccess.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );

    const positions = await this.positions.find({
      where: { projectId, active: true },
    });
    const [actors, raciEntries, raciMappings, activityMappings] =
      await Promise.all([
        // Keep inactive actors in the lookup: existing RACI entries may still
        // reference them and must not be reported as actors missing from the registry.
        this.raciActors.find({ where: { projectId } }),
        this.raciEntries.find({ where: { projectId } }),
        this.raciMappings.find({ where: { projectId } }),
        this.activityMappings.find({ where: { projectId } }),
      ]);
    const blocks = positions.length
      ? await this.positionBlocks.find({
          where: positions.map((position) => ({
            positionId: position.id,
          })),
        })
      : [];

    const activePositionIds = new Set(positions.map((position) => position.id));
    const activeActorIds = new Set(
      actors.filter((actor) => actor.active).map((actor) => actor.id),
    );
    // Only links to active positions and active registry actors establish current coverage.
    const currentRaciMappings = raciMappings.filter(
      (mapping) =>
        activePositionIds.has(mapping.positionId) &&
        activeActorIds.has(mapping.raciActorId),
    );
    const mappedActorIds = new Set(
      currentRaciMappings.map((mapping) => mapping.raciActorId),
    );
    const actorByNormalizedName = new Map(
      actors.map((actor) => [actor.normalizedName, actor]),
    );
    const raciActorNames = [
      ...new Set(raciEntries.map((entry) => entry.actorName.trim())),
    ];
    const unmappedRaciActors = raciActorNames
      .map((name) => ({
        name,
        actor: actorByNormalizedName.get(name.toLocaleLowerCase()),
      }))
      .filter(
        ({ actor }) => !actor || !actor.active || !mappedActorIds.has(actor.id),
      )
      .map(({ name, actor }) => ({
        name,
        actorId: actor?.id ?? null,
        reason: !actor
          ? 'actor_not_in_registry'
          : !actor.active
            ? 'actor_inactive'
            : 'actor_not_linked_to_a_position',
      }));

    const currentActivityMappings = activityMappings.filter((mapping) =>
      activePositionIds.has(mapping.positionId),
    );
    const activityKeys = new Set(
      currentActivityMappings.map(
        (mapping) => `${mapping.positionId}:${mapping.blockId}`,
      ),
    );

    // Cross-check actual RACI assignments against both explicit links:
    // actor -> position and position -> the same published BPMN activity.
    const positionIdsByActorId = new Map<string, string[]>();
    for (const mapping of currentRaciMappings) {
      const linkedPositions = positionIdsByActorId.get(mapping.raciActorId) ?? [];
      linkedPositions.push(mapping.positionId);
      positionIdsByActorId.set(mapping.raciActorId, linkedPositions);
    }
    const activityCoverageKeys = new Set(
      currentActivityMappings.map(
        (mapping) =>
          `${mapping.positionId}:${mapping.resourceId}:${mapping.taskId}`,
      ),
    );
    const positionById = new Map(
      positions.map((position) => [position.id, position]),
    );
    const raciAssignmentsWithoutPositionActivity = raciEntries.flatMap(
      (entry) => {
        const actor = actorByNormalizedName.get(
          entry.actorName.trim().toLocaleLowerCase(),
        );
        if (!actor || !actor.active) return [];
        const linkedPositionIds = positionIdsByActorId.get(actor.id) ?? [];
        if (
          linkedPositionIds.some((positionId) =>
            activityCoverageKeys.has(
              `${positionId}:${entry.resourceId}:${entry.taskId}`,
            ),
          )
        ) {
          return [];
        }
        return [
          {
            actorName: entry.actorName,
            taskName: entry.taskName,
            taskId: entry.taskId,
            resourceId: entry.resourceId,
            role: entry.role,
            positionTitles: linkedPositionIds
              .map((positionId) => positionById.get(positionId)?.title)
              .filter((title): title is string => Boolean(title)),
            reason: linkedPositionIds.length
              ? 'position_not_linked_to_activity'
              : 'actor_not_linked_to_position',
          },
        ];
      },
    );
    const requiredBlocksWithoutActivities = blocks
      .filter(
        (block) =>
          positionById.has(block.positionId) &&
          block.applicability === 'required' &&
          !activityKeys.has(`${block.positionId}:${block.blockId}`),
      )
      .map((block) => ({
        positionId: block.positionId,
        positionTitle: positionById.get(block.positionId)?.title ?? null,
        blockId: block.blockId,
      }));

    return {
      projectId,
      unmappedRaciActors,
      raciAssignmentsWithoutPositionActivity,
      requiredBlocksWithoutActivities,
      counts: {
        positions: positions.length,
        raciActors: actors.filter((actor) => actor.active).length,
        raciEntries: raciEntries.length,
        raciActorMappings: currentRaciMappings.length,
        activityMappings: currentActivityMappings.length,
      },
      limitations: [
        'New BPMN activity mappings are checked against the latest published XML; existing mappings are not automatically revalidated when a later version is published.',
        'A RACI actor is a role label, not an individual person; this report does not infer person assignments.',
      ],
    };
  }

  private requiredText(
    value: unknown,
    field: string,
    maxLength: number,
  ): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const normalized = value.trim();
    if (normalized.length > maxLength) {
      throw new BadRequestException(
        `${field} must be ${maxLength} characters or fewer`,
      );
    }
    return normalized;
  }

  private validateLevel(value: number | null | undefined): number | null {
    if (value === undefined || value === null) return null;
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new BadRequestException(
        'Competency levels must be integers from 1 to 5',
      );
    }
    return value;
  }

  private validateSortOrder(value: number | undefined): number {
    if (value === undefined) return 0;
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new BadRequestException(
        'sortOrder must be an integer between 0 and 10000',
      );
    }
    return value;
  }
}
