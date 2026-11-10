import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { ProjectProcessTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectProcess.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciActor.ormEntity';
import { ProjectRaciEntryTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { CompetencyBlockTypeOrmEntity } from './infrastructure/entities/competencyBlock.ormEntity';
import { CompetencyTypeOrmEntity } from './infrastructure/entities/competency.ormEntity';
import { JobFunctionActivitySectionTypeOrmEntity } from './infrastructure/entities/jobFunctionActivitySection.ormEntity';
import { JobFunctionCompetencyBlockTypeOrmEntity } from './infrastructure/entities/jobFunctionCompetencyBlock.ormEntity';
import { JobFunctionCustomSectionTypeOrmEntity } from './infrastructure/entities/jobFunctionCustomSection.ormEntity';
import { JobFunctionTypeOrmEntity } from './infrastructure/entities/jobFunction.ormEntity';
import { PositionActivityMappingTypeOrmEntity } from './infrastructure/entities/positionActivityMapping.ormEntity';
import { PositionCompetencyBlockTypeOrmEntity } from './infrastructure/entities/positionCompetencyBlock.ormEntity';
import { PositionCompetencyRequirementTypeOrmEntity } from './infrastructure/entities/positionCompetencyRequirement.ormEntity';
import { PositionRaciActorMappingTypeOrmEntity } from './infrastructure/entities/positionRaciActorMapping.ormEntity';
import { ProjectJobPositionTypeOrmEntity } from './infrastructure/entities/projectJobPosition.ormEntity';
import { JobArchitectureController } from './infrastructure/controllers/jobArchitecture.controller';
import { JobFunctionDocumentController } from './infrastructure/controllers/jobFunctionDocument.controller';
import { JobArchitectureService } from './jobArchitecture.service';
import { JobFunctionDocumentService } from './jobFunctionDocument.service';

@Module({
  imports: [
    ProjectContextModule,
    TypeOrmModule.forFeature([
      JobFunctionTypeOrmEntity,
      JobFunctionActivitySectionTypeOrmEntity,
      JobFunctionCustomSectionTypeOrmEntity,
      CompetencyBlockTypeOrmEntity,
      CompetencyTypeOrmEntity,
      JobFunctionCompetencyBlockTypeOrmEntity,
      ProjectJobPositionTypeOrmEntity,
      PositionCompetencyBlockTypeOrmEntity,
      PositionCompetencyRequirementTypeOrmEntity,
      PositionRaciActorMappingTypeOrmEntity,
      PositionActivityMappingTypeOrmEntity,
      ProjectProcessTypeOrmEntity,
      ProjectRaciActorTypeOrmEntity,
      ProjectRaciEntryTypeOrmEntity,
    ]),
  ],
  controllers: [JobArchitectureController, JobFunctionDocumentController],
  providers: [JobArchitectureService, JobFunctionDocumentService],
  exports: [JobArchitectureService, JobFunctionDocumentService],
})
export class JobArchitectureModule {}
