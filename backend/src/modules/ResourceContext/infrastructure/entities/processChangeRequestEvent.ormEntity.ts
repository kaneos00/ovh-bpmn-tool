import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProcessChangeRequestTypeOrmEntity } from './processChangeRequest.ormEntity';

@Entity('process_change_request_events')
@Index(['requestId', 'createdAt'])
export class ProcessChangeRequestEventTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  requestId: string;

  @ManyToOne(() => ProcessChangeRequestTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: ProcessChangeRequestTypeOrmEntity;

  @Column({ type: 'varchar', length: 64 })
  actorId: string;

  @Column({ type: 'varchar', length: 40 })
  event: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  fromStatus: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  toStatus: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;
}
