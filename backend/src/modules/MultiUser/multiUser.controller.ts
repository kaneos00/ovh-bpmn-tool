import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MultiUserService } from './multiUser.service';
import { UserRole } from './domain/userRole';
import { MultiUserAuthGuard } from './infrastructure/multiUserAuth.guard';
import { RolesGuard } from './infrastructure/roles.guard';
import { Roles } from './infrastructure/roles.decorator';

class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class InitialSetupDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

class CreateUserDto extends InitialSetupDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(12)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

@Controller('auth')
export class MultiUserController {
  constructor(private readonly multiUser: MultiUserService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.multiUser.login(body.username, body.password);
  }

  @Post('setup')
  setup(@Body() body: InitialSetupDto) {
    return this.multiUser.setupInitialAdmin(
      body.username,
      body.displayName,
      body.password,
    );
  }

  @Get('me')
  @UseGuards(MultiUserAuthGuard)
  async me(@Headers('authorization') authorization?: string) {
    return this.multiUser.me(this.bearerToken(authorization));
  }

  // ANCIEN CODE — conservé pour comparaison / retour arrière.
  // @Post('me')
  // async me(@Headers('authorization') authorization?: string) {
  //   return this.multiUser.me(this.bearerToken(authorization));
  // }

  @Post('logout')
  @UseGuards(MultiUserAuthGuard)
  async logout(@Headers('authorization') authorization?: string) {
    await this.multiUser.logout(this.bearerToken(authorization));
    return { success: true };
  }

  @Get('users')
  @UseGuards(MultiUserAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listUsers() {
    return this.multiUser.listUsers();
  }

  @Post('users')
  @UseGuards(MultiUserAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createUser(@Body() body: CreateUserDto) {
    return this.multiUser.createUser(
      body.username,
      body.displayName,
      body.password,
      body.role,
    );
  }

  @Put('users/:id')
  @UseGuards(MultiUserAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.multiUser.updateUser(id, body);
  }

  @Delete('users/:id')
  @UseGuards(MultiUserAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteUser(@Param('id') id: string) {
    return this.multiUser.deleteUser(id);
  }

  private bearerToken(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    return authorization.slice('Bearer '.length);
  }
}
