import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceTypeOrmEntity } from '../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ProjectController } from './infrastructure/controllers/project.controller';
import { ProjectMemberTypeOrmEntity } from './infrastructure/entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity } from './infrastructure/entities/projectProcess.ormEntity';
import { ProjectTypeOrmEntity } from './infrastructure/entities/project.ormEntity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectTypeOrmEntity,
      ProjectProcessTypeOrmEntity,
      ProjectMemberTypeOrmEntity,
      ResourceTypeOrmEntity,
    ]),
  ],
  controllers: [ProjectController],
})
export class ProjectContextModule {}
