import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type RaciActorEventType =
  | 'reference_actor.created'
  | 'reference_actor.updated'
  | 'actor_mapping.created';

@Entity('raci_actor_events')
@Index('raci_actor_events_reference_created_idx', [
  'referenceActorId',
  'createdAt',
])
@Index('raci_actor_events_mapping_created_idx', ['mappingId', 'createdAt'])
export class RaciActorEventTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 40 })
  eventType: RaciActorEventType;

  @Column('uuid', { nullable: true })
  referenceActorId: string | null;

  @Column('uuid', { nullable: true })
  localActorId: string | null;

  @Column('uuid', { nullable: true })
  mappingId: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  details: Record<string, unknown>;
}
