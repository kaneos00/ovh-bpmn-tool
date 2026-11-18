import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../../../shared-kernel/modules/infrastructure/db/abstract.entity';

@Entity('organization_positions')
@Index('organization_positions_code_unique', ['code'], { unique: true })
export class OrganizationPositionTypeOrmEntity extends AbstractEntity {
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  functionId: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
