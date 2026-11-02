import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { ResourceTypeOrmEntity } from '../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ContentTypeOrmEntity } from '../ResourceContext/infrastructure/entities/content.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectProcess.ormEntity';
import { ProjectMemberTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectMember.ormEntity';
import { ProjectRaciEntryTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciActor.ormEntity';
import { UnifiedSearchController } from './unified-search.controller';
import { UnifiedSearchService } from './unified-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResourceTypeOrmEntity,
      ContentTypeOrmEntity,
      ProjectProcessTypeOrmEntity,
      ProjectMemberTypeOrmEntity,
      ProjectRaciEntryTypeOrmEntity,
      ProjectRaciActorTypeOrmEntity,
    ]),
    ProjectContextModule,
  ],
  controllers: [UnifiedSearchController],
  providers: [UnifiedSearchService],
})
export class SearchContextModule {}
