import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../domain/userRole';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 128 })
  username!: string;

  @Column({ length: 255 })
  displayName!: string;

  @Column({ name: 'passwordHash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role_enum' })
  role!: UserRole;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt!: Date;
}
