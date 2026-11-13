/* eslint-disable prettier/prettier -- seed data is kept compact and reviewed as one fixture. */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource, IsNull, Repository } from 'typeorm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BpmnToolAppModule } from '../app.module';
import { ProjectTypeOrmEntity } from '../modules/ProjectContext/infrastructure/entities/project.ormEntity';
import { ProjectMemberRole, ProjectMemberTypeOrmEntity } from '../modules/ProjectContext/infrastructure/entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity, ProjectProcessUsage } from '../modules/ProjectContext/infrastructure/entities/projectProcess.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../modules/ProjectContext/infrastructure/entities/projectRaciActor.ormEntity';
import { ProjectRaciEntryTypeOrmEntity, ProjectRaciRole } from '../modules/ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity';
import { ResourceTypeOrmEntity } from '../modules/ResourceContext/infrastructure/entities/resource.ormEntity';
import { ResourceTypeEnum } from '../modules/ResourceContext/shared/types/Resource';
import { ContentTypeOrmEntity } from '../modules/ResourceContext/infrastructure/entities/content.ormEntity';
import { ContentStatusEnum } from '../modules/ResourceContext/shared/types/Content';
import { JobFunctionTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/jobFunction.ormEntity';
import { CompetencyBlockTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/competencyBlock.ormEntity';
import { CompetencyTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/competency.ormEntity';
import { JobFunctionCompetencyBlockTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/jobFunctionCompetencyBlock.ormEntity';
import { ProjectJobPositionTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/projectJobPosition.ormEntity';
import { PositionCompetencyBlockTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/positionCompetencyBlock.ormEntity';
import { PositionCompetencyRequirementTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/positionCompetencyRequirement.ormEntity';
import { PositionRaciActorMappingTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/positionRaciActorMapping.ormEntity';
import { PositionActivityMappingTypeOrmEntity } from '../modules/JobArchitecture/infrastructure/entities/positionActivityMapping.ormEntity';
import { extractBpmnActivityIds } from '../modules/JobArchitecture/infrastructure/bpmnActivityIds';

const MARKER = '[DEMO-SEED:pizza-store:v1]';
const PROJECT_NAME = 'Pizza Store — Démonstration complète';
const PROCESS_NAME = 'Pizza Store — Processus BPMN de démonstration';

async function ensure(
  repo: Repository<any>,
  where: Record<string, unknown>,
  values: Record<string, unknown>,
  label: string,
  compare: (existing: any) => boolean = () => true,
): Promise<any> {
  const existing = await repo.findOne({ where: where as never });
  if (existing) {
    if (!compare(existing)) throw new Error(`Existing ${label} differs from the Pizza demo seed; refusing to overwrite it.`);
    return existing;
  }
  return repo.save(repo.create(values));
}

async function main() {
  const target = process.env.PIZZA_DEMO_SEED_TARGET;
  const expectedDatabase = process.env.PIZZA_DEMO_SEED_EXPECTED_DATABASE;
  const confirmation = process.env.PIZZA_DEMO_SEED_CONFIRM;
  const userId = process.env.PIZZA_DEMO_SEED_USER_ID?.trim();
  if (target !== 'test') throw new Error('PIZZA_DEMO_SEED_TARGET must be exactly "test".');
  if (confirmation !== 'CREATE_PIZZA_STORE_DEMO') throw new Error('Explicit seed confirmation is missing.');
  if (!expectedDatabase || !process.env.DATABASE_NAME || expectedDatabase !== process.env.DATABASE_NAME) {
    throw new Error('DATABASE_NAME does not match PIZZA_DEMO_SEED_EXPECTED_DATABASE.');
  }
  if (!/test/i.test(expectedDatabase)) throw new Error('Refusing to seed a database whose name does not contain "test".');
  if (!userId || userId.length > 64) throw new Error('PIZZA_DEMO_SEED_USER_ID must be an existing application username (1–64 characters).');

  const app = await NestFactory.createApplicationContext(BpmnToolAppModule, { logger: ['error', 'warn'] });
  try {
    const dataSource = app.get(DataSource);
    const actualDatabase = String((dataSource.options as { database?: string }).database ?? '');
    if (actualDatabase !== expectedDatabase) throw new Error(`Connected database "${actualDatabase}" differs from the explicitly expected test database.`);
    const users: Array<{ username: string }> = await dataSource.query(
      'SELECT username FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
      [userId],
    );
    if (!users.length) throw new Error('Seed actor is not an active application user; no project or seed data was created.');

    const fixture = readFileSync(join(__dirname, 'fixtures', 'Pizza-Store-vertical.bpmn'), 'utf8');
    const activityIds = extractBpmnActivityIds(fixture);
    const expectedActivityIds = [
      'id-d97f268d-d744-43ae-a03b-aaafab9c699e',
      'id-b2bb4769-2584-4639-8373-f6cb839b5317',
      'id-cdca9070-9378-4907-8151-9d97b49b155f',
      'id-d12aa91b-aeaa-4122-834b-a8b7f4333cbf',
    ];
    for (const id of expectedActivityIds) if (!activityIds.has(id)) throw new Error(`Pizza BPMN fixture is missing expected activity ${id}.`);

    const summary = await dataSource.transaction(async (manager) => {
      const projects = manager.getRepository(ProjectTypeOrmEntity);
      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      const resources = manager.getRepository(ResourceTypeOrmEntity);
      const contents = manager.getRepository(ContentTypeOrmEntity);
      const projectProcesses = manager.getRepository(ProjectProcessTypeOrmEntity);
      const functions = manager.getRepository(JobFunctionTypeOrmEntity);
      const blocks = manager.getRepository(CompetencyBlockTypeOrmEntity);
      const competencies = manager.getRepository(CompetencyTypeOrmEntity);
      const functionBlocks = manager.getRepository(JobFunctionCompetencyBlockTypeOrmEntity);
      const positions = manager.getRepository(ProjectJobPositionTypeOrmEntity);
      const positionBlocks = manager.getRepository(PositionCompetencyBlockTypeOrmEntity);
      const requirements = manager.getRepository(PositionCompetencyRequirementTypeOrmEntity);
      const actors = manager.getRepository(ProjectRaciActorTypeOrmEntity);
      const raciEntries = manager.getRepository(ProjectRaciEntryTypeOrmEntity);
      const raciMappings = manager.getRepository(PositionRaciActorMappingTypeOrmEntity);
      const activityMappings = manager.getRepository(PositionActivityMappingTypeOrmEntity);

      const project = await ensure(
        projects,
        { name: PROJECT_NAME } as never,
        { name: PROJECT_NAME, description: `${MARKER} Projet de démonstration complet basé sur Pizza-Store-vertical.bpmn.`, color: '#d97706', trigram: 'PIZ', icon: 'workflow', createdBy: userId } as never,
        'project',
        (row) => Boolean(row.description?.includes(MARKER)),
      );
      const member = await members.findOne({ where: { projectId: project.id, userId } });
      if (!member) await members.save(members.create({ projectId: project.id, userId, role: ProjectMemberRole.Admin, canSubmitRemarks: true, createdBy: userId }));
      else if (member.role !== ProjectMemberRole.Admin) {
        member.role = ProjectMemberRole.Admin;
        member.canSubmitRemarks = true;
        await members.save(member);
      }

      const resource = await ensure(
        resources,
        { name: PROCESS_NAME, parentId: IsNull() },
        { name: PROCESS_NAME, description: `${MARKER} BPMN source original du modèle Pizza Store.`, depth: 0, parentId: null, sourceResourceId: null, type: ResourceTypeEnum.Process, authToken: null, createdBy: userId } as never,
        'process resource',
        (row) => Boolean(row.description?.includes(MARKER)) && row.type === ResourceTypeEnum.Process,
      );
      const existingContent = await contents.findOne({ where: { resourceId: resource.id, status: ContentStatusEnum.Published }, order: { version: 'DESC', createdAt: 'DESC' } });
      if (!existingContent) {
        await contents.save(contents.create({ resourceId: resource.id, content: fixture, status: ContentStatusEnum.Published, version: 1, changeComment: MARKER, createdBy: userId, updatedBy: userId }));
      } else if (existingContent.content !== fixture || existingContent.changeComment !== MARKER) {
        throw new Error('The existing published Pizza BPMN differs from the seed fixture; refusing to replace it.');
      }
      await ensure(
        projectProcesses,
        { projectId: project.id, resourceId: resource.id } as never,
        { projectId: project.id, resourceId: resource.id, usage: ProjectProcessUsage.ProjectSpecific, sourceResourceId: null, createdBy: userId } as never,
        'project/process link',
        (row) => row.usage === ProjectProcessUsage.ProjectSpecific && row.sourceResourceId === null,
      );

      const blockSpecs = [
        { code: 'PIZZA-REL', name: 'Relation client', description: 'Accueil, écoute et traitement des demandes clients.', sortOrder: 1 },
        { code: 'PIZZA-ORG', name: 'Organisation des commandes', description: 'Prise de commande, coordination et suivi.', sortOrder: 2 },
        { code: 'PIZZA-PROD', name: 'Production culinaire', description: 'Préparation, cuisson et maîtrise de l’hygiène.', sortOrder: 3 },
        { code: 'PIZZA-LIV', name: 'Livraison et encaissement', description: 'Préparation de livraison, remise et règlement.', sortOrder: 4 },
      ];
      const blockByCode = new Map<string, CompetencyBlockTypeOrmEntity>();
      for (const spec of blockSpecs) {
        const row = await ensure(blocks, { code: spec.code } as never, { ...spec, active: true, createdBy: userId } as never, `competency block ${spec.code}`, (x) => x.name === spec.name && x.description === spec.description);
        blockByCode.set(spec.code, row);
      }

      const competencySpecs = [
        ['PIZZA-REL', 'REL-01', 'Écoute et reformulation', 'Identifier précisément le besoin du client.', 3, 'behavioral'],
        ['PIZZA-REL', 'REL-02', 'Gestion des réclamations', 'Accueillir une insatisfaction et proposer une réponse adaptée.', 3, 'behavioral'],
        ['PIZZA-REL', 'REL-03', 'Communication de service', 'Transmettre une information claire et courtoise.', 3, 'behavioral'],
        ['PIZZA-ORG', 'ORG-01', 'Enregistrement des commandes', 'Saisir une commande complète et exacte.', 3, 'technical'],
        ['PIZZA-ORG', 'ORG-02', 'Priorisation des commandes', 'Organiser les commandes selon les délais et contraintes.', 3, 'methodological'],
        ['PIZZA-ORG', 'ORG-03', 'Suivi des commandes', 'Suivre le statut et signaler les retards.', 3, 'methodological'],
        ['PIZZA-PROD', 'PROD-01', 'Préparation des pizzas', 'Préparer les ingrédients et assembler conformément à la commande.', 4, 'technical'],
        ['PIZZA-PROD', 'PROD-02', 'Maîtrise de la cuisson', 'Réaliser une cuisson conforme aux standards.', 4, 'technical'],
        ['PIZZA-PROD', 'PROD-03', 'Hygiène alimentaire', 'Appliquer les règles d’hygiène et de sécurité alimentaire.', 4, 'technical'],
        ['PIZZA-LIV', 'LIV-01', 'Préparation de tournée', 'Préparer et organiser les livraisons.', 3, 'methodological'],
        ['PIZZA-LIV', 'LIV-02', 'Remise de commande', 'Vérifier et remettre la commande au bon destinataire.', 3, 'technical'],
        ['PIZZA-LIV', 'LIV-03', 'Encaissement', 'Recevoir et contrôler le règlement.', 3, 'technical'],
      ] as const;
      const competencyByCode = new Map<string, CompetencyTypeOrmEntity>();
      for (const [blockCode, code, name, description, level, category] of competencySpecs) {
        const block = blockByCode.get(blockCode)!;
        const row = await ensure(competencies, { blockId: block.id, code } as never, { blockId: block.id, code, name, description, referenceLevel: level, category, active: true, createdBy: userId } as never, `competency ${code}`, (x) => x.name === name && x.referenceLevel === level && x.category === category);
        competencyByCode.set(code, row);
      }

      const functionSpecs = [
        { code: 'PIZZA-ACCUEIL', name: 'Accueil et gestion des commandes', description: `${MARKER} Fonction de référence du responsable de comptoir.`, reportingLine: 'Responsable de magasin', mission: 'Accueillir les clients, enregistrer les commandes, coordonner leur suivi et contribuer à la qualité de service.', blockCodes: ['PIZZA-REL', 'PIZZA-ORG', 'PIZZA-LIV'] },
        { code: 'PIZZA-PRODUCTION', name: 'Préparation et production des pizzas', description: `${MARKER} Fonction de référence du pizzaïolo.`, reportingLine: 'Responsable de magasin', mission: 'Préparer et cuire les pizzas dans le respect des commandes, des délais et des règles d’hygiène.', blockCodes: ['PIZZA-ORG', 'PIZZA-PROD'] },
        { code: 'PIZZA-LIVRAISON', name: 'Livraison et encaissement', description: `${MARKER} Fonction de référence du livreur.`, reportingLine: 'Responsable de magasin', mission: 'Organiser la livraison, remettre les commandes aux clients et assurer l’encaissement.', blockCodes: ['PIZZA-REL', 'PIZZA-ORG', 'PIZZA-LIV'] },
      ];
      const functionByCode = new Map<string, JobFunctionTypeOrmEntity>();
      for (const spec of functionSpecs) {
        const fn = await ensure(functions, { code: spec.code } as never, { code: spec.code, name: spec.name, description: spec.description, reportingLine: spec.reportingLine, otherTitles: [], documentDate: '2026-11-13', documentVersion: 'V01', establishedBy: userId, validatedBy: null, mission: spec.mission, active: true, createdBy: userId } as never, `job function ${spec.code}`, (x) => x.name === spec.name && Boolean(x.description?.includes(MARKER)));
        functionByCode.set(spec.code, fn);
        for (const [index, blockCode] of spec.blockCodes.entries()) {
          const block = blockByCode.get(blockCode)!;
          await ensure(functionBlocks, { functionId: fn.id, blockId: block.id } as never, { functionId: fn.id, blockId: block.id, sortOrder: index, createdBy: userId } as never, `function/block ${spec.code}/${blockCode}`);
        }
      }

      const positionSpecs = [
        { key: 'clerk', title: 'Responsable de comptoir', functionCode: 'PIZZA-ACCUEIL', description: 'Accueille les clients, enregistre et suit les commandes, traite les demandes et réclamations.' },
        { key: 'chef', title: 'Pizzaïolo', functionCode: 'PIZZA-PRODUCTION', description: 'Prépare et cuit les pizzas selon les commandes et les règles d’hygiène.' },
        { key: 'delivery', title: 'Livreur', functionCode: 'PIZZA-LIVRAISON', description: 'Livre les commandes et assure le règlement à la remise.' },
      ];
      const positionByKey = new Map<string, ProjectJobPositionTypeOrmEntity>();
      for (const spec of positionSpecs) {
        const fn = functionByCode.get(spec.functionCode)!;
        const position = await ensure(positions, { projectId: project.id, title: spec.title } as never, { projectId: project.id, functionId: fn.id, title: spec.title, description: spec.description, active: true, createdBy: userId } as never, `position ${spec.title}`, (x) => x.functionId === fn.id && x.description === spec.description && x.active);
        positionByKey.set(spec.key, position);
      }

      const applicability: Record<string, Record<string, { value: 'required' | 'optional'; level: number }>> = {
        clerk: { 'PIZZA-REL': { value: 'required', level: 3 }, 'PIZZA-ORG': { value: 'required', level: 3 }, 'PIZZA-LIV': { value: 'optional', level: 2 } },
        chef: { 'PIZZA-ORG': { value: 'optional', level: 2 }, 'PIZZA-PROD': { value: 'required', level: 4 } },
        delivery: { 'PIZZA-REL': { value: 'optional', level: 2 }, 'PIZZA-ORG': { value: 'optional', level: 2 }, 'PIZZA-LIV': { value: 'required', level: 3 } },
      };
      for (const [key, position] of positionByKey) {
        for (const [blockCode, setting] of Object.entries(applicability[key])) {
          const block = blockByCode.get(blockCode)!;
          await ensure(positionBlocks, { positionId: position.id, blockId: block.id } as never, { positionId: position.id, blockId: block.id, applicability: setting.value, requiredLevel: setting.level, createdBy: userId } as never, `position/block ${position.title}/${blockCode}`, (x) => x.applicability === setting.value && x.requiredLevel === setting.level);
        }
      }

      const requirementOverrides = [
        ['clerk', 'REL-02', 4],
        ['clerk', 'ORG-01', 4],
        ['chef', 'PROD-03', 4],
        ['delivery', 'LIV-02', 4],
        ['delivery', 'LIV-03', 3],
      ] as const;
      for (const [positionKey, competencyCode, level] of requirementOverrides) {
        const position = positionByKey.get(positionKey)!;
        const competency = competencyByCode.get(competencyCode)!;
        const row = await ensure(requirements, { positionId: position.id, competencyId: competency.id } as never, { positionId: position.id, blockId: competency.blockId, competencyId: competency.id, requiredLevel: level, createdBy: userId } as never, `competency requirement ${position.title}/${competencyCode}`, (x) => x.blockId === competency.blockId && x.requiredLevel === level);
      }

      const actorByKey = new Map<string, ProjectRaciActorTypeOrmEntity>();
      for (const spec of positionSpecs) {
        const normalizedName = spec.title.trim().toLocaleLowerCase('fr-FR');
        const actor = await ensure(actors, { projectId: project.id, normalizedName } as never, { projectId: project.id, name: spec.title, normalizedName, active: true, origin: 'manual', createdBy: userId } as never, `RACI actor ${spec.title}`, (x) => x.name === spec.title && x.active);
        actorByKey.set(spec.key, actor);
        const position = positionByKey.get(spec.key)!;
        await ensure(raciMappings, { projectId: project.id, positionId: position.id, raciActorId: actor.id } as never, { projectId: project.id, positionId: position.id, raciActorId: actor.id, createdBy: userId } as never, `position/RACI actor ${spec.title}`);
      }

      const taskSpecs = [
        { id: 'id-d97f268d-d744-43ae-a03b-aaafab9c699e', name: 'Calm customer', assignments: [['clerk', ProjectRaciRole.Responsible], ['chef', ProjectRaciRole.Consulted], ['delivery', ProjectRaciRole.Informed]] as const },
        { id: 'id-b2bb4769-2584-4639-8373-f6cb839b5317', name: 'Bake the pizza', assignments: [['chef', ProjectRaciRole.Responsible], ['clerk', ProjectRaciRole.Informed], ['delivery', ProjectRaciRole.Informed]] as const },
        { id: 'id-cdca9070-9378-4907-8151-9d97b49b155f', name: 'Deliver the pizza', assignments: [['delivery', ProjectRaciRole.Responsible], ['chef', ProjectRaciRole.Consulted], ['clerk', ProjectRaciRole.Informed]] as const },
        { id: 'id-d12aa91b-aeaa-4122-834b-a8b7f4333cbf', name: 'Receive payment', assignments: [['delivery', ProjectRaciRole.Responsible], ['clerk', ProjectRaciRole.Accountable], ['chef', ProjectRaciRole.Informed]] as const },
      ];
      for (const task of taskSpecs) {
        for (const [actorKey, role] of task.assignments) {
          const actor = actorByKey.get(actorKey)!;
          await ensure(raciEntries, { projectId: project.id, resourceId: resource.id, taskId: task.id, actorName: actor.name } as never, { projectId: project.id, resourceId: resource.id, taskId: task.id, taskName: task.name, actorName: actor.name, role, createdBy: userId } as never, `RACI ${task.name}/${actor.name}`, (x) => x.taskName === task.name && x.role === role);
        }
      }

      const activitySpecs = [
        { positionKey: 'clerk', blockCode: 'PIZZA-REL', taskId: 'id-d97f268d-d744-43ae-a03b-aaafab9c699e' },
        { positionKey: 'chef', blockCode: 'PIZZA-PROD', taskId: 'id-b2bb4769-2584-4639-8373-f6cb839b5317' },
        { positionKey: 'delivery', blockCode: 'PIZZA-LIV', taskId: 'id-cdca9070-9378-4907-8151-9d97b49b155f' },
        { positionKey: 'delivery', blockCode: 'PIZZA-LIV', taskId: 'id-d12aa91b-aeaa-4122-834b-a8b7f4333cbf' },
      ];
      for (const spec of activitySpecs) {
        const position = positionByKey.get(spec.positionKey)!;
        const block = blockByCode.get(spec.blockCode)!;
        await ensure(activityMappings, { projectId: project.id, positionId: position.id, resourceId: resource.id, taskId: spec.taskId, blockId: block.id } as never, { projectId: project.id, positionId: position.id, resourceId: resource.id, taskId: spec.taskId, blockId: block.id, createdBy: userId } as never, `activity mapping ${spec.taskId}`);
      }

      return {
        projectId: project.id,
        resourceId: resource.id,
        userId,
        functions: functionByCode.size,
        competencyBlocks: blockByCode.size,
        competencies: competencyByCode.size,
        positions: positionByKey.size,
        raciActors: actorByKey.size,
        raciEntries: taskSpecs.reduce((count, task) => count + task.assignments.length, 0),
        activityMappings: activitySpecs.length,
      };
    });
    process.stdout.write(`Pizza Store demo seed completed: ${JSON.stringify(summary)}\\n`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Pizza Store demo seed failed: ${error instanceof Error ? error.message : String(error)}\\n`);
  process.exitCode = 1;
});
