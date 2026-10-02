import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserOrmEntity } from './user.ormEntity';

@Entity({ name: 'user_sessions' })
export class UserSessionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'userId', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserOrmEntity;

  @Column({ name: 'tokenHash', type: 'text', unique: true })
  tokenHash!: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'expiresAt', type: 'timestamptz' })
  expiresAt!: Date;
}
