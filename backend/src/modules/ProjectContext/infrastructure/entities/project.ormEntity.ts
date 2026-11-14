import { Column, Entity } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('projects')
export class ProjectTypeOrmEntity extends AbstractEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 7, default: '#2864d7' })
  color: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  trigram: string | null;

  @Column({ length: 32, default: 'folder' })
  icon: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  defaultValidatorUserId: string | null;
}
