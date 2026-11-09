import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectRaciApplicationService } from '../../ProjectContext/project-raci.application.service';
import { ProjectResourceAccessService } from '../../ProjectContext/projectResourceAccess.service';
import { ActorLabelNormalizer } from '../domain/actor-label.normalizer';
import {
  RaciReferenceActorType,
  RaciReferenceActorTypeOrmEntity,
} from '../infrastructure/entities/raciReferenceActor.ormEntity';
import { RaciActorMappingTypeOrmEntity } from '../infrastructure/entities/raciActorMapping.ormEntity';
import { RaciActorEventTypeOrmEntity } from '../infrastructure/entities/raciActorEvent.ormEntity';

export type RaciGovernanceHeaders = Record<string, string | undefined>;

export interface CreateReferenceActorInput {
  name: string;
  actorType: RaciReferenceActorType;
  description?: string | null;
}

export interface UpdateReferenceActorInput {
  name?: string;
  actorType?: RaciReferenceActorType;
  description?: string | null;
  active?: boolean;
}

export interface CreateActorMappingInput {
  localActorId: string;
  referenceActorId: string;
}

const ACTOR_TYPES: RaciReferenceActorType[] = [
  'person',
  'function',
  'service',
  'external_organization',
  'unknown',
];

@Injectable()
export class RaciGovernanceApplicationService {
  constructor(
    private readonly access: ProjectResourceAccessService,
    private readonly projectRaci: ProjectRaciApplicationService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(RaciReferenceActorTypeOrmEntity)
    private readonly referenceActors: Repository<RaciReferenceActorTypeOrmEntity>,
    @InjectRepository(RaciActorMappingTypeOrmEntity)
    private readonly mappings: Repository<RaciActorMappingTypeOrmEntity>,
  ) {}

  async listReferenceActors(headers: RaciGovernanceHeaders) {
    this.assertOrganizationAdmin(headers);
    const [actors, mappings] = await Promise.all([
      this.referenceActors.find({ order: { name: 'ASC' } }),
      this.mappings.find({ where: { active: true } }),
    ]);
    const counts = new Map<string, number>();
    for (const mapping of mappings) {
      counts.set(
        mapping.referenceActorId,
        (counts.get(mapping.referenceActorId) ?? 0) + 1,
      );
    }
    return actors.map((actor) => ({
      ...actor,
      activeMappingCount: counts.get(actor.id) ?? 0,
    }));
  }

  async listActorMappings(headers: RaciGovernanceHeaders) {
    this.assertOrganizationAdmin(headers);
    const [mappings, actors, references] = await Promise.all([
      this.mappings.find({ order: { createdAt: 'DESC' } }),
      this.projectRaci.readOrganizationActorInventory(headers),
      this.referenceActors.find(),
    ]);
    const localById = new Map(actors.map((actor) => [actor.actorId, actor]));
    const referenceById = new Map(references.map((actor) => [actor.id, actor]));
    return mappings.map((mapping) => ({
      ...mapping,
      localActor: localById.get(mapping.localActorId) ?? null,
      referenceActor: referenceById.get(mapping.referenceActorId) ?? null,
    }));
  }

