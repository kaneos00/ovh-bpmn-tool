import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('project_member_job_positions')
@Index('project_member_job_positions_member_unique', ['projectId', 'userId'], {
  unique: true,
})
@Index('project_member_job_positions_position_idx', ['projectId', 'positionId'])
export class ProjectMemberJobPositionTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column('uuid')
  positionId: string;
}
