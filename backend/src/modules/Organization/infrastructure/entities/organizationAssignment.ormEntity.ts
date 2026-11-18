import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('organization_assignments')
@Index('organization_assignments_position_dates_idx', ['positionId', 'startDate', 'endDate'])
@Index('organization_assignments_user_dates_idx', ['userId', 'startDate', 'endDate'])
export class OrganizationAssignmentTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  positionId: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
