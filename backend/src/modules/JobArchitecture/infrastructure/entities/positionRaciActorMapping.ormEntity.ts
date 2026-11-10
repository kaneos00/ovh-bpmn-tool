import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('position_raci_actor_mappings')
@Index('position_raci_actor_mappings_unique', ['positionId', 'raciActorId'], {
  unique: true,
})
export class PositionRaciActorMappingTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  positionId: string;

  @Column('uuid')
  raciActorId: string;
}
