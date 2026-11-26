import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_function_mission_competencies')
@Index('job_function_mission_competencies_block_competency_unique', ['missionBlockId', 'competencyId'], { unique: true })
export class JobFunctionMissionCompetencyTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  missionBlockId: string;

  @Column('uuid')
  competencyId: string;

  @Column({ type: 'smallint' })
  requiredLevel: number;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
