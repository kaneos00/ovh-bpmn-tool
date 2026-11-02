import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { XMLParser } from 'fast-xml-parser';
import { In, Repository } from 'typeorm';
import { ResourceTypeEnum } from '../ResourceContext/shared/types/Resource';
import { ContentStatusEnum } from '../ResourceContext/shared/types/Content';
import { ResourceTypeOrmEntity } from '../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ContentTypeOrmEntity } from '../ResourceContext/infrastructure/entities/content.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectProcess.ormEntity';
import { ProjectMemberTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectMember.ormEntity';
import {
  ProjectRaciEntryTypeOrmEntity,
  ProjectRaciRole,
} from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciActor.ormEntity';
import { ProjectResourceAccessService } from '../ProjectContext/projectResourceAccess.service';

export type SearchResultType = 'process' | 'bpmn' | 'raci' | 'actor';
export type SearchResultSource = 'resource' | 'bpmn' | 'project-raci' | 'project-actor';
export type UnifiedSearchResult = {
  type: SearchResultType;
  id: string;
  label: string;
  excerpt: string;
  field: string;
  resourceId?: string;
  processName?: string;
  elementId?: string;
  projectId?: string;
  role?: ProjectRaciRole;
  source?: SearchResultSource;
};

export type UnifiedSearchResponse = {
  query: string;
  total: number;
  offset: number;
  limit: number;
  results: UnifiedSearchResult[];
  coverage: {
    readableProcesses: number;
    bpmnDocumentsAvailable: number;
    bpmnDocumentsScanned: number;
    bpmnDocumentsSkipped: number;
    partial: boolean;
  };
};

const MAX_QUERY_LENGTH = 120;
const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;
const MAX_BPMN_DOCUMENTS = 200;
const MAX_BPMN_BYTES = 1_000_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  removeNSPrefix: true,
  processEntities: false,
  allowBooleanAttributes: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

const BPMN_ELEMENT_TYPES: Record<string, string> = {
  task: 'Attività',
  userTask: 'Attività utente',
  serviceTask: 'Attività di servizio',
  manualTask: 'Attività manuale',
  scriptTask: 'Attività script',
  businessRuleTask: 'Attività regola',
  sendTask: 'Attività invio',
  receiveTask: 'Attività ricezione',
  callActivity: 'Call Activity',
  subProcess: 'Sotto-processo',
  transaction: 'Transazione',
  startEvent: 'Evento iniziale',
  endEvent: 'Evento finale',
  intermediateCatchEvent: 'Evento intermedio',
  intermediateThrowEvent: 'Evento intermedio',
  boundaryEvent: 'Evento di confine',
  exclusiveGateway: 'Gateway esclusivo',
  parallelGateway: 'Gateway parallelo',
  inclusiveGateway: 'Gateway inclusivo',
  eventBasedGateway: 'Gateway basato su eventi',
  complexGateway: 'Gateway complesso',
  participant: 'Partecipante',
  lane: 'Lane',
  textAnnotation: 'Annotazione',
};

const ROLE_LABELS: Record<ProjectRaciRole, string> = {
  [ProjectRaciRole.Responsible]: 'Responsabile',
  [ProjectRaciRole.Accountable]: 'Approbateur / redevable',
  [ProjectRaciRole.Consulted]: 'Consulté',
  [ProjectRaciRole.Informed]: 'Informé',
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (Array.isArray(value))
    return value.map(collectText).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value as Record<string, unknown>)
    .filter(
      ([key]) => key === '#text' || key === 'text' || key === 'documentation',
    )
    .map(([, child]) => collectText(child))
    .filter(Boolean)
    .join(' ');
}

const BPMN_ACTIVITY_TYPES = new Set([
  'task',
  'userTask',
  'serviceTask',
  'manualTask',
  'scriptTask',
  'businessRuleTask',
  'sendTask',
  'receiveTask',
  'callActivity',
  'subProcess',
  'transaction',
]);

function readXmlAttribute(node: Record<string, unknown>, name: string): string {
  const value = node[`@_${name}`] ?? node[`@_raci:${name}`];
  return typeof value === 'string' ? value.trim() : '';
}

