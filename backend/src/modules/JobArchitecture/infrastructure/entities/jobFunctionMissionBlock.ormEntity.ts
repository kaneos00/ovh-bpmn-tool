import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_mission_blocks')
@Index('job_function_mission_blocks_function_code_unique', ['functionId', 'code'], { unique: true })
@Index('job_function_mission_blocks_function_order_unique', ['functionId', 'sortOrder'], { unique: true })
export class JobFunctionMissionBlockTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  functionId: string;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer' })
  sortOrder: number;
}
