import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ThemePreferenceController } from './theme-preference.controller';

@Module({
  controllers: [AuthController, ThemePreferenceController],
})
export class AuthModule {}
