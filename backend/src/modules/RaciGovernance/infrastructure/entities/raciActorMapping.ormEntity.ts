import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('raci_actor_mappings')
@Index('raci_actor_mappings_one_active_local_idx', ['localActorId'], {
  unique: true,
  where: '"active" = true',
})
@Index('raci_actor_mappings_reference_active_idx', [
  'referenceActorId',
  'active',
])
export class RaciActorMappingTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  localActorId: string;

  @Column('uuid')
  referenceActorId: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
