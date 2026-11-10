import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectResourceAccessService } from '../ProjectContext/projectResourceAccess.service';
import { JobFunctionActivitySectionTypeOrmEntity } from './infrastructure/entities/jobFunctionActivitySection.ormEntity';
import { JobFunctionCustomSectionTypeOrmEntity } from './infrastructure/entities/jobFunctionCustomSection.ormEntity';
import { JobFunctionTypeOrmEntity } from './infrastructure/entities/jobFunction.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

@Injectable()
export class JobFunctionDocumentService {
  constructor(
    private readonly projectAccess: ProjectResourceAccessService,
    @InjectRepository(JobFunctionTypeOrmEntity)
    private readonly functions: Repository<JobFunctionTypeOrmEntity>,
    @InjectRepository(JobFunctionActivitySectionTypeOrmEntity)
    private readonly activitySections: Repository<JobFunctionActivitySectionTypeOrmEntity>,
    @InjectRepository(JobFunctionCustomSectionTypeOrmEntity)
    private readonly customSections: Repository<JobFunctionCustomSectionTypeOrmEntity>,
  ) {}

  async getDocument(functionId: string) {
    const jobFunction = await this.findFunction(functionId);
    const [activities, sections] = await Promise.all([
      this.activitySections.find({
        where: { functionId },
        order: { sortOrder: 'ASC', code: 'ASC' },
      }),
      this.customSections.find({
        where: { functionId },
        order: { sortOrder: 'ASC', sectionKey: 'ASC' },
      }),
    ]);

    return {
      ...jobFunction,
      activitySections: activities,
      customSections: sections,
    };
  }

  async updateDocument(
    functionId: string,
    input: {
      reportingLine?: string | null;
      documentDate?: string | null;
      otherTitles?: string[];
      documentVersion?: string | null;
      establishedBy?: string | null;
      validatedBy?: string | null;
      mission?: string | null;
    },
    headers: RequestHeaders,
  ) {
    const jobFunction = await this.findFunction(functionId);
    this.projectAccess.getAuthenticatedUserId(headers);

    if (
      input.documentDate !== undefined &&
      input.documentDate !== null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(input.documentDate)
    ) {
      throw new BadRequestException('documentDate must use YYYY-MM-DD');
    }

    if (input.reportingLine !== undefined) {
      jobFunction.reportingLine = this.optionalText(input.reportingLine, 255);
    }
    if (input.otherTitles !== undefined) {
      jobFunction.otherTitles = this.validateOtherTitles(input.otherTitles);
    }
    if (input.documentDate !== undefined) {
      jobFunction.documentDate = input.documentDate;
    }
    if (input.documentVersion !== undefined) {
      jobFunction.documentVersion = this.optionalText(
        input.documentVersion,
        32,
      );
    }
    if (input.establishedBy !== undefined) {
      jobFunction.establishedBy = this.optionalText(input.establishedBy, 255);
    }
    if (input.validatedBy !== undefined) {
      jobFunction.validatedBy = this.optionalText(input.validatedBy, 255);
    }
    if (input.mission !== undefined) {
      jobFunction.mission = this.optionalText(input.mission, 20000);
    }

    return this.functions.save(jobFunction);
  }

