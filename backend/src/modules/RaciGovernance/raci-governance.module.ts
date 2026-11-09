import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { RaciGovernanceApplicationService } from './application/raci-governance.application.service';
import { RaciActorEventTypeOrmEntity } from './infrastructure/entities/raciActorEvent.ormEntity';
import { RaciActorMappingTypeOrmEntity } from './infrastructure/entities/raciActorMapping.ormEntity';
import { RaciReferenceActorTypeOrmEntity } from './infrastructure/entities/raciReferenceActor.ormEntity';
import { RaciGovernanceController } from './raci-governance.controller';

@Module({
  imports: [
    ProjectContextModule,
    TypeOrmModule.forFeature([
      RaciReferenceActorTypeOrmEntity,
      RaciActorMappingTypeOrmEntity,
      RaciActorEventTypeOrmEntity,
    ]),
  ],
  controllers: [RaciGovernanceController],
  providers: [RaciGovernanceApplicationService],
})
export class RaciGovernanceModule {}
