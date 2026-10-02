import { Module } from '@nestjs/common';
import { ApiRestController } from './apiRest.controller';

@Module({ controllers: [ApiRestController] })
export class ApiRestModule {}
