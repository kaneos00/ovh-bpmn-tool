import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_activity_sections')
@Index(
  'job_function_activity_sections_function_code_unique',
  ['functionId', 'code'],
  { unique: true },
)
@Index('job_function_activity_sections_function_order_idx', [
  'functionId',
  'sortOrder',
])
export class JobFunctionActivitySectionTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  functionId: string;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tasks: string[];

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
