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
export type SearchResultSource =
  | 'resource'
  | 'bpmn'
  | 'project-raci'
  | 'project-actor';

export type SearchSortBy =
  | 'relevance'
  | 'type'
  | 'label'
  | 'source'
  | 'process';
export type SearchSortDirection = 'asc' | 'desc';

export function canReadEmbeddedProjectMetadata(
  resourceId: string,
  projectLinks: Array<{ projectId: string; resourceId: string; usage: string }>,
  allowedProjectIds: string[],
): boolean {
  const links = projectLinks.filter((link) => link.resourceId === resourceId);
  return (
    links.length === 0 ||
    links.some(
      (link) =>
        link.usage === 'common' || allowedProjectIds.includes(link.projectId),
    )
  );
}

export function sortUnifiedSearchResults(
  results: UnifiedSearchResult[],
  sortBy: SearchSortBy = 'relevance',
  sortDirection: SearchSortDirection = 'asc',
): UnifiedSearchResult[] {
  const typeOrder: Record<SearchResultType, number> = {
    process: 0,
    bpmn: 1,
    raci: 2,
    actor: 3,
  };
  const typeLabels: Record<SearchResultType, string> = {
    process: 'Processus',
    bpmn: 'Élément BPMN',
    raci: 'Responsabilité RACI',
    actor: 'Acteur / rôle',
  };
  const sourceLabels: Record<SearchResultSource, string> = {
    resource: 'Processus',
    bpmn: 'BPMN',
    'project-raci': 'RACI projet',
    'project-actor': 'Acteurs projet',
  };
  const direction = sortDirection === 'desc' ? -1 : 1;
  return [...results].sort((left, right) => {
    if (sortBy === 'relevance') {
      return (
        (right.matchScore ?? 0) - (left.matchScore ?? 0) ||
        typeOrder[left.type] - typeOrder[right.type] ||
        left.label.localeCompare(right.label, 'fr')
      );
    }
    const value = (item: UnifiedSearchResult) => {
      if (sortBy === 'type') return typeLabels[item.type];
      if (sortBy === 'source') return sourceLabels[item.source ?? 'resource'];
      if (sortBy === 'process') return item.processName ?? '';
      return item.label;
    };
    return (
      value(left).localeCompare(value(right), 'fr', { sensitivity: 'base' }) *
      direction
    );
  });
}
export type UnifiedSearchResult = {
  type: SearchResultType;
  id: string;
  label: string;
  excerpt: string;
  description?: string;
  field: string;
  resourceId?: string;
  processName?: string;
  elementId?: string;
  projectId?: string;
  role?: ProjectRaciRole;
  source?: SearchResultSource;
  matchKind?: 'exact' | 'approximate';
  matchScore?: number;
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
  process: 'Processus BPMN',
  task: 'Attività',
  userTask: 'Attività utente',
  serviceTask: 'Attività di servizio',
  manualTask: 'Attività manuale',
  scriptTask: 'Attività script',
  businessRuleTask: 'Attività regola',
  sendTask: 'Attività invio',
  receiveTask: 'Attività ricezione',
  callActivity: 'Activité appelée',
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

function editDistance(left: string, right: string): number {
  if (Math.abs(left.length - right.length) > 2) return 3;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

/** Conservative typo matching used only by the deep-search API. */
export function isExactSearchTextMatch(value: string, query: string): boolean {
  const normalizedValue = normalizeSearchText(value);
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedValue === normalizedQuery) return true;
  const queryWords = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);
  const valueWords = normalizedValue.split(/[^a-z0-9]+/).filter(Boolean);
  return (
    queryWords.length > 0 &&
    queryWords.every((word) =>
      valueWords.some((valueWord) => valueWord === word),
    )
  );
}

export function isSearchTextMatch(value: string, query: string): boolean {
  const normalizedValue = normalizeSearchText(value);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;
  if (isExactSearchTextMatch(normalizedValue, normalizedQuery)) return true;

  const queryWords = normalizedQuery.split(' ').filter(Boolean);
  const valueWords = normalizedValue.split(/[^a-z0-9]+/).filter(Boolean);
  if (!queryWords.length) return false;

  return queryWords.every((queryWord) => {
    if (valueWords.some((valueWord) => valueWord.includes(queryWord)))
      return true;
    if (queryWord.length < 5) return false;
    const maxDistance = queryWord.length >= 8 ? 2 : 1;
    return valueWords.some((valueWord) => {
      if (Math.abs(valueWord.length - queryWord.length) > maxDistance) {
        return false;
      }
      return editDistance(valueWord, queryWord) <= maxDistance;
    });
  });
}

