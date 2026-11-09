import { ProjectRaciApplicationService } from '../ProjectContext/project-raci.application.service';
import { RaciGovernanceApplicationService } from './application/raci-governance.application.service';
import { RaciGovernanceController } from './raci-governance.controller';

describe('RaciGovernanceController', () => {
  const projectRaci = {
    readOrganizationActorInventory: jest.fn(),
  };
  const governance = {
    listReferenceActors: jest.fn(),
    createReferenceActor: jest.fn(),
    updateReferenceActor: jest.fn(),
    listActorMappings: jest.fn(),
    createActorMapping: jest.fn(),
  };
  let controller: RaciGovernanceController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RaciGovernanceController(
      projectRaci as unknown as ProjectRaciApplicationService,
      governance as unknown as RaciGovernanceApplicationService,
    );
  });

  it('groups exact normalized labels across projects without changing source labels', async () => {
    const actors = [
      {
        projectId: 'p1',
        projectName: 'Alpha',
        actorId: 'a1',
        actorName: 'Responsable IVV',
        normalizedName: 'responsable ivv',
        active: true,
        origin: 'manual',
      },
      {
        projectId: 'p2',
        projectName: 'Beta',
        actorId: 'a2',
        actorName: 'responsable-ivv',
        normalizedName: 'responsable-ivv',
        active: false,
        origin: 'bpmn',
      },
      {
        projectId: 'p2',
        projectName: 'Beta',
        actorId: 'a3',
        actorName: 'Chef de projet',
        normalizedName: 'chef de projet',
        active: true,
        origin: 'manual',
      },
    ];
    projectRaci.readOrganizationActorInventory.mockResolvedValue(actors);

    const result = await controller.getActorInventory({ 'x-user': 'admin' });

    expect(result.readOnly).toBe(true);
    expect(result.totalActors).toBe(3);
    expect(result.projectsCount).toBe(2);
    expect(result.duplicateCandidates).toHaveLength(1);
    expect(result.duplicateCandidates[0]).toMatchObject({
      normalizedName: 'responsable ivv',
      actorCount: 2,
      projectCount: 2,
    });
    expect(
      result.duplicateCandidates[0].actors.map((actor) => actor.actorName),
    ).toEqual(['Responsable IVV', 'responsable-ivv']);
  });

  it('does not flag repeated labels contained in only one project', async () => {
    projectRaci.readOrganizationActorInventory.mockResolvedValue([
      {
        projectId: 'p1',
        projectName: 'Alpha',
        actorId: 'a1',
        actorName: 'Responsable IVV',
        normalizedName: 'responsable ivv',
        active: true,
        origin: 'manual',
      },
      {
        projectId: 'p1',
        projectName: 'Alpha',
        actorId: 'a2',
        actorName: 'responsable-ivv',
        normalizedName: 'responsable-ivv',
        active: true,
        origin: 'bpmn',
      },
    ]);

    const result = await controller.getActorInventory({});

    expect(result.duplicateCandidates).toEqual([]);
  });

  it('does not mutate actor records', async () => {
    const actor = {
      projectId: 'p1',
      projectName: 'Alpha',
      actorId: 'a1',
      actorName: 'Support',
      normalizedName: 'support',
      active: true,
      origin: 'manual',
    };
    projectRaci.readOrganizationActorInventory.mockResolvedValue([actor]);

    await controller.getActorInventory({});

    expect(actor.actorName).toBe('Support');
    expect(actor.active).toBe(true);
  });

  it('delegates reference registry reads and mapping writes to the application service', async () => {
    const headers = { 'x-user': 'admin' };
    const body = { name: 'Responsable VV', actorType: 'function' as const };
    governance.listReferenceActors.mockResolvedValue([]);
    governance.createReferenceActor.mockResolvedValue({ id: 'ref-1' });
    governance.createActorMapping.mockResolvedValue({ id: 'mapping-1' });

    await expect(controller.listReferenceActors(headers)).resolves.toEqual([]);
    await expect(
      controller.createReferenceActor(body, headers),
    ).resolves.toEqual({ id: 'ref-1' });
    await expect(
      controller.createActorMapping(
        { localActorId: 'local-1', referenceActorId: 'ref-1' },
        headers,
      ),
    ).resolves.toEqual({ id: 'mapping-1' });

    expect(governance.listReferenceActors).toHaveBeenCalledWith(headers);
    expect(governance.createReferenceActor).toHaveBeenCalledWith(
      body,
      headers,
    );
    expect(governance.createActorMapping).toHaveBeenCalledWith(
      { localActorId: 'local-1', referenceActorId: 'ref-1' },
      headers,
    );
  });
});
