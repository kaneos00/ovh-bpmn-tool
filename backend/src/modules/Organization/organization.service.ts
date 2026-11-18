import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobFunctionTypeOrmEntity } from '../JobArchitecture/infrastructure/entities/jobFunction.ormEntity';
import { OrganizationAssignmentTypeOrmEntity } from './infrastructure/entities/organizationAssignment.ormEntity';
import { OrganizationPositionRelationTypeOrmEntity } from './infrastructure/entities/organizationPositionRelation.ormEntity';
import { OrganizationPositionTypeOrmEntity } from './infrastructure/entities/organizationPosition.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

@Injectable()
export class OrganizationService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(OrganizationPositionTypeOrmEntity)
    private readonly positions: Repository<OrganizationPositionTypeOrmEntity>,
    @InjectRepository(OrganizationAssignmentTypeOrmEntity)
    private readonly assignments: Repository<OrganizationAssignmentTypeOrmEntity>,
    @InjectRepository(OrganizationPositionRelationTypeOrmEntity)
    private readonly relations: Repository<OrganizationPositionRelationTypeOrmEntity>,
    @InjectRepository(JobFunctionTypeOrmEntity)
    private readonly functions: Repository<JobFunctionTypeOrmEntity>,
  ) {}

  private userId(headers: RequestHeaders): string {
    const header = this.config.getOrThrow<string>('userHeader');
    const value = headers[header] ?? headers[header.toLowerCase()];
    if (!value?.trim()) {
      throw new BadRequestException('Authenticated user identity is missing');
    }
    return value.trim();
  }

  private requiredText(value: unknown, field: string, max: number): string {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > max
    ) {
      throw new BadRequestException(
        `${field} is required and must be at most ${max} characters`,
      );
    }
    return value.trim();
  }

  private date(value: unknown, field: string): string {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${field} must be a valid YYYY-MM-DD date`);
    }
    return value;
  }

  async getMyWorkspace(headers: RequestHeaders) {
    const userId = this.userId(headers);
    const assignments = await this.db.query(
      'SELECT assignment.id, assignment."positionId", assignment."startDate", assignment."endDate", position.code, position.title, position.description, position."functionId" FROM organization_assignments assignment JOIN organization_positions position ON position.id = assignment."positionId" WHERE assignment."userId" = $1 AND position.active = TRUE AND assignment."startDate" <= CURRENT_DATE AND (assignment."endDate" IS NULL OR assignment."endDate" >= CURRENT_DATE) ORDER BY assignment."startDate" DESC',
      [userId],
    );
    const positionIds = assignments.map(
      (assignment: { positionId: string }) => assignment.positionId,
    );

    const [managerRows, projects] = await Promise.all([
      positionIds.length
        ? this.db.query(
            'SELECT DISTINCT parent.id AS "positionId", parent.title AS "positionTitle", parentAssignment."userId" AS "managerUserId" FROM organization_position_relations relation JOIN organization_positions parent ON parent.id = relation."parentPositionId" AND parent.active = TRUE LEFT JOIN organization_assignments parentAssignment ON parentAssignment."positionId" = parent.id AND parentAssignment."startDate" <= CURRENT_DATE AND (parentAssignment."endDate" IS NULL OR parentAssignment."endDate" >= CURRENT_DATE) WHERE relation."childPositionId" = ANY($1::uuid[])',
            [positionIds],
          )
        : Promise.resolve([]),
      this.db.query(
        'SELECT project.id, project.name, project.description, member.role FROM project_members member JOIN projects project ON project.id = member."projectId" WHERE member."userId" = $1 ORDER BY project.name',
        [userId],
      ),
    ]);

    const tasks = positionIds.length
      ? await this.db.query(
          'SELECT DISTINCT project.id AS "projectId", project.name AS "projectName", projectPosition.id AS "projectPositionId", projectPosition.title AS "projectPositionTitle", actor.name AS "actorName", entry."taskId", entry."taskName", entry."resourceId", resource.name AS "processName", entry.role FROM project_job_positions projectPosition JOIN position_raci_actor_mappings mapping ON mapping."positionId" = projectPosition.id AND mapping."projectId" = projectPosition."projectId" JOIN project_raci_actors actor ON actor.id = mapping."raciActorId" AND actor."projectId" = mapping."projectId" AND actor.active = TRUE JOIN project_raci_entries entry ON entry."projectId" = mapping."projectId" AND lower(trim(entry."actorName")) = actor."normalizedName" JOIN project_members member ON member."projectId" = projectPosition."projectId" AND member."userId" = $2 JOIN projects project ON project.id = projectPosition."projectId" JOIN resources resource ON resource.id = entry."resourceId" WHERE projectPosition."organizationPositionId" = ANY($1::uuid[]) AND projectPosition.active = TRUE ORDER BY project.name, projectPosition.title, entry."taskName"',
          [positionIds, userId],
        )
      : [];

    return {
      userId,
      assignments,
      managers: managerRows,
      projects,
      tasks,
    };
  }

  async listPositions() {
    return this.positions.find({ order: { title: 'ASC' } });
  }

  async getManagementGrid() {
    const positions = await this.positions.find({ order: { title: 'ASC' } });
    const activeAssignments = await this.assignments
      .createQueryBuilder('assignment')
      .where('assignment."startDate" <= CURRENT_DATE')
      .andWhere(
        '(assignment."endDate" IS NULL OR assignment."endDate" >= CURRENT_DATE)',
      )
      .orderBy('assignment."startDate"', 'DESC')
      .getMany();
    const assignmentByPosition = new Map<
      string,
      OrganizationAssignmentTypeOrmEntity
    >();
    for (const assignment of activeAssignments) {
      if (!assignmentByPosition.has(assignment.positionId)) {
        assignmentByPosition.set(assignment.positionId, assignment);
      }
    }
    return positions.map((position) => ({
      ...position,
      assignment: assignmentByPosition.get(position.id) ?? null,
    }));
  }

  async bulkAssign(
    input: {
      positionIds?: unknown;
      userId?: unknown;
      startDate?: unknown;
    },
    headers: RequestHeaders,
  ) {
    if (
      !Array.isArray(input.positionIds) ||
      input.positionIds.length === 0 ||
      input.positionIds.some((id) => typeof id !== 'string') ||
      new Set(input.positionIds).size !== input.positionIds.length
    ) {
      throw new BadRequestException(
        'positionIds must be a non-empty unique list',
      );
    }
    const positionIds = (input.positionIds as string[]).slice().sort();
    const userId = await this.activeUser(
      this.requiredText(input.userId, 'userId', 255),
    );
    const startDate = this.date(input.startDate, 'startDate');
    return this.db.transaction(async (manager) => {
      for (const positionId of positionIds) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          positionId,
        ]);
      }
      const activePositions = await manager
        .getRepository(OrganizationPositionTypeOrmEntity)
        .createQueryBuilder('position')
        .where('position.id IN (:...positionIds)', { positionIds })
        .andWhere('position.active = TRUE')
        .getMany();
      if (activePositions.length !== positionIds.length) {
        throw new ConflictException(
          'All selected positions must exist and be active',
        );
      }
      const repository = manager.getRepository(
        OrganizationAssignmentTypeOrmEntity,
      );
      const conflicts = await repository
        .createQueryBuilder('assignment')
        .where('assignment."positionId" IN (:...positionIds)', {
          positionIds,
        })
        .andWhere(
          '(assignment."endDate" IS NULL OR assignment."endDate" >= CAST(:startDate AS date))',
          { startDate },
        )
        .getMany();
      if (conflicts.length) {
        throw new ConflictException(
          'At least one selected position already has an assignment covering the requested date',
        );
      }
      return repository.save(
        positionIds.map((positionId) =>
          repository.create({
            positionId,
            userId,
            startDate,
            endDate: null,
            note: null,
            createdBy: this.userId(headers),
          }),
        ),
      );
    });
  }

  async bulkEndAssignments(input: {
    assignmentIds?: unknown;
    endDate?: unknown;
  }) {
    if (
      !Array.isArray(input.assignmentIds) ||
      input.assignmentIds.length === 0 ||
      input.assignmentIds.some((id) => typeof id !== 'string') ||
      new Set(input.assignmentIds).size !== input.assignmentIds.length
    ) {
      throw new BadRequestException(
        'assignmentIds must be a non-empty unique list',
      );
    }
    const assignmentIds = input.assignmentIds as string[];
    const endDate = this.date(input.endDate, 'endDate');
    return this.db.transaction(async (manager) => {
      const repository = manager.getRepository(
        OrganizationAssignmentTypeOrmEntity,
      );
      const assignments = await repository
        .createQueryBuilder('assignment')
        .where('assignment.id IN (:...ids)', { ids: assignmentIds })
        .setLock('pessimistic_write')
        .getMany();
      if (
        assignments.length !== assignmentIds.length ||
        assignments.some((assignment) => endDate < assignment.startDate)
      ) {
        throw new ConflictException(
          'Selected assignments could not all be ended on that date',
        );
      }
      assignments.forEach((assignment) => {
        assignment.endDate = endDate;
      });
      return repository.save(assignments);
    });
  }

  async bulkDeactivate(input: { positionIds?: unknown }) {
    if (
      !Array.isArray(input.positionIds) ||
      input.positionIds.length === 0 ||
      input.positionIds.some((id) => typeof id !== 'string') ||
      new Set(input.positionIds).size !== input.positionIds.length
    ) {
      throw new BadRequestException(
        'positionIds must be a non-empty unique list',
      );
    }
    const positionIds = input.positionIds as string[];
    return this.db.transaction(async (manager) => {
      for (const positionId of positionIds.slice().sort()) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          positionId,
        ]);
      }
      const repository = manager.getRepository(
        OrganizationPositionTypeOrmEntity,
      );
      const positions = await repository
        .createQueryBuilder('position')
        .where('position.id IN (:...ids)', { ids: positionIds })
        .setLock('pessimistic_write')
        .getMany();
      if (positions.length !== positionIds.length) {
        throw new NotFoundException(
          'One or more selected positions do not exist',
        );
      }
      const pending = await manager
        .getRepository(OrganizationAssignmentTypeOrmEntity)
        .createQueryBuilder('assignment')
        .where('assignment."positionId" IN (:...ids)', {
          ids: input.positionIds,
        })
        .andWhere(
          '(assignment."endDate" IS NULL OR assignment."endDate" >= CURRENT_DATE)',
        )
        .getCount();
      if (pending) {
        throw new ConflictException(
          'End current or future assignments before deactivating selected positions',
        );
      }
      positions.forEach((position) => {
        position.active = false;
      });
      return repository.save(positions);
    });
  }

  async getOverview() {
    const [positions, relations] = await Promise.all([
      this.positions.find({
        where: { active: true },
        order: { title: 'ASC' },
      }),
      this.relations.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
    ]);

    const activeAssignments = await this.assignments
      .createQueryBuilder('assignment')
      .where('assignment."startDate" <= CURRENT_DATE')
      .andWhere(
        '(assignment."endDate" IS NULL OR assignment."endDate" >= CURRENT_DATE)',
      )
      .orderBy('assignment."startDate"', 'DESC')
      .getMany();

    const assignmentByPosition = new Map<
      string,
      OrganizationAssignmentTypeOrmEntity
    >();
    for (const assignment of activeAssignments) {
      if (!assignmentByPosition.has(assignment.positionId)) {
        assignmentByPosition.set(assignment.positionId, assignment);
      }
    }

    const parentByChild = new Map(
      relations.map((relation) => [
        relation.childPositionId,
        relation.parentPositionId,
      ]),
    );

    return {
      positions: positions.map((position) => ({
        ...position,
        assignment: assignmentByPosition.get(position.id) ?? null,
        parentPositionId: parentByChild.get(position.id) ?? null,
      })),
      relations,
    };
  }

  async createPosition(
    input: {
      code?: unknown;
      title?: unknown;
      description?: unknown;
      functionId?: unknown;
    },
    headers: RequestHeaders,
  ) {
    const code = this.requiredText(input.code, 'code', 64).toUpperCase();
    const title = this.requiredText(input.title, 'title', 255);
    const functionId =
      typeof input.functionId === 'string' && input.functionId.trim()
        ? input.functionId.trim()
        : null;

    if (
      functionId &&
      !(await this.functions.findOne({
        where: { id: functionId, active: true },
      }))
    ) {
      throw new NotFoundException('Active reference function not found');
    }

    try {
      return await this.positions.save(
        this.positions.create({
          code,
          title,
          description:
            typeof input.description === 'string'
              ? input.description.trim() || null
              : null,
          functionId,
          active: true,
          createdBy: this.userId(headers),
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A position with this code already exists');
      }
      throw error;
    }
  }

  async updatePosition(
    positionId: string,
    input: {
      code?: unknown;
      title?: unknown;
      description?: unknown;
      functionId?: unknown;
      active?: unknown;
    },
  ) {
    const position = await this.positions.findOne({
      where: { id: positionId },
    });
    if (!position) {
      throw new NotFoundException('Organization position not found');
    }

    if (input.code !== undefined) {
      position.code = this.requiredText(input.code, 'code', 64).toUpperCase();
    }
    if (input.title !== undefined) {
      position.title = this.requiredText(input.title, 'title', 255);
    }
    if (input.description !== undefined) {
      if (input.description !== null && typeof input.description !== 'string') {
        throw new BadRequestException('description must be text or null');
      }
      position.description =
        typeof input.description === 'string'
          ? input.description.trim() || null
          : null;
    }
    if (input.functionId !== undefined) {
      const functionId =
        typeof input.functionId === 'string' && input.functionId.trim()
          ? input.functionId.trim()
          : null;
      if (
        functionId &&
        !(await this.functions.findOne({
          where: { id: functionId, active: true },
        }))
      ) {
        throw new NotFoundException('Active reference function not found');
      }
      position.functionId = functionId;
    }
    if (input.active !== undefined) {
      if (typeof input.active !== 'boolean') {
        throw new BadRequestException('active must be boolean');
      }
      if (!input.active) {
        const pendingAssignment = await this.assignments
          .createQueryBuilder('assignment')
          .where('assignment."positionId" = :positionId', { positionId })
          .andWhere(
            '(assignment."endDate" IS NULL OR assignment."endDate" >= CURRENT_DATE)',
          )
          .getOne();
        if (pendingAssignment) {
          throw new ConflictException(
            'End the current or future assignment before deactivating this position',
          );
        }
      }
      position.active = input.active;
    }

    try {
      return await this.positions.save(position);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A position with this code already exists');
      }
      throw error;
    }
  }

  async getPosition(positionId: string) {
    const position = await this.positions.findOne({
      where: { id: positionId },
    });
    if (!position) {
      throw new NotFoundException('Organization position not found');
    }

    const [assignments, parent, children, jobFunction] = await Promise.all([
      this.assignments.find({
        where: { positionId },
        order: { startDate: 'DESC' },
      }),
      this.relations.findOne({ where: { childPositionId: positionId } }),
      this.relations.find({
        where: { parentPositionId: positionId },
        order: { sortOrder: 'ASC' },
      }),
      position.functionId
        ? this.functions.findOne({ where: { id: position.functionId } })
        : Promise.resolve(null),
    ]);

    return {
      ...position,
      jobFunction,
      assignments,
      parentPositionId: parent?.parentPositionId ?? null,
      children,
    };
  }

  private async activeUser(username: string): Promise<string> {
    const rows: Array<{ username: string }> = await this.db.query(
      'SELECT username FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
      [username],
    );
    if (!rows[0]) {
      throw new NotFoundException('Active KHI-FLOWS user not found');
    }
    return rows[0].username;
  }

  async createAssignment(
    positionId: string,
    input: {
      userId?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      note?: unknown;
    },
    headers: RequestHeaders,
  ) {
    const position = await this.positions.findOne({
      where: { id: positionId, active: true },
    });
    if (!position) {
      throw new NotFoundException('Active organization position not found');
    }

    const userId = await this.activeUser(
      this.requiredText(input.userId, 'userId', 255),
    );
    const startDate = this.date(input.startDate, 'startDate');
    const endDate =
      input.endDate === null ||
      input.endDate === undefined ||
      input.endDate === ''
        ? null
        : this.date(input.endDate, 'endDate');

    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }

    try {
      return await this.db.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [positionId]);
        const stillActive = await manager.query(
          'SELECT id FROM organization_positions WHERE id = $1 AND active = TRUE FOR UPDATE',
          [positionId],
        );
        if (!stillActive.length) {
          throw new ConflictException('This position is no longer active');
        }
        const overlap = await manager
          .getRepository(OrganizationAssignmentTypeOrmEntity)
          .createQueryBuilder('assignment')
          .where('assignment."positionId" = :positionId', { positionId })
          .andWhere(
            'assignment."startDate" <= COALESCE(CAST(:endDate AS date), DATE \'9999-12-31\')',
            { endDate },
          )
          .andWhere(
            '(assignment."endDate" IS NULL OR assignment."endDate" >= CAST(:startDate AS date))',
            { startDate },
          )
          .getOne();

        if (overlap) {
          throw new ConflictException(
            'This position already has an assignment overlapping the requested period',
          );
        }

        const repository = manager.getRepository(
          OrganizationAssignmentTypeOrmEntity,
        );
        return repository.save(
          repository.create({
            positionId,
            userId,
            startDate,
            endDate,
            note:
              typeof input.note === 'string' ? input.note.trim() || null : null,
            createdBy: this.userId(headers),
          }),
        );
      });
    } catch (error) {
      if (
        (error as { code?: string }).code === '23P01' ||
        (error as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'This position already has an overlapping assignment',
        );
      }
      throw error;
    }
  }

  async updateAssignment(assignmentId: string, input: { endDate?: unknown }) {
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Organization assignment not found');
    }
    if (input.endDate === undefined) {
      throw new BadRequestException('endDate is required');
    }

    const endDate =
      input.endDate === null || input.endDate === ''
        ? null
        : this.date(input.endDate, 'endDate');
    if (endDate && endDate < assignment.startDate) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }

    assignment.endDate = endDate;
    try {
      return await this.assignments.save(assignment);
    } catch (error) {
      if ((error as { code?: string }).code === '23P01') {
        throw new ConflictException(
          'This position already has an overlapping assignment',
        );
      }
      throw error;
    }
  }

  async addRelation(
    parentPositionId: string,
    input: { childPositionId?: unknown; sortOrder?: unknown },
    headers: RequestHeaders,
  ) {
    const childPositionId = this.requiredText(
      input.childPositionId,
      'childPositionId',
      64,
    );
    if (parentPositionId === childPositionId) {
      throw new BadRequestException('A position cannot report to itself');
    }

    const [parent, child] = await Promise.all([
      this.positions.findOne({
        where: { id: parentPositionId, active: true },
      }),
      this.positions.findOne({
        where: { id: childPositionId, active: true },
      }),
    ]);
    if (!parent || !child) {
      throw new NotFoundException('Both positions must exist and be active');
    }

    const cycle: Array<{ cycle: boolean }> = await this.db.query(
      'WITH RECURSIVE descendants(id) AS (SELECT "childPositionId" FROM organization_position_relations WHERE "parentPositionId" = $1 UNION SELECT relation."childPositionId" FROM organization_position_relations relation JOIN descendants ON relation."parentPositionId" = descendants.id) SELECT EXISTS(SELECT 1 FROM descendants WHERE id = $2) AS cycle',
      [childPositionId, parentPositionId],
    );
    if (cycle[0]?.cycle) {
      throw new BadRequestException(
        'This relation would create a hierarchy cycle',
      );
    }

    try {
      return await this.relations.save(
        this.relations.create({
          parentPositionId,
          childPositionId,
          sortOrder:
            Number.isInteger(input.sortOrder) && Number(input.sortOrder) >= 0
              ? Number(input.sortOrder)
              : 0,
          createdBy: this.userId(headers),
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('This position already has a parent');
      }
      throw error;
    }
  }

  async removeRelation(parentPositionId: string, relationId: string) {
    const relation = await this.relations.findOne({
      where: { id: relationId, parentPositionId },
    });
    if (!relation) {
      throw new NotFoundException('Organization relation not found');
    }
    await this.relations.remove(relation);
    return { removed: true };
  }
}
