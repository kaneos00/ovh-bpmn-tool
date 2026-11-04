import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export type ProcessChangeProposalEventType =
  | 'created'
  | 'submitted'
  | 'reassigned'
  | 'approved'
  | 'changes_requested'
  | 'rejected'
  | 'published'
  | 'remark_added'
  | 'remark_accepted'
  | 'remark_rejected';

@Entity('process_change_proposal_events')
@Index('process_change_proposal_events_proposal_created_idx', [
  'proposalId',
  'createdAt',
])
export class ProcessChangeProposalEventTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  proposalId: string;

  @Column({ type: 'varchar', length: 32 })
  eventType: ProcessChangeProposalEventType;

  @Column('uuid')
  actorUserId: string;

  @Column('uuid', { nullable: true })
  validatorUserId: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;
}
