import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultiUserController } from './multiUser.controller';
import { MultiUserService } from './multiUser.service';
import { UserOrmEntity } from './infrastructure/user.ormEntity';
import { UserSessionOrmEntity } from './infrastructure/userSession.ormEntity';
import { MultiUserAuthGuard } from './infrastructure/multiUserAuth.guard';
import { RolesGuard } from './infrastructure/roles.guard';

// ANCIEN CODE — conservé pour comparaison / retour arrière.
// providers: [MultiUserService],

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, UserSessionOrmEntity])],
  controllers: [MultiUserController],
  providers: [MultiUserService, MultiUserAuthGuard, RolesGuard],
  exports: [MultiUserService, MultiUserAuthGuard, RolesGuard],
})
export class MultiUserModule {}
