import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type ProjectDocumentedSourceKind =
  | 'file'
  | 'database'
  | 'application'
  | 'form';

@Entity('project_documented_sources')
@Index('project_documented_sources_project_active_idx', [
  'projectId',
  'mergedIntoId',
])
export class ProjectDocumentedSourceTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  // Optional process context for entries created from a process without a BPMN link.
  // BPMN references may additionally connect this project-level source to other processes.
  @Column({ type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ type: 'varchar', length: 24, default: 'file' })
  kind: ProjectDocumentedSourceKind;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @Column({ type: 'text', nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  access: string | null;

  @Column({ type: 'text', nullable: true })
  retention: string | null;

  @Column({ type: 'date', nullable: true })
  validUntil: string | null;

  @Column({ type: 'boolean', default: false })
  containsPersonalData: boolean;

  @Column({ type: 'text', nullable: true })
  authorizedPeople: string | null;

  @Column({ type: 'text', nullable: true })
  restrictions: string | null;

  @Column({ type: 'uuid', nullable: true })
  mergedIntoId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  mergedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  mergedBy: string | null;
}
