import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('project_job_positions')
@Index('project_job_positions_project_idx', ['projectId'])
@Index('project_job_positions_project_id_unique', ['projectId', 'id'], {
  unique: true,
})
export class ProjectJobPositionTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  functionId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
