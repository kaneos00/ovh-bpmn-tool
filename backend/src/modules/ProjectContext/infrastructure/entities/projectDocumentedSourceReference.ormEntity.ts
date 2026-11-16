import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('project_documented_source_references')
@Index('project_documented_source_references_unique_element', ['projectId', 'resourceId', 'elementId'], { unique: true })
@Index('project_documented_source_references_source_idx', ['sourceId'])
export class ProjectDocumentedSourceReferenceTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  sourceId: string;

  @Column('uuid')
  resourceId: string;

  @Column({ type: 'varchar', length: 255 })
  elementId: string;

  @Column({ type: 'varchar', length: 255 })
  elementName: string;

  @Column({ type: 'varchar', length: 64 })
  elementType: string;
}
