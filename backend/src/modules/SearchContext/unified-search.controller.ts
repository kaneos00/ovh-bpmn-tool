import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
} from '@nestjs/common';
import { UseAcl } from '../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { ProjectRaciRole } from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { UnifiedSearchService } from './unified-search.service';
import type {
  SearchResultSource,
  SearchResultType,
} from './unified-search.service';

const SEARCH_TYPES: SearchResultType[] = ['process', 'bpmn', 'raci', 'actor'];
const SEARCH_SOURCES: SearchResultSource[] = [
  'resource',
  'bpmn',
  'project-raci',
  'project-actor',
];

@Controller('search')
export class UnifiedSearchController {
  constructor(private readonly searchService: UnifiedSearchService) {}

  @Get()
  @UseAcl()
  search(
    @Query('q') query: string,
    @Query('types') rawTypes: string | undefined,
    @Query('source') rawSource: string | undefined,
    @Query('resourceId') resourceId: string | undefined,
    @Query('role') rawRole: string | undefined,
    @Query('limit') rawLimit: string | undefined,
    @Query('offset') rawOffset: string | undefined,
    @Query('sortBy') rawSortBy: string | undefined,
    @Query('sortDirection') rawSortDirection: string | undefined,
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

    if (
      rawSource &&
      !SEARCH_SOURCES.includes(rawSource as SearchResultSource)
    ) {
      throw new BadRequestException(
        `source must contain only: ${SEARCH_SOURCES.join(', ')}`,
      );
    }

    const role = rawRole as ProjectRaciRole | undefined;
    if (role && !Object.values(ProjectRaciRole).includes(role)) {
      throw new BadRequestException('role must be one of R, A, C or I');
    }

    const limit = rawLimit === undefined ? undefined : Number(rawLimit);
    const offset = rawOffset === undefined ? undefined : Number(rawOffset);
    const allowedSorts = ['relevance', 'type', 'label', 'source', 'process'];
    if (rawSortBy && !allowedSorts.includes(rawSortBy)) {
      throw new BadRequestException(
        `sortBy must contain only: ${allowedSorts.join(', ')}`,
      );
    }
    if (
      rawSortDirection &&
      rawSortDirection !== 'asc' &&
      rawSortDirection !== 'desc'
    ) {
      throw new BadRequestException('sortDirection must be asc or desc');
    }
    return this.searchService.search(query, headers, {
      types: types as SearchResultType[] | undefined,
      source: rawSource as SearchResultSource | undefined,
      resourceId,
      role,
      limit,
      offset,
      sortBy: rawSortBy as 'relevance' | 'type' | 'label' | 'source' | 'process' | undefined,
      sortDirection: rawSortDirection as 'asc' | 'desc' | undefined,
    });
  }
}
