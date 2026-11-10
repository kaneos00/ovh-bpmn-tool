import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_custom_sections')
@Index('job_function_custom_sections_function_key_unique', ['functionId', 'sectionKey'], { unique: true })
@Index('job_function_custom_sections_function_order_idx', ['functionId', 'sortOrder'])
export class JobFunctionCustomSectionTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  functionId: string;

  @Column({ type: 'varchar', length: 64 })
  sectionKey: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  content: Record<string, unknown>;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