  async createReferenceActor(
    input: CreateReferenceActorInput,
    headers: RaciGovernanceHeaders,
  ) {
    const userId = this.assertOrganizationAdmin(headers);
    const name = this.validateName(input.name);
    const actorType = this.validateActorType(input.actorType);
    const description = this.validateDescription(input.description);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RaciReferenceActorTypeOrmEntity);
      const actor = repository.create({
        createdBy: userId,
        name,
        normalizedName: ActorLabelNormalizer.normalize(name),
        actorType,
        description,
        active: true,
      });
      const saved = await repository.save(actor);
      await this.recordEvent(manager, {
        createdBy: userId,
        eventType: 'reference_actor.created',
        referenceActorId: saved.id,
        details: { after: this.referenceSnapshot(saved) },
      });
      return { ...saved, activeMappingCount: 0 };
    });
  }

  async updateReferenceActor(
    actorId: string,
    input: UpdateReferenceActorInput,
    headers: RaciGovernanceHeaders,
  ) {
    const userId = this.assertOrganizationAdmin(headers);
    if (!Object.keys(input).length) {
      throw new BadRequestException('At least one field must be provided');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RaciReferenceActorTypeOrmEntity);
      const actor = await repository.findOne({ where: { id: actorId } });
      if (!actor) throw new NotFoundException('Reference actor not found');

      const before = this.referenceSnapshot(actor);
      if (input.name !== undefined) {
        actor.name = this.validateName(input.name);
        actor.normalizedName = ActorLabelNormalizer.normalize(actor.name);
      }
      if (input.actorType !== undefined) {
        actor.actorType = this.validateActorType(input.actorType);
      }
      if (input.description !== undefined) {
        actor.description = this.validateDescription(input.description);
      }
      if (input.active !== undefined) {
        if (typeof input.active !== 'boolean') {
          throw new BadRequestException('active must be a boolean');
        }
        actor.active = input.active;
      }

      const saved = await repository.save(actor);
      await this.recordEvent(manager, {
        createdBy: userId,
        eventType: 'reference_actor.updated',
        referenceActorId: saved.id,
        details: {
          before,
          after: this.referenceSnapshot(saved),
        },
      });
      return saved;
    });
  }

  async createActorMapping(
    input: CreateActorMappingInput,
    headers: RaciGovernanceHeaders,
  ) {
    const userId = this.assertOrganizationAdmin(headers);
    if (!input.localActorId?.trim() || !input.referenceActorId?.trim()) {
      throw new BadRequestException(
        'localActorId and referenceActorId are required',
      );
    }

    const localActor = await this.projectRaci.readOrganizationActorById(
      input.localActorId,
      headers,
    );
    if (!localActor) throw new NotFoundException('Local actor not found');

    try {
      return await this.dataSource.transaction(async (manager) => {
        const references = manager.getRepository(
          RaciReferenceActorTypeOrmEntity,
        );
        const mappings = manager.getRepository(RaciActorMappingTypeOrmEntity);
        const referenceActor = await references.findOne({
          where: { id: input.referenceActorId },
        });
        if (!referenceActor || !referenceActor.active) {
          throw new NotFoundException(
            'An active reference actor is required',
          );
        }

        const existing = await mappings.findOne({
          where: { localActorId: localActor.actorId, active: true },
        });
        if (existing) {
          throw new ConflictException(
            'This local actor already has an active reference mapping',
          );
        }

        const mapping = mappings.create({
          createdBy: userId,
          localActorId: localActor.actorId,
          referenceActorId: referenceActor.id,
          active: true,
        });
        const saved = await mappings.save(mapping);
        await this.recordEvent(manager, {
          createdBy: userId,
          eventType: 'actor_mapping.created',
          referenceActorId: referenceActor.id,
          localActorId: localActor.actorId,
          mappingId: saved.id,
          details: {
            localActor: {
              projectId: localActor.projectId,
              projectName: localActor.projectName,
              actorName: localActor.actorName,
            },
            referenceActor: this.referenceSnapshot(referenceActor),
          },
        });
        return {
          ...saved,
          localActor,
          referenceActor,
        };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'driverError' in error &&
        (error as Error & { driverError?: { code?: string } }).driverError
          ?.code === '23505'
      ) {
        throw new ConflictException(
          'This local actor already has an active reference mapping',
        );
      }
      throw error;
    }
  }

  private assertOrganizationAdmin(headers: RaciGovernanceHeaders): string {
    const userId = this.access.getAuthenticatedUserId(headers);
    if (!this.access.hasOrganizationAdminRole(headers)) {
      throw new ForbiddenException(
        'Organization administrator role is required',
      );
    }
    return userId;
  }

  private validateName(value: string): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 255) {
      throw new BadRequestException('name must contain 1 to 255 characters');
    }
    return value.trim();
  }

  private validateActorType(value: RaciReferenceActorType): RaciReferenceActorType {
    if (!ACTOR_TYPES.includes(value)) {
      throw new BadRequestException('Unsupported reference actor type');
    }
    return value;
  }

  private validateDescription(value?: string | null): string | null {
    if (value == null) return null;
    if (typeof value !== 'string' || value.length > 4000) {
      throw new BadRequestException(
        'description must contain at most 4000 characters',
      );
    }
    return value.trim() || null;
  }

  private referenceSnapshot(actor: RaciReferenceActorTypeOrmEntity) {
    return {
      id: actor.id,
      name: actor.name,
      normalizedName: actor.normalizedName,
      actorType: actor.actorType,
      description: actor.description,
      active: actor.active,
    };
  }

  private async recordEvent(
    manager: import('typeorm').EntityManager,
    input: {
      createdBy: string;
      eventType:
        | 'reference_actor.created'
        | 'reference_actor.updated'
        | 'actor_mapping.created';
      referenceActorId?: string;
      localActorId?: string;
      mappingId?: string;
      details: Record<string, unknown>;
    },
  ) {
    const events = manager.getRepository(RaciActorEventTypeOrmEntity);
    await events.save(
      events.create({
        ...input,
        referenceActorId: input.referenceActorId ?? null,
        localActorId: input.localActorId ?? null,
        mappingId: input.mappingId ?? null,
      }),
    );
  }
}
