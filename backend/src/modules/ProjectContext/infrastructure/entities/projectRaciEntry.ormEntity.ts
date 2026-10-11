import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export enum ProjectRaciRole {
  Responsible = 'R',
  Accountable = 'A',
  Consulted = 'C',
  Informed = 'I',
}

@Entity('project_raci_entries')
@Index(
  'project_raci_entries_unique_assignment',
  ['projectId', 'resourceId', 'taskId', 'actorName'],
  { unique: true },
)
@Index('project_raci_entries_project_process_idx', ['projectId', 'resourceId'])
export class ProjectRaciEntryTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  resourceId: string;

  // BPMN element id (for example, Activity_PayPizza), not the displayed label.
  @Column({ type: 'varchar', length: 255 })
  taskId: string;

  @Column({ type: 'varchar', length: 255 })
  taskName: string;

  @Column({ type: 'varchar', length: 255 })
  actorName: string;

  @Column({
    type: 'enum',
    enum: ProjectRaciRole,
    enumName: 'project_raci_role_enum',
  })
  role: ProjectRaciRole;
}
