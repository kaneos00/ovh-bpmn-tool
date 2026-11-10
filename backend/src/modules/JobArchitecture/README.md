# Job Architecture module

This bounded context owns job functions, competency blocks, competencies and project-specific job positions.

## Source-of-truth boundaries

- Job functions and competency definitions are owned by this module.
- Project positions and their competency applicability are owned by this module.
- Project membership and authorization are delegated to the existing ProjectContext access service.
- RACI actors and BPMN resources remain owned by their existing modules. Mapping entities hold references only; they do not copy or update source records or BPMN XML.

## Competency block states

- `required`: the block applies to the project position.
- `optional`: the block may be used but is not mandatory.
- `not_applicable`: explicitly excluded from this position.
- `not_assessed`: no decision has been recorded yet.

A new project position initializes every block defined for its reference function as `not_assessed`. This deliberately distinguishes an unanswered decision from a block that has been excluded.

## Initial API

- `GET /job-architecture/functions`
- `POST /job-architecture/functions` (organization administrator)
- `POST /job-architecture/competency-blocks` (organization administrator)
- `POST /job-architecture/competency-blocks/:blockId/competencies` (organization administrator)
- `POST /job-architecture/functions/:functionId/blocks/:blockId` (organization administrator)
- `GET /projects/:projectId/job-positions` (project member)
- `POST /projects/:projectId/job-positions` (project modeler/administrator)
- `PATCH /projects/:projectId/job-positions/:positionId/competency-blocks` (project modeler/administrator)

RACI and BPMN mapping tables are introduced in the foundation migration. Their write APIs and consistency diagnostics are a subsequent implementation slice.
