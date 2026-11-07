import {
  RaciConsistencyComparator,
  StoredProjectActor,
  StoredProjectRaciEntry,
} from './raci-consistency.comparator';
import { ActorLabelOccurrence } from './actor-label.xml-reader';

describe('RaciConsistencyComparator', () => {
  const comparator = new RaciConsistencyComparator();

  const actor = (
    label: string,
    active?: boolean,
  ): ActorLabelOccurrence => ({
    elementId: 'Process_1',
    elementType: 'process',
    field: 'raci:actors.name',
    label,
    normalizedLabel: label.toLowerCase(),
    source: 'raci-actors-json',
    ...(active === undefined ? {} : { active }),
  });

  const assignment = (
    taskId: string,
    label: string,
    role: 'responsible' | 'accountable' | 'consulted' | 'informed',
  ): ActorLabelOccurrence => ({
    elementId: taskId,
    elementType: 'task',
    field: `raci:${role}`,
    label,
    normalizedLabel: label.toLowerCase(),
    source: 'raci-attribute',
    role,
  });

  it('reports actor registry differences and active-state conflicts', () => {
    const databaseActors: StoredProjectActor[] = [
      { name: 'Direction qualité', active: true },
      { name: 'Acteur uniquement en base', active: true },
      { name: 'Acteur désactivé', active: false },
    ];

    const report = comparator.compare({
      xmlOccurrences: [
        actor('Direction qualité', true),
        actor('Acteur uniquement XML', true),
        actor('Acteur désactivé', true),
      ],
      databaseActors,
      databaseEntries: [],
    });

    expect(report.actorRegistry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'xml-only',
          normalizedLabel: 'acteur uniquement xml',
        }),
        expect.objectContaining({
          kind: 'database-only',
          normalizedLabel: 'acteur uniquement en base',
        }),
        expect.objectContaining({
          kind: 'active-state-mismatch',
          normalizedLabel: 'acteur desactive',
          xmlActive: true,
          databaseActive: false,
        }),
      ]),
    );
  });

  it('compares assignments by BPMN element ID, actor label and RACI role', () => {
    const databaseEntries: StoredProjectRaciEntry[] = [
      { taskId: 'Task_1', actorName: 'Responsable IVV', role: 'R' },
      { taskId: 'Task_2', actorName: 'Direction qualité', role: 'A' },
    ];

    const report = comparator.compare({
      xmlOccurrences: [
        assignment('Task_1', 'RESPONSABLE IVV', 'responsible'),
        assignment('Task_3', 'Équipe métier', 'consulted'),
      ],
      databaseActors: [],
      databaseEntries,
    });

    expect(report.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'xml-only',
          taskId: 'Task_3',
          normalizedActorName: 'equipe metier',
          role: 'consulted',
        }),
        expect.objectContaining({
          kind: 'database-only',
          taskId: 'Task_2',
          normalizedActorName: 'direction qualite',
          role: 'A',
        }),
      ]),
    );
    expect(report.assignments).toHaveLength(2);
  });

  it('does not report equivalent labels with accents or case as differences', () => {
    const report = comparator.compare({
      xmlOccurrences: [
        actor('Direction qualité', true),
        assignment('Task_1', 'Responsable IVV', 'responsible'),
      ],
      databaseActors: [{ name: 'DIRECTION QUALITE', active: true }],
      databaseEntries: [
        { taskId: 'Task_1', actorName: 'responsable ivv', role: 'R' },
      ],
    });

    expect(report.actorRegistry).toEqual([]);
    expect(report.assignments).toEqual([]);
  });

  it('does not interpret process-level actor registry entries as task assignments', () => {
    const report = comparator.compare({
      xmlOccurrences: [actor('Responsable IVV', true)],
      databaseActors: [],
      databaseEntries: [],
    });

    expect(report.actorRegistry).toHaveLength(1);
    expect(report.assignments).toEqual([]);
  });

  it('does not invent an active-state comparison when XML metadata is absent', () => {
    const report = comparator.compare({
      xmlOccurrences: [actor('Direction qualité')],
      databaseActors: [{ name: 'Direction qualité', active: false }],
      databaseEntries: [],
    });

    expect(report.actorRegistry).toEqual([]);
  });
});
