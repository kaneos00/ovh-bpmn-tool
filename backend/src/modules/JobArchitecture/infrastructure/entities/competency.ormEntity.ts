import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type CompetencyCategory =
  | 'methodological'
  | 'technical'
  | 'functional'
  | 'behavioral';

@Entity('competencies')
@Index('competencies_code_unique', ['code'], { unique: true })
export class CompetencyTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 24, default: 'technical' })
  category: CompetencyCategory;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
