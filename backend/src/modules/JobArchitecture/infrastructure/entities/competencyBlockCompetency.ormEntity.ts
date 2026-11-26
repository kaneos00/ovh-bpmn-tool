import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('competency_block_competencies')
@Index(
  'competency_block_competencies_block_competency_unique',
  ['blockId', 'competencyId'],
  { unique: true },
)
export class CompetencyBlockCompetencyTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  blockId: string;

  @Column('uuid')
  competencyId: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;
}
