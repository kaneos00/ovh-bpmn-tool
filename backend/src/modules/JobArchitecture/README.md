# Job Architecture module

This bounded context owns structured job-function documents, competency definitions and project-specific organisational positions.

## Source-of-truth boundaries

- Job functions and competency definitions are owned by this module.
- Project positions and their competency applicability are owned by this module.
- Project membership and authorization are delegated to the existing ProjectContext access service.
- RACI actors and BPMN resources remain owned by their existing modules. Mapping entities hold references only; they do not copy or update source records or BPMN XML.
- A new BPMN activity mapping is accepted only when its `taskId` exists as an activity ID in the latest published XML for the linked resource. Missing publication, malformed XML, unknown IDs and IDs belonging to non-activity elements are rejected.
- The function document is independent of a named incumbent and of a specific project.

## Structured function document

The function sheet uses a shared document structure, while allowing additional sections:

- document metadata: attachment/reference, date, version label, established by, validated by;
- function identification: code, name, description;
- mission;
- ordered activity sections, each with a unique code (for example CDP-1), title and ordered task list;
- extensible custom sections with a stable key, title, structured JSON content and order;
- competency blocks and competencies, with reference levels.

Activity sections can be independently created, edited, deleted and reordered. Custom sections follow the same lifecycle. The JSON content of a custom section is intentionally structured rather than a single untyped text field, so the UI can introduce suitable controls per section later.

### Function document API

All endpoints below are restricted to organization administrators in this first implementation slice:

- `GET /job-architecture/functions/:functionId/document`
- `PATCH /job-architecture/functions/:functionId/document`
- `POST /job-architecture/functions/:functionId/document/activity-sections`
- `PATCH /job-architecture/functions/:functionId/document/activity-sections/:sectionId`
- `DELETE /job-architecture/functions/:functionId/document/activity-sections/:sectionId`
- `POST /job-architecture/functions/:functionId/document/sections`
- `PATCH /job-architecture/functions/:functionId/document/sections/:sectionId`
- `DELETE /job-architecture/functions/:functionId/document/sections/:sectionId`

The approval/proposal workflow, published-version history and Word/PDF exports are explicitly phase 2. The current CRUD API is an editing foundation, not a publication/approval workflow.

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
- `GET /projects/:projectId/job-positions/:positionId/competency-requirements`
- `PATCH /projects/:projectId/job-positions/:positionId/competency-requirements` (project modeler/administrator)

## RACI and BPMN links

- `GET /projects/:projectId/job-positions/:positionId/mappings`
- `POST /projects/:projectId/job-positions/:positionId/raci-actors` with `raciActorId`
- `POST /projects/:projectId/job-positions/:positionId/activity-mappings` with `resourceId`, `taskId` and `blockId`
- `GET /projects/:projectId/job-architecture/diagnostics`

A RACI actor must already exist and be active in the same project. An activity mapping must target a process linked to the same project and a block marked required or optional on the position. Composite foreign keys enforce position, process and competency-block boundaries. A module-owned database trigger verifies that each RACI actor belongs to the same project without changing the RACI source table.

Competency-level expected values are project overrides. If no override exists, the effective level inherits the block-level requirement, then the function reference level. Setting the override to `null` removes the override and restores inheritance.

Current limitation: the supplied BPMN `taskId` is stored as the stable BPMN element identifier but is not yet checked against the BPMN XML payload. Diagnostics therefore identify missing RACI-to-position links and required blocks without activity mappings; they do not claim to validate XML element existence. Person assignment remains out of scope for this slice.
