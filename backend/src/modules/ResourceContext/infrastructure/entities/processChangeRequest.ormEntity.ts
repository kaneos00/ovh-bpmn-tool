import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';
import { ResourceTypeOrmEntity } from './resource.ormEntity';
import { ContentTypeOrmEntity } from './content.ormEntity';
import {
  ProcessChangeRequestStatusEnum,
  ProcessChangeRequestTypeEnum,
} from '../../../../modules/ResourceContext/shared/types/ProcessChangeRequest';

@Entity('process_change_requests')
@Index(['resourceId', 'status', 'updatedAt'])
@Index(['authorId', 'createdAt'])
export class ProcessChangeRequestTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  resourceId: string;

  @ManyToOne(() => ResourceTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resourceId' })
  resource: ResourceTypeOrmEntity;

  @Column({ type: 'varchar', length: 64 })
  authorId: string;

  @Column({ type: 'varchar', length: 32 })
  type: ProcessChangeRequestTypeEnum;

  @Column({
    type: 'varchar',
    length: 32,
    default: ProcessChangeRequestStatusEnum.Proposed,
  })
  status: ProcessChangeRequestStatusEnum;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceContentId: string | null;

  @ManyToOne(() => ContentTypeOrmEntity, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'sourceContentId' })
  sourceContent: ContentTypeOrmEntity | null;

  @Column({ type: 'int', nullable: true })
  sourceVersion: number | null;

  @Column({ type: 'uuid', nullable: true })
  workingContentId: string | null;

  @ManyToOne(() => ContentTypeOrmEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'workingContentId' })
  workingContent: ContentTypeOrmEntity | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  assignedReviewerId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  publishedContentId: string | null;

  @ManyToOne(() => ContentTypeOrmEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'publishedContentId' })
  publishedContent: ContentTypeOrmEntity | null;
}
