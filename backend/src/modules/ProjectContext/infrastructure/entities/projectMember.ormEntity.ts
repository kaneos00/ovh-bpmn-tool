import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

export enum ProjectMemberRole {
  Viewer = 'viewer',
  Modeler = 'modeler',
  Admin = 'admin',
}

@Entity('project_members')
@Index('project_members_unique_user', ['projectId', 'userId'], {
  unique: true,
})
export class ProjectMemberTypeOrmEntity extends AbstractEntity {
  @Column('uuid')
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  userId: string;

  @Column({
    type: 'enum',
    enum: ProjectMemberRole,
    enumName: 'project_member_role_enum',
    default: ProjectMemberRole.Viewer,
  })
  role: ProjectMemberRole;
}
