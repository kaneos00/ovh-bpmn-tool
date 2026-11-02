import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
} from '@nestjs/common';
import { UseAcl } from '../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import {
  UnifiedSearchService,
  SearchResultType,
} from './unified-search.service';

const SEARCH_TYPES: SearchResultType[] = ['process', 'bpmn', 'raci', 'actor'];

@Controller('search')
export class UnifiedSearchController {
  constructor(private readonly searchService: UnifiedSearchService) {}

  @Get()
  @UseAcl()
  search(
    @Query('q') query: string,
    @Query('types') rawTypes: string | undefined,
    @Query('limit') rawLimit: string | undefined,
    @Query('offset') rawOffset: string | undefined,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const types = rawTypes
      ?.split(',')
      .map((type) => type.trim())
      .filter(Boolean);
    if (
      types?.some((type) => !SEARCH_TYPES.includes(type as SearchResultType))
    ) {
      throw new BadRequestException(
        `types must contain only: ${SEARCH_TYPES.join(', ')}`,
      );
    }

    const limit = rawLimit === undefined ? undefined : Number(rawLimit);
    const offset = rawOffset === undefined ? undefined : Number(rawOffset);
    return this.searchService.search(query, headers, {
      types: types as SearchResultType[] | undefined,
      limit,
      offset,
    });
  }
}
