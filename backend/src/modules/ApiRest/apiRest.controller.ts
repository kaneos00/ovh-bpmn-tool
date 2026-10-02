import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';

class ApiRestInfoResponse {
  @ApiProperty({ example: 'v1' }) version!: string;
  @ApiProperty({ example: '/api/v1' }) basePath!: string;
  @ApiProperty({ example: 'Bearer token or configured user/group headers' }) authentication!: string;
}

@ApiTags('API')
@Controller('api/v1')
export class ApiRestController {
  @Get()
  @ApiOperation({ summary: 'Get API information', description: 'Returns the version and base path of the public REST API.' })
  @ApiResponse({ status: 200, type: ApiRestInfoResponse })
  getInfo(): ApiRestInfoResponse {
    return { version: 'v1', basePath: '/api/v1', authentication: 'Bearer token or configured user/group headers' };
  }
}
