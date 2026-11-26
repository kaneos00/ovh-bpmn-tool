# Project context and shared process repository

The process catalogue remains independent from projects. BPMN diagrams continue to be stored as ordinary `resources` of type `process`, with versions in `contents`. A project references a process through `project_processes`; linking a shared process does not copy or move its BPMN resource.

## Process link semantics

- `common`: a reference to a process intended to be reused as-is from the shared catalogue.
- `variant`: a project process that declares `sourceResourceId` as its source process.
- `project-specific`: a process created for this project, with no shared source.

A variant is created as an independent process resource: the API copies the latest published BPMN content into a draft and records the source relationship. There is no copy-on-write or automatic version inheritance after creation.

## Project access

Project membership roles are represented in the database as `viewer`, `modeler`, and `admin`. Project roles are enforced on project APIs and on the generic resource, content, and comment endpoints for linked processes. Readers need membership in at least one linked restricted project; edits require modeler or admin membership in every linked project. Common processes are readable through the shared catalogue but read-only through generic resource endpoints. The existing global ACL is also applied.

## Database

Apply migrations in order after the existing `init.sql`: `20261011_v2_project_context.sql`, `20261011_v2_project_raci.sql`, then `20261012_v2_project_raci_actors.sql`. TypeORM schema synchronization is disabled, so these tables are not created automatically. Run migrations against a test database before any production rollout.

## Informations documentées

Le registre documentaire du projet est porté actuellement par `project_documented_sources` et ses associations BPMN par `project_documented_source_references`. Les informations sont aujourd'hui propres à un projet ; aucune source organisationnelle partagée n'est encore introduite dans ce module.

La liste du projet et son mécanisme d'association BPMN constituent la base fonctionnelle à stabiliser en première phase. La cible à terme est une liste unifiée qui pourra présenter des informations locales et des informations du référentiel organisationnel. Dans cette cible, chaque association BPMN passe par une entrée du catalogue du projet ; le diagramme BPMN ne référence jamais directement une information globale.

Les décisions, règles de cycle de vie, limites entre l'existant et la cible, et critères de validation sont décrits dans [l'architecture du registre des informations documentées](../../../docs/architecture/documented-information-registry.md).