function parseActorNames(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const names: string[] = [];
      for (const actor of parsed) {
        if (typeof actor === 'string') {
          if (actor.trim()) names.push(actor.trim());
          continue;
        }
        if (actor && typeof actor === 'object') {
          const item = actor as { name?: unknown; active?: unknown };
          const name = typeof item.name === 'string' ? item.name.trim() : '';
          if (name && item.active !== false) names.push(name);
        }
      }
      return [...new Set(names)];
    }
  } catch {
    // Older BPMN files may store actors as a comma-separated list.
  }
  return [
    ...new Set(
      raw
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

export function extractBpmnSearchResults(
  xml: string,
  resourceId: string,
  processName: string,
  normalizedQuery: string,
  requestedTypes?: SearchResultType[],
  roleFilter?: ProjectRaciRole,
): UnifiedSearchResult[] {
  if (
    Buffer.byteLength(xml, 'utf8') > MAX_BPMN_BYTES ||
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  )
    return [];
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const results: UnifiedSearchResult[] = [];
  const includes = (type: SearchResultType) =>
    !requestedTypes?.length || requestedTypes.includes(type);
  const addActor = (name: string, elementId?: string) => {
    if (
      !includes('actor') ||
      !name ||
      !normalizeSearchText(name).includes(normalizedQuery)
    )
      return;
    results.push({
      type: 'actor',
      id: `${resourceId}:actor:${name.toLocaleLowerCase()}`,
      label: name,
      excerpt: 'Attore/ruolo dichiarato nel BPMN',
      field: 'attore',
      resourceId,
      processName,
      elementId,
      source: 'bpmn',
    });
  };

  const visit = (value: unknown, key = ''): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (!value || typeof value !== 'object') return;

    const node = value as Record<string, unknown>;
    const typeLabel = BPMN_ELEMENT_TYPES[key];
    const elementId = readXmlAttribute(node, 'id') || undefined;
    const name = readXmlAttribute(node, 'name');
    const annotationText =
      key === 'textAnnotation' ? collectText(node.text) : '';
    const documentation = collectText(node.documentation);
    const label =
      name || annotationText || (elementId && typeLabel ? typeLabel : '');

    if (typeLabel && includes('bpmn')) {
      const searchableFields = [
        { value: name, field: 'nome' },
        { value: documentation, field: 'descrizione' },
        { value: annotationText, field: 'testo annotazione' },
        { value: elementId ?? '', field: 'identificativo' },
      ];
      const match = searchableFields.find(
        ({ value: fieldValue }) =>
          fieldValue &&
          normalizeSearchText(fieldValue).includes(normalizedQuery),
      );
      if (label && match) {
        results.push({
          type: 'bpmn',
          id: elementId ?? `${resourceId}:${key}:${results.length}`,
          label: `${typeLabel}: ${label}`,
          excerpt: match.value.slice(0, 240),
          field: match.field,
          resourceId,
          processName,
          elementId,
          source: 'bpmn',
        });
      }
    }

    // The Viewer derives actors from process metadata, lanes, pools and
    // explicit RACI attributes. Search those same BPMN sources rather than
    // relying only on the separate project RACI tables.
    if (includes('actor')) {
      if (key === 'process') {
        parseActorNames(readXmlAttribute(node, 'actors')).forEach((actor) =>
          addActor(actor),
        );
      }
      if (key === 'lane' || key === 'participant') addActor(name, elementId);
    }

    if (BPMN_ACTIVITY_TYPES.has(key)) {
      const activityLabel = name || elementId || 'Attività';
      const roleAttributes: Array<[ProjectRaciRole, string]> = [
        [ProjectRaciRole.Responsible, 'responsible'],
        [ProjectRaciRole.Accountable, 'accountable'],
        [ProjectRaciRole.Consulted, 'consulted'],
        [ProjectRaciRole.Informed, 'informed'],
      ];
      for (const [role, attribute] of roleAttributes) {
        if (roleFilter && role !== roleFilter) continue;
        const actorNames = readXmlAttribute(node, attribute)
          .split(',')
          .map((actor) => actor.trim())
          .filter(Boolean);
        for (const actorName of actorNames) {
          addActor(actorName, elementId);
          if (!includes('raci')) continue;
          const roleLabel = ROLE_LABELS[role];
          const match = [
            { value: activityLabel, field: 'attività' },
            { value: actorName, field: 'attore' },
            { value: roleLabel, field: 'responsabilità' },
            { value: role, field: 'responsabilità' },
          ].find(({ value }) =>
            normalizeSearchText(value).includes(normalizedQuery),
          );
          if (match) {
            results.push({
              type: 'raci',
              id: `${resourceId}:${elementId ?? key}:${role}:${actorName}`,
              label: `${activityLabel} — ${actorName} (${role})`,
              excerpt: `${actorName} · ${role} — ${roleLabel}`,
              field: match.field,
              resourceId,
              processName,
              elementId,
              role,
              source: 'bpmn',
            });
          }
        }
      }
    }

    Object.entries(node).forEach(([childKey, child]) => {
      if (!childKey.startsWith('@_') && childKey !== '#text')
        visit(child, childKey);
    });
  };

  visit(parsed);
  return results;
}

@Injectable()
export class UnifiedSearchService {
  constructor(
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resources: Repository<ResourceTypeOrmEntity>,
    @InjectRepository(ContentTypeOrmEntity)
    private readonly contents: Repository<ContentTypeOrmEntity>,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ProjectMemberTypeOrmEntity)
    private readonly projectMembers: Repository<ProjectMemberTypeOrmEntity>,
    @InjectRepository(ProjectRaciEntryTypeOrmEntity)
    private readonly raciEntries: Repository<ProjectRaciEntryTypeOrmEntity>,
    @InjectRepository(ProjectRaciActorTypeOrmEntity)
    private readonly raciActors: Repository<ProjectRaciActorTypeOrmEntity>,
    private readonly resourceAccess: ProjectResourceAccessService,
  ) {}

  async search(
    rawQuery: string,
    headers: Record<string, string | undefined>,
    options: {
      types?: SearchResultType[];
      source?: SearchResultSource;
      resourceId?: string;
      role?: ProjectRaciRole;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<UnifiedSearchResponse> {
    if (typeof rawQuery !== 'string' || rawQuery.trim().length < 2) {
      throw new BadRequestException('q must contain at least 2 characters');
    }
    if (rawQuery.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(
        `q must contain at most ${MAX_QUERY_LENGTH} characters`,
      );
    }
    const limit = options.limit ?? 30;
    const offset = options.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new BadRequestException(`limit must be between 1 and ${MAX_LIMIT}`);
    }
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
      throw new BadRequestException(
        `offset must be between 0 and ${MAX_OFFSET}`,
      );
    }

    const requestedTypes = options.types?.length
      ? new Set(options.types)
      : null;
    const includes = (type: SearchResultType) =>
      !requestedTypes || requestedTypes.has(type);
    const query = rawQuery.trim();
    const normalizedQuery = normalizeSearchText(query);
    const allResources = await this.resources.find({
      where: { type: ResourceTypeEnum.Process },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        type: true,
      },
    });
    const allReadableResources =
      await this.resourceAccess.filterReadableResources(allResources, headers);
    const readableResources = options.resourceId
      ? allReadableResources.filter((resource) => resource.id === options.resourceId)
      : allReadableResources;
    const resourceById = new Map(
      readableResources.map((resource) => [resource.id, resource]),
    );
    const results: UnifiedSearchResult[] = [];

    if (includes('process')) {
      for (const resource of readableResources) {
        const fields = [
          { value: resource.name, field: 'nome' },
          { value: resource.description ?? '', field: 'descrizione' },
          { value: resource.id, field: 'identificativo' },
        ];
        const match = fields.find(({ value }) =>
          normalizeSearchText(value).includes(normalizedQuery),
        );
        if (match) {
          results.push({
            type: 'process',
            id: resource.id,
            label: resource.name,
            excerpt: match.value.slice(0, 240),
            field: match.field,
            resourceId: resource.id,
            processName: resource.name,
            source: 'resource',
          });
        }
      }
    }

    const needsProjectData = includes('raci') || includes('actor');
    const memberships = needsProjectData
      ? await this.projectMembers.find({
          where: {
            userId: this.resourceAccess.getAuthenticatedUserId(headers),
          },
          select: { projectId: true },
        })
      : [];
    const allowedProjectIds = [
      ...new Set(memberships.map((membership) => membership.projectId)),
    ];

    let bpmnDocumentsAvailable = 0;
    let bpmnDocumentsScanned = 0;
    let bpmnDocumentsSkipped = 0;
    const resourceIds = [...resourceById.keys()];

    const includesXmlSources =
      includes('bpmn') || includes('raci') || includes('actor');
    if (includesXmlSources && resourceIds.length) {
      bpmnDocumentsAvailable = await this.contents.count({
        where: {
          resourceId: In(resourceIds),
          status: ContentStatusEnum.Published,
        },
      });
      const [documents] = await this.contents
        .createQueryBuilder('content')
        .select([
          'content.id',
          'content.resourceId',
          'content.content',
          'content.updatedAt',
        ])
        .where('content.resourceId IN (:...resourceIds)', { resourceIds })
        .andWhere('content.status = :status', {
          status: ContentStatusEnum.Published,
        })
        .andWhere('octet_length(content.content) <= :maxBytes', {
          maxBytes: MAX_BPMN_BYTES,
        })
        .orderBy('content.updatedAt', 'DESC')
        .take(MAX_BPMN_DOCUMENTS)
        .getManyAndCount();

      bpmnDocumentsScanned = documents.length;
      bpmnDocumentsSkipped = Math.max(
        0,
        bpmnDocumentsAvailable - documents.length,
      );
      for (const document of documents) {
        const resource = resourceById.get(document.resourceId);
        if (!resource) continue;
        try {
          results.push(
            ...extractBpmnSearchResults(
              document.content,
              document.resourceId,
              resource.name,
              normalizedQuery,
              options.types,
              options.role,
            ),
          );
        } catch {
          bpmnDocumentsSkipped += 1;
        }
      }
    }

    if (allowedProjectIds.length && (includes('raci') || includes('actor'))) {
      let actorProjectIds = options.resourceId ? [] : allowedProjectIds;
      if (resourceIds.length) {
        const links = await this.projectProcesses.find({
          where: {
            projectId: In(allowedProjectIds),
            resourceId: In(resourceIds),
          },
          select: { projectId: true, resourceId: true },
        });
        if (options.resourceId) {
          actorProjectIds = [...new Set(links.map((link) => link.projectId))];
        }
        if (includes('raci') && links.length) {
          const entries = await this.raciEntries.find({
            where: links.map((link) => ({
              projectId: link.projectId,
              resourceId: link.resourceId,
            })),
          });
          for (const entry of entries) {
            const roleLabel = ROLE_LABELS[entry.role];
            const values = [
              { value: entry.taskName, field: 'attività' },
              { value: entry.actorName, field: 'attore' },
              { value: roleLabel, field: 'responsabilità' },
              { value: entry.taskId, field: 'identificativo attività' },
            ];
            const match = values.find(({ value }) =>
              normalizeSearchText(value).includes(normalizedQuery),
            );
            if (match) {
              results.push({
                type: 'raci',
                id: `${entry.projectId}:${entry.resourceId}:${entry.taskId}:${entry.actorName}`,
                label: `${entry.taskName} — ${entry.actorName} (${entry.role})`,
                excerpt: `${match.value} · ${roleLabel}`,
                field: match.field,
                resourceId: entry.resourceId,
                processName: resourceById.get(entry.resourceId)?.name,
                elementId: entry.taskId,
                projectId: entry.projectId,
                role: entry.role,
                source: 'project-raci',
              });
            }
          }
        }
      }

      if (includes('actor') && actorProjectIds.length) {
        const actors = await this.raciActors.find({
          where: { projectId: In(actorProjectIds), active: true },
        });
        for (const actor of actors) {
          if (!normalizeSearchText(actor.name).includes(normalizedQuery))
            continue;
          results.push({
            type: 'actor',
            id: `${actor.projectId}:${actor.id}`,
            label: actor.name,
            excerpt: 'Attore registrato nel progetto',
            field: 'attore',
            projectId: actor.projectId,
            source: 'project-actor',
          });
        }
      }
    }

    const sourceFilteredResults = options.source
      ? results.filter((result) => result.source === options.source)
      : results;
    const uniqueByKey = new Map<string, UnifiedSearchResult>();
    for (const result of sourceFilteredResults) {
      const key = `${result.type}:${result.resourceId ?? ''}:${result.projectId ?? ''}:${result.id}`;
      uniqueByKey.set(key, result);
    }
    const uniqueResults = [...uniqueByKey.values()];
    const typeOrder: Record<SearchResultType, number> = {
      process: 0,
      bpmn: 1,
      raci: 2,
      actor: 3,
    };
    uniqueResults.sort(
      (left, right) =>
        typeOrder[left.type] - typeOrder[right.type] ||
        left.label.localeCompare(right.label, 'fr'),
    );

    return {
      query,
      total: uniqueResults.length,
      offset,
      limit,
      results: uniqueResults.slice(offset, offset + limit),
      coverage: {
        readableProcesses: readableResources.length,
        bpmnDocumentsAvailable,
        bpmnDocumentsScanned,
        bpmnDocumentsSkipped,
        partial: includesXmlSources && bpmnDocumentsSkipped > 0,
      },
    };
  }
}
