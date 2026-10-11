import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('projects')
@Index('projects_name_unique_idx', ['name'], { unique: true })
export class ProjectTypeOrmEntity extends AbstractEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
