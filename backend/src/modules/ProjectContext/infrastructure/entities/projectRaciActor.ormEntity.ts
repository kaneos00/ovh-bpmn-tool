import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type ProjectRaciActorOrigin = 'manual' | 'bpmn';

@Entity('project_raci_actors')
@Index('project_raci_actors_unique_name', ['projectId', 'normalizedName'], {
  unique: true,
})
@Index('project_raci_actors_project_active_idx', ['projectId', 'active'])
export class ProjectRaciActorTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Stored separately so uniqueness is case-insensitive and whitespace-stable.
  @Column({ type: 'varchar', length: 255 })
  normalizedName: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 16, default: 'manual' })
  origin: ProjectRaciActorOrigin;
}
