import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { CompetencyBlockTypeOrmEntity } from './infrastructure/entities/competencyBlock.ormEntity';
import { CompetencyTypeOrmEntity } from './infrastructure/entities/competency.ormEntity';
import { JobFunctionCompetencyBlockTypeOrmEntity } from './infrastructure/entities/jobFunctionCompetencyBlock.ormEntity';
import { JobFunctionTypeOrmEntity } from './infrastructure/entities/jobFunction.ormEntity';
import { PositionActivityMappingTypeOrmEntity } from './infrastructure/entities/positionActivityMapping.ormEntity';
import { PositionCompetencyBlockTypeOrmEntity } from './infrastructure/entities/positionCompetencyBlock.ormEntity';
import { PositionRaciActorMappingTypeOrmEntity } from './infrastructure/entities/positionRaciActorMapping.ormEntity';
import { ProjectJobPositionTypeOrmEntity } from './infrastructure/entities/projectJobPosition.ormEntity';
import { JobArchitectureController } from './infrastructure/controllers/jobArchitecture.controller';
import { JobArchitectureService } from './jobArchitecture.service';

@Module({
  imports: [
    ProjectContextModule,
    TypeOrmModule.forFeature([
      JobFunctionTypeOrmEntity,
      CompetencyBlockTypeOrmEntity,
      CompetencyTypeOrmEntity,
      JobFunctionCompetencyBlockTypeOrmEntity,
      ProjectJobPositionTypeOrmEntity,
      PositionCompetencyBlockTypeOrmEntity,
      PositionRaciActorMappingTypeOrmEntity,
      PositionActivityMappingTypeOrmEntity,
    ]),
  ],
  controllers: [JobArchitectureController],
  providers: [JobArchitectureService],
  exports: [JobArchitectureService],
})
export class JobArchitectureModule {}
