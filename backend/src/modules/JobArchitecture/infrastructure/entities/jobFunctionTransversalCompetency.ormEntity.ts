import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_transversal_competencies')
@Index('job_function_transversal_competencies_function_competency_unique', ['functionId', 'competencyId'], { unique: true })
export class JobFunctionTransversalCompetencyTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  functionId: string;

  @Column('uuid')
  competencyId: string;

  @Column({ type: 'smallint' })
  requiredLevel: number;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
