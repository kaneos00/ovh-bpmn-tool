import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type RaciReferenceActorType =
  | 'person'
  | 'function'
  | 'service'
  | 'external_organization'
  | 'unknown';

@Entity('raci_reference_actors')
@Index('raci_reference_actors_normalized_name_idx', ['normalizedName'])
@Index('raci_reference_actors_type_active_idx', ['actorType', 'active'])
export class RaciReferenceActorTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  normalizedName: string;

  @Column({ type: 'varchar', length: 32 })
  actorType: RaciReferenceActorType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
