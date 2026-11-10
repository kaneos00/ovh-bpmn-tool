import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type PositionBlockApplicability =
  | 'required'
  | 'optional'
  | 'not_applicable'
  | 'not_assessed';

@Entity('position_competency_blocks')
@Index('position_competency_blocks_unique', ['positionId', 'blockId'], {
  unique: true,
})
export class PositionCompetencyBlockTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  positionId: string;

  @Column('uuid')
  blockId: string;

  @Column({ type: 'varchar', length: 20, default: 'not_assessed' })
  applicability: PositionBlockApplicability;

  @Column({ type: 'smallint', nullable: true })
  requiredLevel: number | null;
}
