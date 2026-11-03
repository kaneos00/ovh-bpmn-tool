import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export enum ProcessChangeProposalStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  ChangesRequested = 'changes_requested',
  Rejected = 'rejected',
  Published = 'published',
}

@Entity('process_change_proposals')
@Index('process_change_proposals_project_status_idx', ['projectId', 'status'])
@Index('process_change_proposals_clone_unique', ['cloneResourceId'], {
  unique: true,
})
export class ProcessChangeProposalTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column('uuid')
  sourceResourceId: string;

  @Column('uuid')
  cloneResourceId: string;

  @Column('uuid')
  sourcePublishedContentId: string;

  @Column('uuid', { nullable: true })
  submittedContentId: string | null;

  @Column('uuid')
  authorUserId: string;

  @Column('uuid', { nullable: true })
  validatorUserId: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: ProcessChangeProposalStatus.Draft,
  })
  status: ProcessChangeProposalStatus;

  @Column({ type: 'text', nullable: true })
  submissionComment: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;
}
