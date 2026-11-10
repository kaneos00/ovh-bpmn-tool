import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('job_functions')
@Index('job_functions_code_unique', ['code'], { unique: true })
export class JobFunctionTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reportingLine: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  otherTitles: string[];

  @Column({ type: 'date', nullable: true })
  documentDate: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  documentVersion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  establishedBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  validatedBy: string | null;

  @Column({ type: 'text', nullable: true })
  mission: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
