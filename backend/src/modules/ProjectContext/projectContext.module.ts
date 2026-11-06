import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceTypeOrmEntity } from '../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ContentTypeOrmEntity } from '../ResourceContext/infrastructure/entities/content.ormEntity';
import { ProjectController } from './infrastructure/controllers/project.controller';
import { ProcessChangeProposalController } from './infrastructure/controllers/process-change-proposal.controller';
import { ProjectRaciController } from './infrastructure/controllers/project-raci.controller';
import { ProjectMemberTypeOrmEntity } from './infrastructure/entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity } from './infrastructure/entities/projectProcess.ormEntity';
import { ProjectTypeOrmEntity } from './infrastructure/entities/project.ormEntity';
import { ProjectRaciEntryTypeOrmEntity } from './infrastructure/entities/projectRaciEntry.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from './infrastructure/entities/projectRaciActor.ormEntity';
import { ProcessChangeProposalTypeOrmEntity } from './infrastructure/entities/processChangeProposal.ormEntity';
import { ProcessChangeProposalEventTypeOrmEntity } from './infrastructure/entities/processChangeProposalEvent.ormEntity';
import { ProcessChangeProposalCommentTypeOrmEntity } from './infrastructure/entities/processChangeProposalComment.ormEntity';
import { ProjectResourceAccessService } from './projectResourceAccess.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectTypeOrmEntity,
      ProjectProcessTypeOrmEntity,
      ProjectMemberTypeOrmEntity,
      ResourceTypeOrmEntity,
      ContentTypeOrmEntity,
      ProjectRaciEntryTypeOrmEntity,
      ProjectRaciActorTypeOrmEntity,
      ProcessChangeProposalTypeOrmEntity,
      ProcessChangeProposalEventTypeOrmEntity,
      ProcessChangeProposalCommentTypeOrmEntity,
    ]),
  ],
  controllers: [ProjectController, ProjectRaciController, ProcessChangeProposalController],
  providers: [ProjectResourceAccessService],
  exports: [ProjectResourceAccessService],
})
export class ProjectContextModule {}
