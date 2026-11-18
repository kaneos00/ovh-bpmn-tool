import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { JobFunctionTypeOrmEntity } from '../JobArchitecture/infrastructure/entities/jobFunction.ormEntity';
import { OrganizationPositionTypeOrmEntity } from './infrastructure/entities/organizationPosition.ormEntity';
import { OrganizationStructureController } from './infrastructure/controllers/organizationStructure.controller';
import { OrganizationStructureService } from './organizationStructure.service';

@Module({
  imports: [
    ProjectContextModule,
    TypeOrmModule.forFeature([
      OrganizationPositionTypeOrmEntity,
      JobFunctionTypeOrmEntity,
    ]),
  ],
  controllers: [OrganizationStructureController],
  providers: [OrganizationStructureService],
  exports: [OrganizationStructureService],
})
export class OrganizationStructureModule {}
