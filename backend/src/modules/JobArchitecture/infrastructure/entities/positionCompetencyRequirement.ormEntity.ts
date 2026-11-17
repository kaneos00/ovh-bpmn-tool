import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('position_competency_requirements')
@Index(
  'position_competency_requirements_unique',
  ['positionId', 'competencyId'],
  { unique: true },
)
export class PositionCompetencyRequirementTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  positionId: string;

  @Column('uuid')
  blockId: string;

  @Column('uuid')
  competencyId: string;

  // Null means inherit the block level, then the function reference level.
  @Column({ type: 'smallint', nullable: true })
  requiredLevel: number | null;
}
