import {
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
  Body,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { XMLParser } from 'fast-xml-parser';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ProjectMemberRole } from '../entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../entities/projectProcess.ormEntity';
import { ProjectDocumentedSourceTypeOrmEntity } from '../entities/projectDocumentedSource.ormEntity';
import { ProjectDocumentedSourceReferenceTypeOrmEntity } from '../entities/projectDocumentedSourceReference.ormEntity';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';

type RequestHeaders = Record<string, string | undefined>;
type SourceKind = 'file' | 'database' | 'application';
type SourceFields = Pick<
  ProjectDocumentedSourceTypeOrmEntity,
  | 'kind'
  | 'name'
  | 'description'
  | 'link'
  | 'location'
  | 'access'
  | 'authorizedPeople'
  | 'restrictions'
  | 'validUntil'
>;

type BpmnDataElement = {
  resourceId: string;
  processName: string;
  elementId: string;
  elementName: string;
  elementType: string;
  description: string;
  link: string;
  location: string;
  access: string;
  authorizedPeople: string;
  restrictions: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  processEntities: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

const SOURCE_KINDS: SourceKind[] = ['file', 'database', 'application'];

const BPMN_DOCUMENTED_DATA_TYPES = new Set([
  'dataObjectReference',
  'dataStoreReference',
]);
const SOURCE_TEXT_FIELDS = [
  'description',
  'link',
  'location',
  'access',
  'authorizedPeople',
  'restrictions',
] as const;

const optionalText = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string')
    throw new BadRequestException(field + ' must be a string');
  const trimmed = value.trim();
  if (trimmed.length > 10000)
    throw new BadRequestException(field + ' is too long');
  return trimmed || null;
};

const optionalDate = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(field + ' must be a date in YYYY-MM-DD format');
  }
  const parsed = new Date(value + 'T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(field + ' is not a valid calendar date');
  }
  return value;
};

const readAttribute = (node: Record<string, unknown>, name: string): string => {
  const value = node['@_' + name];
  return typeof value === 'string' ? value.trim() : '';
};

const collectXmlText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value))
    return value.map(collectXmlText).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';
  const node = value as Record<string, unknown>;
  if (typeof node['#text'] === 'string') return node['#text'].trim();
  return Object.values(node).map(collectXmlText).filter(Boolean).join(' ');
};

const walk = (
  value: unknown,
  visit: (node: Record<string, unknown>, key: string) => void,
  key = '',
): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visit, key));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const node = value as Record<string, unknown>;
  visit(node, key);
  Object.entries(node).forEach(([childKey, child]) => {
    if (!childKey.startsWith('@_') && childKey !== '#text')
      walk(child, visit, childKey);
  });
};

