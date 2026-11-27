import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('project_documented_source_processes')
@Index(
  'project_documented_source_processes_unique',
  ['projectId', 'sourceId', 'resourceId'],
  { unique: true },
)
@Index('project_documented_source_processes_process_idx', ['projectId', 'resourceId'])
export class ProjectDocumentedSourceProcessTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  sourceId: string;

  @Column('uuid')
  resourceId: string;
}
