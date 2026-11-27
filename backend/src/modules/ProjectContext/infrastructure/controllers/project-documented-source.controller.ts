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
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { XMLParser } from 'fast-xml-parser';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ProjectMemberRole } from '../entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../entities/projectProcess.ormEntity';
import { ProjectDocumentedSourceTypeOrmEntity } from '../entities/projectDocumentedSource.ormEntity';
import { ProjectDocumentedSourceReferenceTypeOrmEntity } from '../entities/projectDocumentedSourceReference.ormEntity';
import { ProjectDocumentedSourceProcessTypeOrmEntity } from '../entities/projectDocumentedSourceProcess.ormEntity';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';

type RequestHeaders = Record<string, string | undefined>;
type SourceKind = 'file' | 'database' | 'application' | 'form';
type SourceFields = Pick<
  ProjectDocumentedSourceTypeOrmEntity,
  | 'kind'
  | 'name'
  | 'description'
  | 'link'
  | 'location'
  | 'access'
  | 'retention'
  | 'validUntil'
  | 'containsPersonalData'
  | 'authorizedPeople'
  | 'restrictions'
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
  retention: string;
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

const SOURCE_KINDS: SourceKind[] = ['file', 'database', 'application', 'form'];

const BPMN_DOCUMENTED_DATA_TYPES = new Set([
  'dataObjectReference',
  'dataStoreReference',
]);
const BPMN_DISPLAYED_DATA_TYPES = new Set([
  'dataObjectReference',
  'dataStoreReference',
]);
const SOURCE_TEXT_FIELDS = [
  'description',
  'link',
  'location',
  'access',
  'retention',
  'authorizedPeople',
  'restrictions',
] as const;

const optionalDate = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('validUntil must be a valid YYYY-MM-DD date');
  }
  const date = new Date(value + 'T00:00:00.000Z');
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException('validUntil must be a valid YYYY-MM-DD date');
  }
  return value;
};

const optionalBoolean = (value: unknown, field: string): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean')
    throw new BadRequestException(field + ' must be a boolean');
  return value;
};

const optionalText = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string')
    throw new BadRequestException(field + ' must be a string');
  const trimmed = value.trim();
  if (trimmed.length > 10000)
    throw new BadRequestException(field + ' is too long');
  return trimmed || null;
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