/** Returns a conservative 0-100 score for the best token alignment. */
export function getSearchSimilarity(value: string, query: string): number {
  const normalizedValue = normalizeSearchText(value);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;
  const queryWords = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);
  const valueWords = normalizedValue.split(/[^a-z0-9]+/).filter(Boolean);
  if (
    normalizedValue === normalizedQuery ||
    (queryWords.length > 0 &&
      queryWords.every((word) => valueWords.includes(word)))
  )
    return 100;
  if (!queryWords.length || !valueWords.length) return 0;

  const scores = queryWords.map((queryWord) => {
    let best = 0;
    for (const valueWord of valueWords) {
      if (valueWord === queryWord) return 100;
      if (valueWord.includes(queryWord)) {
        best = Math.max(best, (queryWord.length / valueWord.length) * 100);
        continue;
      }
      const maxDistance = queryWord.length >= 8 ? 2 : 1;
      if (
        queryWord.length >= 5 &&
        Math.abs(valueWord.length - queryWord.length) <= maxDistance
      ) {
        const distance = editDistance(valueWord, queryWord);
        if (distance <= maxDistance) {
          best = Math.max(
            best,
            (1 - distance / Math.max(valueWord.length, queryWord.length)) * 100,
          );
        }
      }
    }
    return best;
  });
  if (scores.some((score) => score === 0)) return 0;
  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length,
  );
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

