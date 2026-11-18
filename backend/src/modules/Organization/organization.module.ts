import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobFunctionTypeOrmEntity } from '../JobArchitecture/infrastructure/entities/jobFunction.ormEntity';
import { OrganizationController } from './infrastructure/controllers/organization.controller';
import { OrganizationAssignmentTypeOrmEntity } from './infrastructure/entities/organizationAssignment.ormEntity';
import { OrganizationPositionRelationTypeOrmEntity } from './infrastructure/entities/organizationPositionRelation.ormEntity';
import { OrganizationPositionTypeOrmEntity } from './infrastructure/entities/organizationPosition.ormEntity';
import { OrganizationService } from './organization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationPositionTypeOrmEntity,
      OrganizationAssignmentTypeOrmEntity,
      OrganizationPositionRelationTypeOrmEntity,
      JobFunctionTypeOrmEntity,
    ]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
