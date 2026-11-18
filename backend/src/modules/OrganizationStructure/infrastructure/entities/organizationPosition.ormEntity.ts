import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('organization_positions')
@Index('organization_positions_parent_idx', ['parentPositionId'])
@Index('organization_positions_active_sort_idx', ['active', 'sortOrder', 'title'])
export class OrganizationPositionTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  functionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  parentPositionId: string | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
