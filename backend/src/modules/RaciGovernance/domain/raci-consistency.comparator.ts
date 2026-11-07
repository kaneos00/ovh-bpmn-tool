import {
  ActorLabelOccurrence,
  RaciRole,
} from './actor-label.xml-reader';
import { ActorLabelNormalizer } from './actor-label.normalizer';

export type StoredProjectActor = {
  name: string;
  active: boolean;
};

export type StoredProjectRaciEntry = {
  taskId: string;
  actorName: string;
  role: 'R' | 'A' | 'C' | 'I';
};

export type ActorRegistryDifference =
  | { kind: 'xml-only'; label: string; normalizedLabel: string; xmlActive?: boolean }
  | { kind: 'database-only'; label: string; normalizedLabel: string; databaseActive: boolean }
  | {
      kind: 'active-state-mismatch';
      label: string;
      normalizedLabel: string;
      xmlActive: boolean;
      databaseActive: boolean;
    };

export type AssignmentDifference =
  | {
      kind: 'xml-only';
      taskId: string;
      actorName: string;
      role: RaciRole;
      normalizedActorName: string;
    }
  | {
      kind: 'database-only';
      taskId: string;
      actorName: string;
      role: 'R' | 'A' | 'C' | 'I';
      normalizedActorName: string;
    };

export interface RaciConsistencyReport {
  actorRegistry: ActorRegistryDifference[];
  assignments: AssignmentDifference[];
  ignoredXmlOccurrences: number;
}

/**
 * Compares one project's stored actor registry and RACI matrix with one
 * explicitly selected BPMN content version. It is pure and read-only:
 * callers must supply already-authorized, version-scoped snapshots.
 */
export class RaciConsistencyComparator {
  compare(input: {
    xmlOccurrences: ActorLabelOccurrence[];
    databaseActors: StoredProjectActor[];
    databaseEntries: StoredProjectRaciEntry[];
  }): RaciConsistencyReport {
    const xmlActors = new Map<string, { label: string; active?: boolean }>();
    const databaseActors = new Map<string, StoredProjectActor>();

    for (const occurrence of input.xmlOccurrences) {
      if (occurrence.source !== 'raci-actors-json') continue;
      const key = ActorLabelNormalizer.normalize(occurrence.label);
      if (!key) continue;
      const current = xmlActors.get(key);
      const active = occurrence.active;
      if (!current || (current.active === undefined && active !== undefined)) {
        xmlActors.set(key, { label: occurrence.label, active });
      }
    }

    for (const actor of input.databaseActors) {
      const key = ActorLabelNormalizer.normalize(actor.name);
      if (key && !databaseActors.has(key)) databaseActors.set(key, actor);
    }

    const actorRegistry: ActorRegistryDifference[] = [];
    for (const [key, actor] of xmlActors) {
      const stored = databaseActors.get(key);
      if (!stored) {
        actorRegistry.push({
          kind: 'xml-only',
          label: actor.label,
          normalizedLabel: key,
          ...(actor.active === undefined ? {} : { xmlActive: actor.active }),
        });
      } else if (
        actor.active !== undefined &&
        actor.active !== stored.active
      ) {
        actorRegistry.push({
          kind: 'active-state-mismatch',
          label: actor.label,
          normalizedLabel: key,
          xmlActive: actor.active,
          databaseActive: stored.active,
        });
      }
    }
    for (const [key, actor] of databaseActors) {
      if (!xmlActors.has(key)) {
        actorRegistry.push({
          kind: 'database-only',
          label: actor.name,
          normalizedLabel: key,
          databaseActive: actor.active,
        });
      }
    }

    const xmlAssignments = new Map<string, {
      taskId: string;
      actorName: string;
      role: RaciRole;
      normalizedActorName: string;
    }>();
    const databaseAssignments = new Map<string, {
      taskId: string;
      actorName: string;
      role: 'R' | 'A' | 'C' | 'I';
      normalizedActorName: string;
    }>();

    for (const occurrence of input.xmlOccurrences) {
      if (
        occurrence.source !== 'raci-attribute' ||
        !occurrence.elementId ||
        !occurrence.role
      ) {
        continue;
      }
      const normalizedActorName = ActorLabelNormalizer.normalize(occurrence.label);
      if (!normalizedActorName) continue;
      const key = JSON.stringify([
        occurrence.elementId,
        normalizedActorName,
        occurrence.role,
      ]);
      xmlAssignments.set(key, {
        taskId: occurrence.elementId,
        actorName: occurrence.label,
        role: occurrence.role,
        normalizedActorName,
      });
    }

    const xmlRoleByDatabaseRole: Record<
      'R' | 'A' | 'C' | 'I',
      RaciRole
    > = { R: 'responsible', A: 'accountable', C: 'consulted', I: 'informed' };

    for (const entry of input.databaseEntries) {
      const normalizedActorName = ActorLabelNormalizer.normalize(entry.actorName);
      if (!normalizedActorName) continue;
      const key = JSON.stringify([
        entry.taskId,
        normalizedActorName,
        xmlRoleByDatabaseRole[entry.role],
      ]);
      databaseAssignments.set(key, {
        taskId: entry.taskId,
        actorName: entry.actorName,
        role: entry.role,
        normalizedActorName,
      });
    }

    const assignments: AssignmentDifference[] = [];
    for (const [key, assignment] of xmlAssignments) {
      if (!databaseAssignments.has(key)) {
        assignments.push({ kind: 'xml-only', ...assignment });
      }
    }
    for (const [key, assignment] of databaseAssignments) {
      if (!xmlAssignments.has(key)) {
        assignments.push({ kind: 'database-only', ...assignment });
      }
    }

    const relevantOccurrences = input.xmlOccurrences.filter(
      (occurrence) =>
        occurrence.source === 'raci-actors-json' ||
        occurrence.source === 'raci-attribute',
    ).length;

    return {
      actorRegistry,
      assignments,
      ignoredXmlOccurrences: input.xmlOccurrences.length - relevantOccurrences,
    };
  }
}
