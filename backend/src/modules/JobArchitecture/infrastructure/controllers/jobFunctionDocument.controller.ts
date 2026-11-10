import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { JobFunctionDocumentService } from '../../jobFunctionDocument.service';

type RequestHeaders = Record<string, string | undefined>;

@Controller('job-architecture/functions/:functionId/document')
@UseAcl([UserGroup.Admin])
export class JobFunctionDocumentController {
  constructor(private readonly documents: JobFunctionDocumentService) {}

  @Get()
  getDocument(@Param('functionId') functionId: string) {
    return this.documents.getDocument(functionId);
  }

  @Patch()
  updateDocument(
    @Param('functionId') functionId: string,
    @Body()
    body: {
      attachment?: string | null;
      documentDate?: string | null;
      documentVersion?: string | null;
      establishedBy?: string | null;
      validatedBy?: string | null;
      mission?: string | null;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.updateDocument(functionId, body, headers);
  }

  @Post('activity-sections')
  createActivitySection(
    @Param('functionId') functionId: string,
    @Body()
    body: {
      code?: string;
      title?: string;
      tasks?: string[];
      sortOrder?: number;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.createActivitySection(functionId, body, headers);
  }

  @Patch('activity-sections/:sectionId')
  updateActivitySection(
    @Param('functionId') functionId: string,
    @Param('sectionId') sectionId: string,
    @Body()
    body: {
      code?: string;
      title?: string;
      tasks?: string[];
      sortOrder?: number;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.updateActivitySection(
      functionId,
      sectionId,
      body,
      headers,
    );
  }

  @Delete('activity-sections/:sectionId')
  deleteActivitySection(
    @Param('functionId') functionId: string,
    @Param('sectionId') sectionId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.deleteActivitySection(
      functionId,
      sectionId,
      headers,
    );
  }

  @Post('sections')
  createCustomSection(
    @Param('functionId') functionId: string,
    @Body()
    body: {
      sectionKey?: string;
      title?: string;
      content?: Record<string, unknown>;
      sortOrder?: number;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.createCustomSection(functionId, body, headers);
  }

  @Patch('sections/:sectionId')
  updateCustomSection(
    @Param('functionId') functionId: string,
    @Param('sectionId') sectionId: string,
    @Body()
    body: {
      sectionKey?: string;
      title?: string;
      content?: Record<string, unknown>;
      sortOrder?: number;
    },
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.updateCustomSection(
      functionId,
      sectionId,
      body,
      headers,
    );
  }

  @Delete('sections/:sectionId')
  deleteCustomSection(
    @Param('functionId') functionId: string,
    @Param('sectionId') sectionId: string,
    @Headers() headers: RequestHeaders,
  ) {
    return this.documents.deleteCustomSection(functionId, sectionId, headers);
  }
}
