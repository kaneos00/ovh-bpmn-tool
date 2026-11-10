import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('position_activity_mappings')
@Index(
  'position_activity_mappings_unique',
  ['positionId', 'resourceId', 'taskId', 'blockId'],
  { unique: true },
)
@Index('position_activity_mappings_project_process_idx', [
  'projectId',
  'resourceId',
])
export class PositionActivityMappingTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  positionId: string;

  @Column('uuid')
  resourceId: string;

  // Stable BPMN element id, not the displayed activity label.
  @Column({ type: 'varchar', length: 255 })
  taskId: string;

  @Column('uuid')
  blockId: string;
}
