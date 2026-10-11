# Project context and shared process repository

The process catalogue remains independent from projects. BPMN diagrams continue to be stored as ordinary `resources` of type `process`, with versions in `contents`. A project references a process through `project_processes`; linking a shared process does not copy or move its BPMN resource.

## Process link semantics

- `common`: a reference to a process intended to be reused as-is from the shared catalogue.
- `variant`: a project process that declares `sourceResourceId` as its source process.
- `project-specific`: a process created for this project, with no shared source.

A variant is a relationship only at this stage: the API validates and records its source, but does not yet clone BPMN content or provide copy-on-write/version inheritance. Do not treat variant creation as an implemented cloning workflow.

## Project access

Project membership roles are represented in the database as `viewer`, `modeler`, and `admin`. This first slice does **not** yet enforce those project roles on every resource/content endpoint; current API authorization still uses the existing global ACL. Do not rely on membership records as a security boundary until project-scoped authorization is implemented.

## Database

Apply `backend/migrations/20261011_projects_shared_processes.sql` after the existing `init.sql`. TypeORM schema synchronization is disabled, so the new tables are not created automatically.
