import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export enum ProcessChangeProposalCommentStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

@Entity('process_change_proposal_comments')
@Index('process_change_proposal_comments_proposal_created_idx', [
  'proposalId',
  'createdAt',
])
@Index('process_change_proposal_comments_proposal_status_idx', [
  'proposalId',
  'status',
])
export class ProcessChangeProposalCommentTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  proposalId: string;

  @Column({ type: 'varchar', length: 255 })
  elementId: string;

  @Column('uuid')
  authorUserId: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: ProcessChangeProposalCommentStatus.Pending,
  })
  status: ProcessChangeProposalCommentStatus;

  @Column('uuid', { nullable: true })
  decisionBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionComment: string | null;
}
