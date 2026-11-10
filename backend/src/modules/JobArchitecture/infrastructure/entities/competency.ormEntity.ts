import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type CompetencyCategory = 'technical' | 'methodological' | 'behavioral';

@Entity('competencies')
@Index('competencies_block_code_unique', ['blockId', 'code'], { unique: true })
@Index('competencies_block_id_unique', ['blockId', 'id'], { unique: true })
export class CompetencyTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  blockId: string;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'smallint', nullable: true })
  referenceLevel: number | null;

  @Column({ type: 'varchar', length: 24, default: 'technical' })
  category: CompetencyCategory;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
