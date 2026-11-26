import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_mission_activities')
@Index('job_function_mission_activities_block_order_unique', ['missionBlockId', 'sortOrder'], { unique: true })
export class JobFunctionMissionActivityTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  missionBlockId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'integer' })
  sortOrder: number;
}