const BPMN_CONNECTION_TYPES = new Set([
  'sequenceFlow',
  'messageFlow',
  'association',
  'dataInputAssociation',
  'dataOutputAssociation',
  'conversationLink',
]);

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
  // Match the Viewer RACI matrix: lane ownership creates inferred R/A assignments.
  const laneRoleByActivity = new Map<string, string>();
  const collectLaneAssignments = (value: unknown, key = ''): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectLaneAssignments(item, key));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (key === 'lane') {
      const laneName = readXmlAttribute(node, 'name');
      const refs = node.flowNodeRef;
      const addRef = (ref: unknown) => {
        const id =
          typeof ref === 'string'
            ? ref.trim()
            : ref && typeof ref === 'object'
              ? String((ref as Record<string, unknown>)['#text'] ?? '').trim()
              : '';
        if (id && laneName) {
          laneRoleByActivity.set(id, laneName);
        }
      };
      (Array.isArray(refs) ? refs : refs ? [refs] : []).forEach(addRef);
    }
    Object.entries(node).forEach(([childKey, child]) => {
      if (!childKey.startsWith('@_') && childKey !== '#text')
        collectLaneAssignments(child, childKey);
    });
  };
  collectLaneAssignments(parsed);
  const includes = (type: SearchResultType) =>
    !requestedTypes?.length || requestedTypes.includes(type);
  const addActor = (name: string, elementId?: string) => {
    if (
      !includes('actor') ||
      !name ||
      !isSearchTextMatch(name, normalizedQuery)
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

    if (BPMN_CONNECTION_TYPES.has(key)) return;

    const node = value as Record<string, unknown>;
    const typeLabel = BPMN_ELEMENT_TYPES[key];
    const elementId = readXmlAttribute(node, 'id') || undefined;
    const name = readXmlAttribute(node, 'name');
    const annotationText =
      key === 'textAnnotation' ? collectText(node.text) : '';
    const documentation = collectText(node.documentation);
    const label =
      name ||
      annotationText ||
      (elementId ? (typeLabel ?? 'Élément BPMN') : '');

    if ((typeLabel || (elementId && documentation)) && includes('bpmn')) {
      const searchableFields = [
        { value: name, field: 'nome' },
        { value: documentation, field: 'descrizione' },
        { value: annotationText, field: 'testo annotazione' },
      ];
      const match = searchableFields.find(
        ({ value: fieldValue }) =>
          fieldValue && isSearchTextMatch(fieldValue, normalizedQuery),
      );
      if (label && match) {
        results.push({
          type: 'bpmn',
          id: elementId ?? `${resourceId}:${key}:${results.length}`,
          label: `${typeLabel ?? 'Élément BPMN'}: ${label}`,
          excerpt: match.value.slice(0, 240),
          description: documentation || annotationText || undefined,
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
      const activityLabel = name || 'Attività';
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
        const inferredLaneRole = laneRoleByActivity.get(elementId ?? '');
        if (inferredLaneRole && role === ProjectRaciRole.Responsible)
          actorNames.push(inferredLaneRole);
        if (
          inferredLaneRole &&
          role === ProjectRaciRole.Accountable &&
          /approve|approval|validate|validation|authori[sz]e|authori[sz]ation|approuver|approbation|valider|autoriser|autorisation|décider|decision|décision/i.test(
            activityLabel,
          )
        ) {
          actorNames.push(inferredLaneRole);
        }
        for (const actorName of [...new Set(actorNames)]) {
          addActor(actorName, elementId);
          if (!includes('raci')) continue;
          const roleLabel = ROLE_LABELS[role];
          const match = [
            { value: activityLabel, field: 'attività' },
            { value: actorName, field: 'attore' },
            { value: roleLabel, field: 'responsabilità' },
            { value: role, field: 'responsabilità' },
          ].find(({ value }) => isSearchTextMatch(value, normalizedQuery));
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
      sortBy?: SearchSortBy;
      sortDirection?: SearchSortDirection;
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
      ? allReadableResources.filter(
          (resource) => resource.id === options.resourceId,
        )
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
        ];
        const match = fields.find(({ value }) =>
          isSearchTextMatch(value, normalizedQuery),
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

    const resourceIds = [...resourceById.keys()];
    const projectLinks =
      needsProjectData && resourceIds.length
        ? await this.projectProcesses.find({
            where: { resourceId: In(resourceIds) },
            select: { projectId: true, resourceId: true, usage: true },
          })
        : [];
    // BPMN-embedded actors/RACI are project metadata: do not expose them
    // merely because the underlying process is readable through another path.
    let bpmnDocumentsAvailable = 0;
    let bpmnDocumentsScanned = 0;
    let bpmnDocumentsSkipped = 0;
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
          const canReadProjectMetadata = canReadEmbeddedProjectMetadata(
            document.resourceId,
            projectLinks,
            allowedProjectIds,
          );
          const extractionTypes = options.types?.length
            ? options.types.filter(
                (type) =>
                  (type !== 'raci' && type !== 'actor') ||
                  canReadProjectMetadata,
              )
            : canReadProjectMetadata
              ? undefined
              : ['bpmn' as SearchResultType];
          if (!extractionTypes || extractionTypes.length > 0) {
            results.push(
              ...extractBpmnSearchResults(
                document.content,
                document.resourceId,
                resource.name,
                normalizedQuery,
                extractionTypes,
                options.role,
              ),
            );
          }
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
            if (options.role && entry.role !== options.role) continue;
            const roleLabel = ROLE_LABELS[entry.role];
            const values = [
              { value: entry.taskName, field: 'attività' },
              { value: entry.actorName, field: 'attore' },
              { value: roleLabel, field: 'responsabilità' },
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
          if (!isSearchTextMatch(actor.name, normalizedQuery)) continue;
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
      const key =
        result.type === 'bpmn' && result.resourceId && result.elementId
          ? `bpmn:${result.resourceId}:${result.elementId}`
          : `${result.type}:${result.resourceId ?? ''}:${result.projectId ?? ''}:${result.id}`;
      const previous = uniqueByKey.get(key);
      if (!previous) {
        uniqueByKey.set(key, result);
        continue;
      }
      uniqueByKey.set(key, {
        ...previous,
        description: previous.description || result.description,
        ...(previous.field !== 'descrizione' && result.field === 'descrizione'
          ? { excerpt: result.excerpt, field: result.field }
          : {}),
      });
    }
    const uniqueResults = [...uniqueByKey.values()].map((result) => {
      const matchScore = Math.max(
        getSearchSimilarity(result.label, normalizedQuery),
        getSearchSimilarity(result.excerpt, normalizedQuery),
        getSearchSimilarity(result.description ?? '', normalizedQuery),
      );
      return {
        ...result,
        matchScore,
        matchKind:
          matchScore === 100 ? ('exact' as const) : ('approximate' as const),
      };
    });
    const sortedResults = sortUnifiedSearchResults(
      uniqueResults,
      options.sortBy,
      options.sortDirection,
    );

    return {
      query,
      total: sortedResults.length,
      offset,
      limit,
      results: sortedResults.slice(offset, offset + limit),
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
