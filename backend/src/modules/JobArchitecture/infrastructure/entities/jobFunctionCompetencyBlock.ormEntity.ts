import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_competency_blocks')
@Index('job_function_competency_blocks_unique', ['functionId', 'blockId'], {
  unique: true,
})
export class JobFunctionCompetencyBlockTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  functionId: string;

  @Column('uuid')
  blockId: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