const extractBpmnDataElements = (
  xml: string,
  resourceId: string,
  processName: string,
): BpmnDataElement[] => {
  if (!xml || xml.length > 1_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    return [];
  try {
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const objectNames = new Map<string, string>();
    const objectDetails = new Map<
      string,
      { description: string; link: string }
    >();
    const inventoryById = new Map<string, Record<string, string>>();
    walk(parsed, (node, key) => {
      if (key === 'dataStore' || key === 'dataObject') {
        const id = readAttribute(node, 'id');
        const name = readAttribute(node, 'name');
        if (id && name) objectNames.set(id, name);
        if (id)
          objectDetails.set(id, {
            description: collectXmlText(node.documentation),
            link: readAttribute(node, 'link'),
          });
      }
      if (key === 'source' && readAttribute(node, 'bpmnType')) {
        const id = readAttribute(node, 'id');
        if (id)
          inventoryById.set(id, {
            description: readAttribute(node, 'description'),
            link: readAttribute(node, 'link'),
            location: readAttribute(node, 'location'),
            access: readAttribute(node, 'access'),
            authorizedPeople: readAttribute(node, 'authorizedPeople'),
            restrictions: readAttribute(node, 'restrictions'),
          });
      }
    });

    const result: BpmnDataElement[] = [];
    const supported = new Set(['dataObjectReference', 'dataStoreReference']);
    walk(parsed, (node, key) => {
      if (!supported.has(key)) return;
      const elementId = readAttribute(node, 'id');
      if (!elementId) return;
      const referenceId =
        key === 'dataStoreReference'
          ? readAttribute(node, 'dataStoreRef')
          : readAttribute(node, 'dataObjectRef');
      const elementName =
        readAttribute(node, 'name') ||
        objectNames.get(referenceId) ||
        elementId;
      const metadata = inventoryById.get(elementId) ?? {};
      const referencedDetails = objectDetails.get(referenceId);
      result.push({
        resourceId,
        processName,
        elementId,
        elementName,
        elementType: key,
        description:
          collectXmlText(node.documentation) ||
          referencedDetails?.description ||
          metadata.description ||
          '',
        link:
          readAttribute(node, 'link') ||
          referencedDetails?.link ||
          metadata.link ||
          '',
        location: metadata.location || '',
        access: metadata.access || '',
        authorizedPeople: metadata.authorizedPeople || '',
        restrictions: metadata.restrictions || '',
      });
    });
    return result;
  } catch {
    return [];
  }
};

@Controller('projects/:projectId/documented-sources')
export class ProjectDocumentedSourceController {
  constructor(
    private readonly access: ProjectResourceAccessService,
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resources: Repository<ResourceTypeOrmEntity>,
    @InjectRepository(ContentTypeOrmEntity)
    private readonly contents: Repository<ContentTypeOrmEntity>,
    @InjectRepository(ProjectDocumentedSourceTypeOrmEntity)
    private readonly sources: Repository<ProjectDocumentedSourceTypeOrmEntity>,
    @InjectRepository(ProjectDocumentedSourceReferenceTypeOrmEntity)
    private readonly references: Repository<ProjectDocumentedSourceReferenceTypeOrmEntity>,
  ) {}

  @Get()
  @UseAcl()
  async list(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );
    const links = await this.projectProcesses.find({ where: { projectId } });
    const resourceIds = [...new Set(links.map((link) => link.resourceId))];
    const resources = resourceIds.length
      ? await this.resources.find({ where: { id: In(resourceIds) } })
      : [];
    const latestContents = resourceIds.length
      ? await this.contents.find({
          where: {
            resourceId: In(resourceIds),
            status: In([ContentStatusEnum.Draft, ContentStatusEnum.Published]),
          },
          order: { version: 'DESC', updatedAt: 'DESC' },
        })
      : [];

    const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
    const contentByResource = new Map<string, ContentTypeOrmEntity>();
    latestContents.forEach((content) => {
      if (!contentByResource.has(content.resourceId))
        contentByResource.set(content.resourceId, content);
    });

    // Reconcile associations against the latest published BPMN model.
    // A missing BPMN element removes only its association; its documented
    // information record is intentionally retained.
    const currentElementsByResource = new Map<string, BpmnDataElement[]>();
    for (const resourceId of resourceIds) {
      const resource = resourceById.get(resourceId);
      const content = contentByResource.get(resourceId);
      if (!resource || !content) continue;
      currentElementsByResource.set(
        resourceId,
        extractBpmnDataElements(content.content, resourceId, resource.name),
      );
    }

    const existingReferences = await this.references.find({
      where: { projectId, elementType: In([...BPMN_DOCUMENTED_DATA_TYPES]) },
    });
    for (const reference of existingReferences) {
      const currentElements = currentElementsByResource.get(reference.resourceId);
      // Do not prune references for a process that has no published version.
      if (!currentElements) continue;
      if (!currentElements.some((element) => element.elementId === reference.elementId)) {
        await this.references.delete({ id: reference.id });
      }
    }

    // First discovery of a BPMN DataSource creates an independent documented
    // information record and its association. originResourceId/originElementId
    // remain on the record after unlinking, preventing an automatic relink.
    for (const [resourceId, elements] of currentElementsByResource) {
      for (const element of elements) {
        const existingReference = await this.references.findOne({
          where: { projectId, resourceId, elementId: element.elementId },
        });
        if (existingReference) continue;

        await this.dataSource.transaction(async (manager) => {
          await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
            projectId + ':' + resourceId + ':' + element.elementId,
          ]);
          const referenceRepository = manager.getRepository(
            ProjectDocumentedSourceReferenceTypeOrmEntity,
          );
          const sourceRepository = manager.getRepository(
            ProjectDocumentedSourceTypeOrmEntity,
          );
          const [reference, origin] = await Promise.all([
            referenceRepository.findOne({
              where: { projectId, resourceId, elementId: element.elementId },
            }),
            sourceRepository.findOne({
              where: {
                projectId,
                originResourceId: resourceId,
                originElementId: element.elementId,
                mergedIntoId: IsNull(),
              },
            }),
          ]);
          if (reference || origin) return;

          const source = await sourceRepository.save(
            sourceRepository.create({
              projectId,
              createdBy: userId,
              kind: element.elementType === 'dataStoreReference' ? 'database' : 'file',
              name: element.elementName,
              description: element.description || null,
              link: element.link || null,
              location: element.location || null,
              access: element.access || null,
              authorizedPeople: element.authorizedPeople || null,
              restrictions: element.restrictions || null,
              originResourceId: resourceId,
              originElementId: element.elementId,
            }),
          );
          await referenceRepository.save(
            referenceRepository.create({
              projectId,
              sourceId: source.id,
              resourceId,
              elementId: element.elementId,
              elementName: element.elementName,
              elementType: element.elementType,
              createdBy: userId,
            }),
          );
        });
      }
    }

    const [sources, references] = await Promise.all([
      this.sources.find({
        where: { projectId, mergedIntoId: IsNull() },
        order: { name: 'ASC' },
      }),
      this.references.find({
        where: { projectId, elementType: In([...BPMN_DOCUMENTED_DATA_TYPES]) },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const referencesBySource = new Map<string, Array<Record<string, unknown>>>();
    references.forEach((reference) => {
      const rows = referencesBySource.get(reference.sourceId) ?? [];
      rows.push({
        id: reference.id,
        resourceId: reference.resourceId,
        processName: resourceById.get(reference.resourceId)?.name ?? reference.resourceId,
        elementId: reference.elementId,
        elementName: reference.elementName,
        elementType: reference.elementType,
      });
      referencesBySource.set(reference.sourceId, rows);
    });

    const linkedKeys = new Set(
      references.map((reference) => reference.resourceId + ':' + reference.elementId),
    );
    const unlinkedReferences: BpmnDataElement[] = [];
    currentElementsByResource.forEach((elements) => {
      elements.forEach((element) => {
        if (!linkedKeys.has(element.resourceId + ':' + element.elementId))
          unlinkedReferences.push(element);
      });
    });

    return {
      sources: sources.map((source) => ({
        ...source,
        references: referencesBySource.get(source.id) ?? [],
      })),
      unlinkedReferences: unlinkedReferences.sort(
        (left, right) =>
          left.processName.localeCompare(right.processName, 'fr') ||
          left.elementName.localeCompare(right.elementName, 'fr'),
      ),
    };
  }

  @Post()
  @UseAcl([UserGroup.RW])
  async create(
    @Param('projectId') projectId: string,
    @Body()
    body: SourceFields & {
      resourceId?: string;
      elementId?: string;
      elementName?: string;
      elementType?: string;
    },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
    );
    const hasReferenceFields = Boolean(
      body.resourceId || body.elementId || body.elementName || body.elementType,
    );
    const reference = hasReferenceFields
      ? await this.validateReference(projectId, body)
      : null;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 255)
      throw new BadRequestException('name must contain 1 to 255 characters');
    const kind = body.kind ?? 'file';
    if (!SOURCE_KINDS.includes(kind))
      throw new BadRequestException('Unsupported source kind');

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      if (reference) {
        const existing = await referenceRepository.findOne({
          where: {
            projectId,
            resourceId: reference.resourceId,
            elementId: reference.elementId,
          },
        });
        if (existing)
          throw new ConflictException(
            'This BPMN element is already linked to a documented source',
          );
      }

      const source = await sourceRepository.save(
        sourceRepository.create({
          projectId,
          createdBy: userId,
          kind,
          name,
          description: optionalText(body.description, 'description'),
          link: optionalText(body.link, 'link'),
          location: optionalText(body.location, 'location'),
          access: optionalText(body.access, 'access'),
          authorizedPeople: optionalText(
            body.authorizedPeople,
            'authorizedPeople',
          ),
          restrictions: optionalText(body.restrictions, 'restrictions'),
          validUntil: optionalDate(body.validUntil, 'validUntil'),
        }),
      );
      if (!reference) return { ...source, references: [] };
      const sourceReference = await referenceRepository.save(
        referenceRepository.create({
          ...reference,
          projectId,
          sourceId: source.id,
          createdBy: userId,
        }),
      );
      return { ...source, references: [sourceReference] };
    });
  }

  @Put(':sourceId')
  @UseAcl([UserGroup.RW])
  async update(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Body() body: Partial<SourceFields>,
    @Headers() headers: RequestHeaders,
  ) {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
    );
    const source = await this.findActiveSource(projectId, sourceId);
    if (body.kind !== undefined) {
      if (!SOURCE_KINDS.includes(body.kind))
        throw new BadRequestException('Unsupported source kind');
      source.kind = body.kind;
    }
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 255)
        throw new BadRequestException('name must contain 1 to 255 characters');
      source.name = name;
    }
    SOURCE_TEXT_FIELDS.forEach((field) => {
      if (body[field] !== undefined)
        source[field] = optionalText(body[field], field);
    });
    if (body.validUntil !== undefined)
      source.validUntil = optionalDate(body.validUntil, 'validUntil');
    return this.sources.save(source);
  }

  @Post(':sourceId/references')
  @UseAcl([UserGroup.RW])
  async addReference(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Body()
    body: {
      resourceId?: string;
      elementId?: string;
      elementName?: string;
      elementType?: string;
    } & Partial<SourceFields>,
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
    );
    const reference = await this.validateReference(projectId, body);

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      const source = await sourceRepository.findOne({
        where: { id: sourceId, projectId, mergedIntoId: IsNull() },
      });
      if (!source) throw new NotFoundException('Documented source not found');

      const existing = await referenceRepository.findOne({
        where: {
          projectId,
          resourceId: reference.resourceId,
          elementId: reference.elementId,
        },
      });
      if (existing) {
        if (existing.sourceId === sourceId) return existing;
        throw new ConflictException(
          'This BPMN element is already linked to another source',
        );
      }

      // Serialize concurrent attempts to reuse one source in the same BPMN resource.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        projectId + ':' + sourceId + ':' + reference.resourceId,
      ]);

      const sourceAlreadyUsedInDiagram = await referenceRepository.findOne({
        where: {
          projectId,
          sourceId,
          resourceId: reference.resourceId,
        },
      });
      if (sourceAlreadyUsedInDiagram) {
        throw new ConflictException(
          'This documented source is already linked to an object in this BPMN diagram',
        );
      }

      SOURCE_TEXT_FIELDS.forEach((field) => {
        if (!(source[field] ?? '').trim() && body[field] !== undefined) {
          source[field] = optionalText(body[field], field);
        }
      });
      await sourceRepository.save(source);

      return referenceRepository.save(
        referenceRepository.create({
          ...reference,
          projectId,
          sourceId,
          createdBy: userId,
        }),
      );
    });
  }

  @Put(':sourceId/references/:referenceId')
  @UseAcl([UserGroup.RW])
  async changeReferenceSource(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Param('referenceId') referenceId: string,
    @Body() body: { targetSourceId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
    );
    const targetSourceId = body.targetSourceId?.trim();
    if (!targetSourceId || targetSourceId === sourceId)
      throw new BadRequestException(
        'targetSourceId must identify another documented source',
      );

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      const [source, target, reference] = await Promise.all([
        sourceRepository.findOne({
          where: { id: sourceId, projectId, mergedIntoId: IsNull() },
        }),
        sourceRepository.findOne({
          where: {
            id: targetSourceId,
            projectId,
            mergedIntoId: IsNull(),
          },
        }),
        referenceRepository.findOne({
          where: { id: referenceId, projectId, sourceId },
        }),
      ]);
      if (!source || !target || !reference)
        throw new NotFoundException('Documented source reference not found');

      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        projectId + ':' + targetSourceId + ':' + reference.resourceId,
      ]);
      const targetAlreadyUsed = await referenceRepository.findOne({
        where: {
          projectId,
          sourceId: targetSourceId,
          resourceId: reference.resourceId,
        },
      });
      if (targetAlreadyUsed && targetAlreadyUsed.id !== reference.id)
        throw new ConflictException(
          'This documented source is already linked to an object in this BPMN diagram',
        );

      reference.sourceId = targetSourceId;
      return referenceRepository.save(reference);
    });
  }

  @Delete(':sourceId/references/:referenceId')
  @UseAcl([UserGroup.RW])
  async unlinkReference(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Param('referenceId') referenceId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
    );
    const reference = await this.references.findOne({
      where: { id: referenceId, projectId, sourceId },
    });
    if (!reference)
      throw new NotFoundException('Documented source reference not found');

    await this.references.delete({ id: reference.id });
    return { unlinked: true, referenceId };
  }

  private async findActiveSource(projectId: string, sourceId: string) {
    const source = await this.sources.findOne({
      where: { id: sourceId, projectId, mergedIntoId: IsNull() },
    });
    if (!source) throw new NotFoundException('Documented source not found');
    return source;
  }

  private async validateReference(
    projectId: string,
    body: {
      resourceId?: string;
      elementId?: string;
      elementName?: string;
      elementType?: string;
    },
  ) {
    const resourceId = body.resourceId?.trim();
    const elementId = body.elementId?.trim();
    const elementName = body.elementName?.trim();
    const elementType = body.elementType?.trim();
    if (!resourceId || !elementId || !elementName || !elementType) {
      throw new BadRequestException(
        'resourceId, elementId, elementName and elementType are required',
      );
    }
    if (
      elementId.length > 255 ||
      elementName.length > 255 ||
      elementType.length > 64
    ) {
      throw new BadRequestException(
        'BPMN element reference contains an oversized field',
      );
    }
    if (!BPMN_DOCUMENTED_DATA_TYPES.has(elementType)) {
      throw new BadRequestException(
        'Only BPMN data objects and data stores can be documented sources',
      );
    }
    const linkedProcess = await this.projectProcesses.findOne({
      where: { projectId, resourceId },
    });
    if (!linkedProcess)
      throw new BadRequestException(
        'The process is not linked to this project',
      );
    return { resourceId, elementId, elementName, elementType };
  }
}