  async createActivitySection(
    functionId: string,
    input: {
      code?: string;
      title?: string;
      tasks?: string[];
      sortOrder?: number;
    },
    headers: RequestHeaders,
  ) {
    await this.findFunction(functionId);
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    const code = this.requiredText(input.code, 'code', 64).toUpperCase();
    const title = this.requiredText(input.title, 'title', 255);
    const tasks = this.validateTasks(input.tasks);
    const sortOrder = this.validateSortOrder(input.sortOrder);

    try {
      return await this.activitySections.save(
        this.activitySections.create({
          functionId,
          code,
          title,
          tasks,
          sortOrder,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'An activity section with this code already exists for this function',
        );
      }
      throw error;
    }
  }

  async updateActivitySection(
    functionId: string,
    sectionId: string,
    input: {
      code?: string;
      title?: string;
      tasks?: string[];
      sortOrder?: number;
    },
    headers: RequestHeaders,
  ) {
    await this.findFunction(functionId);
    this.projectAccess.getAuthenticatedUserId(headers);

    const section = await this.activitySections.findOne({
      where: { id: sectionId, functionId },
    });
    if (!section) {
      throw new NotFoundException('Activity section not found');
    }

    if (input.code !== undefined) {
      section.code = this.requiredText(input.code, 'code', 64).toUpperCase();
    }
    if (input.title !== undefined) {
      section.title = this.requiredText(input.title, 'title', 255);
    }
    if (input.tasks !== undefined) {
      section.tasks = this.validateTasks(input.tasks);
    }
    if (input.sortOrder !== undefined) {
      section.sortOrder = this.validateSortOrder(input.sortOrder);
    }

    try {
      return await this.activitySections.save(section);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'An activity section with this code already exists for this function',
        );
      }
      throw error;
    }
  }

  async deleteActivitySection(
    functionId: string,
    sectionId: string,
    headers: RequestHeaders,
  ) {
    await this.findFunction(functionId);
    this.projectAccess.getAuthenticatedUserId(headers);

    const result = await this.activitySections.delete({
      id: sectionId,
      functionId,
    });
    if (!result.affected) {
      throw new NotFoundException('Activity section not found');
    }
    return { deleted: true };
  }

  async createCustomSection(
    functionId: string,
    input: {
      sectionKey?: string;
      title?: string;
      content?: Record<string, unknown>;
      sortOrder?: number;
    },
    headers: RequestHeaders,
  ) {
    await this.findFunction(functionId);
    const createdBy = this.projectAccess.getAuthenticatedUserId(headers);
    const sectionKey = this.requiredText(
      input.sectionKey,
      'sectionKey',
      64,
    ).toLowerCase();
    const title = this.requiredText(input.title, 'title', 255);
    const content = this.validateContent(input.content);
    const sortOrder = this.validateSortOrder(input.sortOrder);

    try {
      return await this.customSections.save(
        this.customSections.create({
          functionId,
          sectionKey,
          title,
          content,
          sortOrder,
          createdBy,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'A section with this key already exists for this function',
        );
      }
      throw error;
    }
  }

  async updateCustomSection(
    functionId: string,
    sectionId: string,
    input: {
      sectionKey?: string;
      title?: string;
      content?: Record<string, unknown>;
      sortOrder?: number;
    },
    headers: RequestHeaders,
  ) {
    await this.findFunction(functionId);
    this.projectAccess.getAuthenticatedUserId(headers);

    const section = await this.customSections.findOne({
      where: { id: sectionId, functionId },
    });
    if (!section) {
      throw new NotFoundException('Custom section not found');
    }

    if (input.sectionKey !== undefined) {
      section.sectionKey = this.requiredText(
        input.sectionKey,
        'sectionKey',
        64,
      ).toLowerCase();
    }
    if (input.title !== undefined) {
      section.title = this.requiredText(input.title, 'title', 255);
    }
    if (input.content !== undefined) {
      section.content = this.validateContent(input.content);
    }
    if (input.sortOrder !== undefined) {
      section.sortOrder = this.validateSortOrder(input.sortOrder);
    }

    try {
      return await this.customSections.save(section);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'A section with this key already exists for this function',
        );
      }
      throw error;
    }
  }

  async deleteCustomSection(
    functionId: string,
    sectionId: string,
    headers: RequestHeaders,
  ) {
    await this.findFunction(functionId);
    this.projectAccess.getAuthenticatedUserId(headers);

    const result = await this.customSections.delete({
      id: sectionId,
      functionId,
    });
    if (!result.affected) {
      throw new NotFoundException('Custom section not found');
    }
    return { deleted: true };
  }

  private async findFunction(functionId: string) {
    const jobFunction = await this.functions.findOne({
      where: { id: functionId, active: true },
    });
    if (!jobFunction) {
      throw new NotFoundException('Job function not found');
    }
    return jobFunction;
  }

  private requiredText(
    value: unknown,
    field: string,
    max: number,
  ): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required`);
    }
    const result = value.trim();
    if (result.length > max) {
      throw new BadRequestException(
        `${field} must be ${max} characters or fewer`,
      );
    }
    return result;
  }

  private optionalText(value: string | null, max: number): string | null {
    if (value === null || !value.trim()) {
      return null;
    }
    if (value.trim().length > max) {
      throw new BadRequestException(
        `Text must be ${max} characters or fewer`,
      );
    }
    return value.trim();
  }

  private validateTasks(value: unknown): string[] {
    if (!Array.isArray(value) || value.length > 200) {
      throw new BadRequestException(
        'tasks must be an array of at most 200 items',
      );
    }
    return value.map((task, index) =>
      this.requiredText(task, `tasks[${index}]`, 2000),
    );
  }

  private validateOtherTitles(value: unknown): string[] {
    if (!Array.isArray(value) || value.length > 20) {
      throw new BadRequestException(
        'otherTitles must be an array of at most 20 items',
      );
    }
    return value.map((title, index) =>
      this.requiredText(title, `otherTitles[${index}]`, 255),
    );
  }

  private validateContent(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('content must be an object');
    }
    return value as Record<string, unknown>;
  }

  private validateSortOrder(value: number | undefined): number {
    if (value === undefined) {
      return 0;
    }
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      throw new BadRequestException(
        'sortOrder must be an integer between 0 and 10000',
      );
    }
    return value;
  }
}
