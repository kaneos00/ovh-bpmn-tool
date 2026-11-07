import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getRepositories } from './infrastructure/repositories';
import { getControllers } from './infrastructure/controllers';
import { getCommands } from './application/commands';
import { getQueries } from './application/queries';

import { ResourceTypeOrmEntity } from './infrastructure/entities/resource.ormEntity';
import { ContentTypeOrmEntity } from './infrastructure/entities/content.ormEntity';
import { CommentTypeOrmEntity } from './infrastructure/entities/comment.ormEntity';
import { TerminusModule } from '@nestjs/terminus';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { ResourceContentGovernanceService } from './resource-content-governance.service';

@Module({
  controllers: [...getControllers()],
  imports: [
    TypeOrmModule.forFeature([
      ResourceTypeOrmEntity,
      ContentTypeOrmEntity,
      CommentTypeOrmEntity,
    ]),
    ProjectContextModule,
    TerminusModule,
  ],
  providers: [
    ...getCommands(),
    ...getQueries(),
    ...getRepositories(),
    ResourceContentGovernanceService,
  ],
  exports: [ResourceContentGovernanceService],
})
export class ResourceContextModule {}
