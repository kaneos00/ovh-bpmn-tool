# Organization module

The Organization module owns the permanent company structure. It is additive and does not replace JobArchitecture, ProjectContext, RACI, BPMN resources, or project membership.

## Ownership boundaries

- `organization_positions`: permanent company posts, optionally linked to a generic `job_functions` record.
- `organization_assignments`: dated assignment of an existing KHI-FLOWS username to a permanent post. The end date is optional (open-ended assignment); `isActing` distinguishes an interim/acting holder. Past assignments are retained.
- `organization_position_relations`: single-parent hierarchical links between permanent posts.
- `project_job_positions.organizationPositionId`: optional bridge from a project role to a permanent post. Null means the role remains project-specific.
- Existing RACI actors and entries remain owned by ProjectContext. Existing RACI and BPMN records are only read through the established mappings.

## Integrity rules

- A permanent post is independent from its holder and may be vacant.
- Assignment periods for the same post cannot overlap; a PostgreSQL trigger serializes and checks concurrent writes. An open-ended assignment remains active until explicitly ended; interim status is metadata and does not create a second position.
- A permanent post may have only one active hierarchical parent. The relation table and trigger prevent self-links and cycles.
- A referenced permanent post is deactivated, not physically deleted.
- Only global administrators may read or change the organization directory. Personal workspace reads are scoped to the authenticated user and their project memberships.
- A change of holder never updates project RACI entries or BPMN XML.

## API

- `GET /organization/overview`
- `GET /organization/positions`
- `GET /organization/positions/:positionId` (includes assignment history and interim status)
- `POST /organization/positions`
- `PATCH /organization/positions/:positionId`
- `POST /organization/positions/:positionId/assignments`
- `PATCH /organization/assignments/:assignmentId`
- `POST /organization/positions/:positionId/relations`
- `DELETE /organization/positions/:positionId/relations/:relationId`
- `GET /organization/me/workspace`

Project-role association is exposed by JobArchitecture:

- `POST /projects/:projectId/job-positions` accepts optional `organizationPositionId`.
- `PATCH /projects/:projectId/job-positions/:positionId/organization-position` changes or clears the association.

## First implementation slice

The initial implementation includes the permanent post, dated assignment, hierarchy, project-role bridge, organization chart screen, and a personal home summary of mapped RACI responsibilities. Units, functional reporting lines, full individual HR files, and HR-system synchronization remain later scope.
