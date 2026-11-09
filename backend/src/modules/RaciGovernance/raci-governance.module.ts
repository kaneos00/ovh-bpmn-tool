import { Module } from '@nestjs/common';
import { ProjectContextModule } from '../ProjectContext/projectContext.module';
import { RaciGovernanceController } from './raci-governance.controller';

@Module({
  imports: [ProjectContextModule],
  controllers: [RaciGovernanceController],
})
export class RaciGovernanceModule {}