export const extractBpmnDataElements = (
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
            retention: readAttribute(node, 'retention'),
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
        retention: metadata.retention || '',
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
    @InjectRepository(ProjectDocumentedSourceProcessTypeOrmEntity)
    private readonly sourceProcesses: Repository<ProjectDocumentedSourceProcessTypeOrmEntity>,
  ) {}

  @Get()
  @UseAcl()
  async list(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
    @Query('resourceId') requestedResourceId?: string,
  ) {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
      { allowOrganizationAdmin: true },
    );
    const [allSources, references, links, memberships] = await Promise.all([
      this.sources.find({
        where: { projectId, mergedIntoId: IsNull() },
        order: { name: 'ASC' },
      }),
      this.references.find({
        where: { projectId, elementType: In([...BPMN_DISPLAYED_DATA_TYPES]) },
        order: { createdAt: 'ASC' },
      }),
      this.projectProcesses.find({ where: { projectId } }),
      this.sourceProcesses.find({ where: { projectId } }),
    ]);
    const sources = requestedResourceId
      ? allSources.filter(
          (source) =>
            memberships.some(
              (membership) =>
                membership.sourceId === source.id &&
                membership.resourceId === requestedResourceId,
            ) ||
            references.some(
              (reference) =>
                reference.sourceId === source.id &&
                reference.resourceId === requestedResourceId,
            ),
        )
      : allSources;

    const linkedResourceIds = [
      ...new Set(links.map((link) => link.resourceId)),
    ];
    if (
      requestedResourceId &&
      !linkedResourceIds.includes(requestedResourceId)
    ) {
      throw new BadRequestException(
        'The process is not linked to this project',
      );
    }
    const resourceIds = requestedResourceId
      ? [requestedResourceId]
      : linkedResourceIds;
    const scopedReferences = requestedResourceId
      ? references.filter(
          (reference) => reference.resourceId === requestedResourceId,
        )
      : references;
    const resources = resourceIds.length
      ? await this.resources.find({ where: { id: In(resourceIds) } })
      : [];
    // Documented metadata can be present in the current draft before a
    // process is published. Prefer the newest content for each resource,
    // regardless of status, otherwise newly-created project processes have
    // no discoverable BPMN data elements and the project registry looks empty.
    const processContents = resourceIds.length
      ? await this.contents.find({
          where: { resourceId: In(resourceIds) },
          order: { version: 'DESC', updatedAt: 'DESC' },
        })
      : [];

    const resourceById = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    const contentByResource = new Map<string, ContentTypeOrmEntity>();
    processContents.forEach((content) => {
      if (!contentByResource.has(content.resourceId))
        contentByResource.set(content.resourceId, content);
    });

    // Resolve the displayed BPMN object name from the latest process XML.
    // The persisted association keeps its stable elementId; its cached
    // elementName must not become the source of truth after a diagram rename.
    const bpmnElementByKey = new Map<string, BpmnDataElement>();
    resourceIds.forEach((resourceId) => {
      const resource = resourceById.get(resourceId);
      const content = contentByResource.get(resourceId);
      if (!resource || !content) return;
      extractBpmnDataElements(
        content.content,
        resourceId,
        resource.name,
      ).forEach((element) => {
        bpmnElementByKey.set(
          element.resourceId + ':' + element.elementId,
          element,
        );
      });
    });

    const referencesBySource = new Map<
      string,
      Array<Record<string, unknown>>
    >();
    scopedReferences.forEach((reference) => {
      const rows = referencesBySource.get(reference.sourceId) ?? [];
      const currentElement = bpmnElementByKey.get(
        reference.resourceId + ':' + reference.elementId,
      );
      rows.push({
        id: reference.id,
        resourceId: reference.resourceId,
        processName:
          resourceById.get(reference.resourceId)?.name ?? reference.resourceId,
        elementId: reference.elementId,
        elementName: currentElement?.elementName ?? reference.elementName,
        elementType: reference.elementType,
      });
      referencesBySource.set(reference.sourceId, rows);
    });

    const linkedKeys = new Set(
      scopedReferences.map(
        (reference) => reference.resourceId + ':' + reference.elementId,
      ),
    );
    const unlinkedReferences: BpmnDataElement[] = [];
    resourceIds.forEach((resourceId) => {
      const resource = resourceById.get(resourceId);
      const content = contentByResource.get(resourceId);
      if (!resource || !content) return;
      extractBpmnDataElements(
        content.content,
        resourceId,
        resource.name,
      ).forEach((element) => {
        if (!linkedKeys.has(element.resourceId + ':' + element.elementId))
          unlinkedReferences.push(element);
      });
    });

    return {
      sources: sources.map((source) => {
        const sourceProcesses = memberships
          .filter((membership) => membership.sourceId === source.id)
          .map((membership) => ({
            resourceId: membership.resourceId,
            processName:
              resourceById.get(membership.resourceId)?.name ??
              membership.resourceId,
          }));
        return {
          ...source,
          processName: requestedResourceId
            ? (resourceById.get(requestedResourceId)?.name ??
              requestedResourceId)
            : (sourceProcesses[0]?.processName ?? null),
          processes: sourceProcesses,
          references: referencesBySource.get(source.id) ?? [],
        };
      }),
      processes: links
        .map((link) => ({
          resourceId: link.resourceId,
          processName:
            resourceById.get(link.resourceId)?.name ?? link.resourceId,
        }))
        .sort((left, right) =>
          left.processName.localeCompare(right.processName, 'fr'),
        ),
      unlinkedReferences: unlinkedReferences.sort(
        (left, right) =>
          left.processName.localeCompare(right.processName, 'fr') ||
          left.elementName.localeCompare(right.elementName, 'fr'),
      ),
    };
  }

  @Post('synchronize')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
  async synchronize(
    @Param('projectId') projectId: string,
    @Body() body: { resourceId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
      { allowOrganizationAdmin: true },
    );
    const resourceId = body.resourceId?.trim();
    if (!resourceId) throw new BadRequestException('resourceId is required');
    const process = await this.validateProcess(projectId, resourceId);
    const [resource, content] = await Promise.all([
      this.resources.findOne({ where: { id: resourceId } }),
      this.contents.findOne({
        where: { resourceId },
        order: { version: 'DESC', updatedAt: 'DESC' },
      }),
    ]);
    if (!resource || !content) return { created: 0, skipped: 0 };
    const elements = extractBpmnDataElements(
      content.content,
      resourceId,
      resource.name || process.resourceId,
    );

    let created = 0;
    let skipped = 0;
    for (const element of elements) {
      const elementName = element.elementName.slice(0, 255);
      const wasCreated = await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          projectId + ':' + resourceId + ':' + element.elementId,
        ]);
        const sourceRepository = manager.getRepository(
          ProjectDocumentedSourceTypeOrmEntity,
        );
        const referenceRepository = manager.getRepository(
          ProjectDocumentedSourceReferenceTypeOrmEntity,
        );
        const membershipRepository = manager.getRepository(
          ProjectDocumentedSourceProcessTypeOrmEntity,
        );
        const existing = await referenceRepository.findOne({
          where: {
            projectId,
            resourceId,
            elementId: element.elementId,
          },
        });
        if (existing) return false;

        const source = await sourceRepository.save(
          sourceRepository.create({
            projectId,
            createdBy: userId,
            kind:
              element.elementType === 'dataStoreReference'
                ? 'database'
                : 'file',
            name: elementName,
            description: optionalText(element.description, 'description'),
            link: optionalText(element.link, 'link'),
            location: optionalText(element.location, 'location'),
            access: optionalText(element.access, 'access'),
            retention: optionalText(element.retention, 'retention'),
            validUntil: null,
            containsPersonalData: false,
            authorizedPeople: optionalText(
              element.authorizedPeople,
              'authorizedPeople',
            ),
            restrictions: optionalText(element.restrictions, 'restrictions'),
          }),
        );
        await referenceRepository.save(
          referenceRepository.create({
            projectId,
            sourceId: source.id,
            resourceId,
            elementId: element.elementId,
            elementName,
            elementType: element.elementType,
            createdBy: userId,
          }),
        );
        await membershipRepository.save(
          membershipRepository.create({
            projectId,
            sourceId: source.id,
            resourceId,
            createdBy: userId,
          }),
        );
        return true;
      });
      if (wasCreated) created += 1;
      else skipped += 1;
    }

    return { created, skipped };
  }

  @Post()
  @UseAcl([UserGroup.RW, UserGroup.Admin])
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
      { allowOrganizationAdmin: true },
    );
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 255)
      throw new BadRequestException('name must contain 1 to 255 characters');
    const kind = body.kind ?? 'file';
    if (!SOURCE_KINDS.includes(kind))
      throw new BadRequestException('Unsupported source kind');
    const resourceId = body.resourceId?.trim();
    if (resourceId) await this.validateProcess(projectId, resourceId);
    const hasReferenceFields = Boolean(
      body.elementId || body.elementName || body.elementType,
    );
    const reference = hasReferenceFields
      ? await this.validateReference(projectId, { ...body, resourceId })
      : null;

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      const membershipRepository = manager.getRepository(
        ProjectDocumentedSourceProcessTypeOrmEntity,
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
          retention: optionalText(body.retention, 'retention'),
          validUntil: optionalDate(body.validUntil),
          containsPersonalData: optionalBoolean(
            body.containsPersonalData,
            'containsPersonalData',
          ),
          authorizedPeople: optionalText(
            body.authorizedPeople,
            'authorizedPeople',
          ),
          restrictions: optionalText(body.restrictions, 'restrictions'),
        }),
      );
      if (resourceId) {
        await membershipRepository.save(
          membershipRepository.create({
            projectId,
            sourceId: source.id,
            resourceId,
            createdBy: userId,
          }),
        );
      }
      if (!reference) return { ...source, references: [] };
      const sourceReference = await referenceRepository.save(
        referenceRepository.create({
          ...reference,
          projectId,
          sourceId: source.id,
          createdBy: userId,
        }),
      );
      if (resourceId) {
        const existingMembership = await membershipRepository.findOne({
          where: { projectId, sourceId: source.id, resourceId },
        });
        if (!existingMembership) {
          await membershipRepository.save(
            membershipRepository.create({
              projectId,
              sourceId: source.id,
              resourceId,
              createdBy: userId,
            }),
          );
        }
      }
      return { ...source, references: [sourceReference] };
    });
  }

  @Put(':sourceId')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
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
      { allowOrganizationAdmin: true },
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
    if (body.validUntil !== undefined) {
      source.validUntil = optionalDate(body.validUntil);
    }
    if (body.containsPersonalData !== undefined) {
      source.containsPersonalData = optionalBoolean(
        body.containsPersonalData,
        'containsPersonalData',
      );
    }
    return this.sources.save(source);
  }

  @Post(':sourceId/references')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
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
      { allowOrganizationAdmin: true },
    );
    const reference = await this.validateReference(projectId, body);

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      const membershipRepository = manager.getRepository(
        ProjectDocumentedSourceProcessTypeOrmEntity,
      );
      // Lock the source row so deletion cannot race with a new BPMN association.
      const source = await sourceRepository.findOne({
        where: { id: sourceId, projectId, mergedIntoId: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source) throw new NotFoundException('Documented source not found');
      // A project-level documented source may be referenced from any process
      // in the project when the BPMN data store represents the same file/database.
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

      // A documented source may be reused by several BPMN elements,
      // including several elements in the same diagram. The unique
      // project/resource/element index prevents duplicate element links.
      SOURCE_TEXT_FIELDS.forEach((field) => {
        if (!(source[field] ?? '').trim() && body[field] !== undefined) {
          source[field] = optionalText(body[field], field);
        }
      });
      await sourceRepository.save(source);

      const savedReference = await referenceRepository.save(
        referenceRepository.create({
          ...reference,
          projectId,
          sourceId,
          createdBy: userId,
        }),
      );
      const existingMembership = await membershipRepository.findOne({
        where: {
          projectId,
          sourceId,
          resourceId: reference.resourceId,
        },
      });
      if (!existingMembership) {
        await membershipRepository.save(
          membershipRepository.create({
            projectId,
            sourceId,
            resourceId: reference.resourceId,
            createdBy: userId,
          }),
        );
      }
      return savedReference;
    });
  }

  @Put(':sourceId/references/:referenceId')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
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
      { allowOrganizationAdmin: true },
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
      const membershipRepository = manager.getRepository(
        ProjectDocumentedSourceProcessTypeOrmEntity,
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
          lock: { mode: 'pessimistic_write' },
        }),
        referenceRepository.findOne({
          where: { id: referenceId, projectId, sourceId },
        }),
      ]);
      if (!source || !target || !reference)
        throw new NotFoundException('Documented source reference not found');
      // Associations are project-scoped, not restricted to the source's
      // owning process. The target reference itself remains process-specific.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        projectId + ':' + targetSourceId + ':' + reference.resourceId,
      ]);
      const targetAlreadyUsed = await referenceRepository.findOne({
        where: {
          projectId,
          resourceId: reference.resourceId,
          elementId: reference.elementId,
        },
      });
      if (targetAlreadyUsed && targetAlreadyUsed.id !== reference.id)
        throw new ConflictException(
          'This documented source is already linked to an object in this BPMN diagram',
        );

      reference.sourceId = targetSourceId;
      const savedReference = await referenceRepository.save(reference);
      const targetMembership = await membershipRepository.findOne({
        where: {
          projectId,
          sourceId: targetSourceId,
          resourceId: reference.resourceId,
        },
      });
      if (!targetMembership) {
        await membershipRepository.save(
          membershipRepository.create({
            projectId,
            sourceId: targetSourceId,
            resourceId: reference.resourceId,
            createdBy: source.createdBy,
          }),
        );
      }
      return savedReference;
    });
  }

  @Post(':sourceId/processes')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
  async addProcessMembership(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Body() body: { resourceId?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
      { allowOrganizationAdmin: true },
    );
    const resourceId = body.resourceId?.trim();
    if (!resourceId) throw new BadRequestException('resourceId is required');
    await this.validateProcess(projectId, resourceId);

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const membershipRepository = manager.getRepository(
        ProjectDocumentedSourceProcessTypeOrmEntity,
      );
      const source = await sourceRepository.findOne({
        where: { id: sourceId, projectId, mergedIntoId: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source) throw new NotFoundException('Documented source not found');
      const existing = await membershipRepository.findOne({
        where: { projectId, sourceId, resourceId },
      });
      if (existing) return existing;
      return membershipRepository.save(
        membershipRepository.create({
          projectId,
          sourceId,
          resourceId,
          createdBy: userId,
        }),
      );
    });
  }

  @Delete(':sourceId/processes/:resourceId')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
  async removeProcessMembership(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Param('resourceId') resourceId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
      { allowOrganizationAdmin: true },
    );
    await this.validateProcess(projectId, resourceId);
    const referenceCount = await this.references.count({
      where: { projectId, sourceId, resourceId },
    });
    if (referenceCount > 0) {
      throw new ConflictException(
        'Cette information est encore liée à un objet BPMN de ce processus. Supprimez d’abord ce lien.',
      );
    }
    const membership = await this.sourceProcesses.findOne({
      where: { projectId, sourceId, resourceId },
    });
    if (!membership) {
      throw new NotFoundException('Process membership not found');
    }
    await this.sourceProcesses.delete({ id: membership.id });
    return { removed: true, sourceId, resourceId };
  }

  @Delete(':sourceId')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
  async deleteSource(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
      { allowOrganizationAdmin: true },
    );

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      const source = await sourceRepository.findOne({
        where: { id: sourceId, projectId, mergedIntoId: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source) throw new NotFoundException('Documented source not found');

      const referenceCount = await referenceRepository.count({
        where: { projectId, sourceId },
      });
      if (referenceCount > 0) {
        throw new ConflictException(
          'Impossible de supprimer cette information documentée : elle est encore associée à un ou plusieurs objets BPMN. Déliez d’abord tous ses objets BPMN.',
        );
      }

      await sourceRepository.delete({ id: sourceId, projectId });
      return { deleted: true, sourceId };
    });
  }

  @Delete(':sourceId/references/:referenceId')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
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
      { allowOrganizationAdmin: true },
    );
    const reference = await this.references.findOne({
      where: { id: referenceId, projectId, sourceId },
    });
    if (!reference)
      throw new NotFoundException('Documented source reference not found');

    await this.references.delete({ id: reference.id });
    return { unlinked: true, referenceId };
  }

  @Post(':sourceId/merge')
  @UseAcl([UserGroup.RW, UserGroup.Admin])
  async merge(
    @Param('projectId') projectId: string,
    @Param('sourceId') sourceId: string,
    @Body()
    body: {
      targetSourceId?: string;
      name?: string;
      description?: string | null;
    },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Admin,
      { allowOrganizationAdmin: true },
    );
    const targetId = body.targetSourceId?.trim();
    if (!targetId || targetId === sourceId)
      throw new BadRequestException(
        'targetSourceId must identify another source',
      );

    return this.dataSource.transaction(async (manager) => {
      const sourceRepository = manager.getRepository(
        ProjectDocumentedSourceTypeOrmEntity,
      );
      const referenceRepository = manager.getRepository(
        ProjectDocumentedSourceReferenceTypeOrmEntity,
      );
      // Lock both rows in a stable order to avoid deadlocks between
      // simultaneous merge operations and serialize against deletion.
      const [firstId, secondId] = [sourceId, targetId].sort();
      const firstSource = await sourceRepository.findOne({
        where: { id: firstId, projectId, mergedIntoId: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      const secondSource = await sourceRepository.findOne({
        where: { id: secondId, projectId, mergedIntoId: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      const source = sourceId === firstId ? firstSource : secondSource;
      const target = targetId === firstId ? firstSource : secondSource;
      if (!source || !target)
        throw new NotFoundException(
          'Documented source not found in this project',
        );
      // Several BPMN elements in one diagram may reference the same
      // documented source. Duplicate references to the same element are
      // consolidated below; distinct elements are all retained.
      const conflictingFields =
        source.link?.trim() &&
        target.link?.trim() &&
        source.link.trim() !== target.link.trim()
          ? ['link']
          : [];
      if (conflictingFields.length) {
        throw new ConflictException(
          'Fusion impossible : les liens sont différents. Choisissez le lien à conserver avant de recommencer.',
        );
      }

      SOURCE_TEXT_FIELDS.forEach((field) => {
        const sourceValue = (source[field] ?? '').trim();
        const targetValue = (target[field] ?? '').trim();
        if (!targetValue && sourceValue) {
          target[field] = sourceValue;
        } else if (
          field !== 'link' &&
          sourceValue &&
          targetValue &&
          sourceValue !== targetValue
        ) {
          const separator =
            field === 'description' || field === 'restrictions'
              ? '\n\n'
              : ' ; ';
          target[field] = [targetValue, sourceValue].join(separator);
        }
      });
      if (!target.name.trim() && source.name.trim()) target.name = source.name;
      if (body.name !== undefined) {
        const mergedName = body.name.trim();
        if (!mergedName || mergedName.length > 255)
          throw new BadRequestException(
            'name must contain 1 to 255 characters',
          );
        target.name = mergedName;
      }
      if (body.description !== undefined)
        target.description = optionalText(body.description, 'description');
      target.containsPersonalData =
        target.containsPersonalData || source.containsPersonalData;
      if (
        !target.validUntil ||
        (source.validUntil && source.validUntil < target.validUntil)
      ) {
        target.validUntil = source.validUntil;
      }
      await sourceRepository.save(target);

      const membershipRepository = manager.getRepository(
        ProjectDocumentedSourceProcessTypeOrmEntity,
      );
      const sourceMemberships = await membershipRepository.find({
        where: { projectId, sourceId },
      });
      for (const membership of sourceMemberships) {
        const existingMembership = await membershipRepository.findOne({
          where: {
            projectId,
            sourceId: targetId,
            resourceId: membership.resourceId,
          },
        });
        if (!existingMembership) {
          await membershipRepository.save(
            membershipRepository.create({
              projectId,
              sourceId: targetId,
              resourceId: membership.resourceId,
              createdBy: userId,
            }),
          );
        }
        await membershipRepository.delete({ id: membership.id });
      }

      const sourceReferences = await referenceRepository.find({
        where: { projectId, sourceId },
      });
      for (const reference of sourceReferences) {
        const duplicate = await referenceRepository.findOne({
          where: {
            projectId,
            resourceId: reference.resourceId,
            elementId: reference.elementId,
          },
        });
        if (duplicate && duplicate.id !== reference.id) {
          await referenceRepository.delete({ id: reference.id });
        } else {
          reference.sourceId = targetId;
          await referenceRepository.save(reference);
        }
      }

      source.mergedIntoId = targetId;
      source.mergedAt = new Date();
      source.mergedBy = userId;
      await sourceRepository.save(source);
      return { merged: true, sourceId, targetSourceId: targetId };
    });
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
        'Only BPMN data objects and data stores can be associated with documented sources',
      );
    }
    await this.validateProcess(projectId, resourceId);
    return { resourceId, elementId, elementName, elementType };
  }

  private async validateProcess(projectId: string, resourceId: string) {
    const linkedProcess = await this.projectProcesses.findOne({
      where: { projectId, resourceId },
    });
    if (!linkedProcess)
      throw new BadRequestException(
        'The process is not linked to this project',
      );
    return linkedProcess;
  }
}
