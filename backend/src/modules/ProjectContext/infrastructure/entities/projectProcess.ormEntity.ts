import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export enum ProjectProcessUsage {
  Common = 'common',
  Variant = 'variant',
  ProjectSpecific = 'project-specific',
}

@Entity('project_processes')
@Index('project_processes_unique_resource', ['projectId', 'resourceId'], { unique: true })
export class ProjectProcessTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  resourceId: string;

  @Column({ type: 'enum', enum: ProjectProcessUsage, enumName: 'project_process_usage_enum' })
  usage: ProjectProcessUsage;

  @Column('uuid', { nullable: true })
  sourceResourceId: string | null;
}
