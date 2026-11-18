import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('organization_position_relations')
@Index('organization_position_relations_child_unique', ['childPositionId'], { unique: true })
@Index('organization_position_relations_parent_idx', ['parentPositionId'])
export class OrganizationPositionRelationTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  parentPositionId: string;

  @Column({ type: 'uuid' })
  childPositionId: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
