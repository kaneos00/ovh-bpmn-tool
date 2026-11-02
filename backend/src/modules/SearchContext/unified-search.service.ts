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
import { ProjectRaciEntryTypeOrmEntity, ProjectRaciRole } from '../ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../ProjectContext/infrastructure/entities/projectRaciActor.ormEntity';
import { ProjectResourceAccessService } from '../ProjectContext/projectResourceAccess.service';

export type SearchResultType = 'process' | 'bpmn' | 'raci' | 'actor';
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
  [ProjectRaciRole.Accountable]: 'Approvatore',
  [ProjectRaciRole.Consulted]: 'Consultato',
  [ProjectRaciRole.Informed]: 'Informato',
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
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => key === '#text' || key === 'text' || key === 'documentation')
    .map(([, child]) => collectText(child))
    .filter(Boolean)
    .join(' ');
}

export function extractBpmnSearchResults(
  xml: string,
  resourceId: string,
  processName: string,
  normalizedQuery: string,
): UnifiedSearchResult[] {
  if (Buffer.byteLength(xml, 'utf8') > MAX_BPMN_BYTES) return [];
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const results: UnifiedSearchResult[] = [];

  const visit = (value: unknown, key = ''): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (!value || typeof value !== 'object') return;

    const node = value as Record<string, unknown>;
    const typeLabel = BPMN_ELEMENT_TYPES[key];
    if (typeLabel) {
      const attributes = node;
      const elementId = typeof attributes['@_id'] === 'string' ? attributes['@_id'] : undefined;
      const name = typeof attributes['@_name'] === 'string' ? attributes['@_name'] : '';
      const annotationText = key === 'textAnnotation' ? collectText(node.text) : '';
      const documentation = collectText(node.documentation);
      const label = name || annotationText || (elementId ? typeLabel : '');
      const searchableFields = [
        { value: name, field: 'nome' },
        { value: documentation, field: 'descrizione' },
        { value: annotationText, field: 'testo annotazione' },
      ];
      const match = searchableFields.find(({ value: fieldValue }) =>
        fieldValue && normalizeSearchText(fieldValue).includes(normalizedQuery),
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
        });
      }
    }

    Object.entries(node).forEach(([childKey, child]) => {
      if (!childKey.startsWith('@_') && childKey !== '#text') visit(child, childKey);
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
    options: { types?: SearchResultType[]; limit?: number; offset?: number } = {},
  ): Promise<UnifiedSearchResponse> {
    if (typeof rawQuery !== 'string' || rawQuery.trim().length < 2) {
      throw new BadRequestException('q must contain at least 2 characters');
    }
    if (rawQuery.length > MAX_QUERY_LENGTH) {
      throw new BadRequestException(`q must contain at most ${MAX_QUERY_LENGTH} characters`);
    }
    const limit = options.limit ?? 30;
    const offset = options.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new BadRequestException(`limit must be between 1 and ${MAX_LIMIT}`);
    }
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
      throw new BadRequestException(`offset must be between 0 and ${MAX_OFFSET}`);
    }

    const requestedTypes = options.types?.length ? new Set(options.types) : null;
    const includes = (type: SearchResultType) => !requestedTypes || requestedTypes.has(type);
    const query = rawQuery.trim();
    const normalizedQuery = normalizeSearchText(query);
    const allResources = await this.resources.find({
      where: { type: ResourceTypeEnum.Process },
      select: { id: true, name: true, description: true, parentId: true, type: true },
    });
    const readableResources = await this.resourceAccess.filterReadableResources(allResources, headers);
    const resourceById = new Map(readableResources.map((resource) => [resource.id, resource]));
    const results: UnifiedSearchResult[] = [];

    if (includes('process')) {
      for (const resource of readableResources) {
        const fields = [
          { value: resource.name, field: 'nome' },
          { value: resource.description ?? '', field: 'descrizione' },
        ];
        const match = fields.find(({ value }) => normalizeSearchText(value).includes(normalizedQuery));
        if (match) {
          results.push({
            type: 'process',
            id: resource.id,
            label: resource.name,
            excerpt: match.value.slice(0, 240),
            field: match.field,
            resourceId: resource.id,
            processName: resource.name,
          });
        }
      }
    }

    const memberships = await this.projectMembers.find({
      where: { userId: this.resourceAccess.getAuthenticatedUserId(headers) },
      select: { projectId: true },
    });
    const allowedProjectIds = [...new Set(memberships.map((membership) => membership.projectId))];

    if (includes('bpmn') || includes('raci') || includes('actor')) {
      const contentWhere = {
        resourceId: In([...resourceById.keys()]),
        status: ContentStatusEnum.Published,
      };
      const [documents, bpmnDocumentsAvailable] = await this.contents.findAndCount({
        where: contentWhere,
        select: { resourceId: true, content: true },
        take: MAX_BPMN_DOCUMENTS,
      });
      let bpmnDocumentsScanned = 0;
      let bpmnDocumentsSkipped = Math.max(0, bpmnDocumentsAvailable - documents.length);

      if (includes('bpmn')) {
        for (const document of documents) {
          bpmnDocumentsScanned += 1;
          const resource = resourceById.get(document.resourceId);
          if (!resource || Buffer.byteLength(document.content, 'utf8') > MAX_BPMN_BYTES) {
            bpmnDocumentsSkipped += 1;
            continue;
          }
          try {
            results.push(...extractBpmnSearchResults(
              document.content,
              document.resourceId,
              resource.name,
              normalizedQuery,
            ));
          } catch {
            bpmnDocumentsSkipped += 1;
          }
        }
      }

      if (allowedProjectIds.length && (includes('raci') || includes('actor'))) {
        const links = await this.projectProcesses.find({
          where: {
            projectId: In(allowedProjectIds),
            resourceId: In([...resourceById.keys()]),
          },
          select: { projectId: true, resourceId: true },
        });
        const accessiblePairs = new Set(links.map((link) => `${link.projectId}:${link.resourceId}`));
        if (includes('raci') && links.length) {
          const entries = await this.raciEntries.find({
            where: links.map((link) => ({ projectId: link.projectId, resourceId: link.resourceId })),
          });
          for (const entry of entries) {
            if (!accessiblePairs.has(`${entry.projectId}:${entry.resourceId}`)) continue;
            const roleLabel = ROLE_LABELS[entry.role];
            const values = [
              { value: entry.taskName, field: 'attività' },
              { value: entry.actorName, field: 'attore' },
              { value: roleLabel, field: 'responsabilità' },
            ];
            const match = values.find(({ value }) => normalizeSearchText(value).includes(normalizedQuery));
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
              });
            }
          }
        }
        if (includes('actor')) {
          const actors = await this.raciActors.find({
            where: { projectId: In(allowedProjectIds), active: true },
          });
          for (const actor of actors) {
            if (!normalizeSearchText(actor.name).includes(normalizedQuery)) continue;
            results.push({
              type: 'actor',
              id: `${actor.projectId}:${actor.id}`,
              label: actor.name,
              excerpt: 'Attore registrato nel progetto',
              field: 'attore',
              projectId: actor.projectId,
            });
          }
        }
      }
    }

    const typeOrder: Record<SearchResultType, number> = { process: 0, bpmn: 1, raci: 2, actor: 3 };
    results.sort((left, right) =>
      typeOrder[left.type] - typeOrder[right.type] ||
      left.label.localeCompare(right.label, 'fr'),
    );

    return {
      query,
      total: results.length,
      offset,
      limit,
      results: results.slice(offset, offset + limit),
      coverage: {
        readableProcesses: readableResources.length,
        bpmnDocumentsAvailable: includes('bpmn') ? await this.contents.count({
          where: { resourceId: In([...resourceById.keys()]), status: ContentStatusEnum.Published },
        }) : 0,
        bpmnDocumentsScanned: includes('bpmn') ? bpmnDocumentsScanned : 0,
        bpmnDocumentsSkipped: includes('bpmn') ? bpmnDocumentsSkipped : 0,
        partial: includes('bpmn') && (bpmnDocumentsSkipped > 0 || bpmnDocumentsAvailable > MAX_BPMN_DOCUMENTS),
      },
    };
  }
}
