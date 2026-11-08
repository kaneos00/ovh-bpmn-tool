# RaciGovernance

Native administration capability for cross-project RACI actor governance.

## Boundary

This module is isolated for development and testing, but it is not a second
application or a replacement for existing BPMN Tool capabilities.

It must reuse the owning application modules for:
- authentication and organization-wide ACL;
- projects and project membership;
- local RACI actors and assignments;
- BPMN resources, contents, versioning and publication;
- the existing Administration shell and design system.

It must not create copies of existing entities, tables, repositories, workflows,
or UI screens. Ordinary project users must not depend on this module and must
see no change to their normal process.

## Current implementation slice

The first domain helper, `ActorLabelNormalizer`, is comparison-only. It does
not replace or alter the persisted local actor normalization in
`ProjectRaciController`. This distinction protects the current
`(projectId, normalizedName)` uniqueness behavior.

No database migration, controller, route, scheduled job, or UI integration is
introduced in this initial slice.

## Development and tests

The domain code is pure TypeScript and can be unit-tested with the existing
backend Jest setup without booting the application or PostgreSQL:

```sh
pnpm --dir backend test -- --runInBand
```

Integration tests will be added only when the module consumes existing
ProjectContext and ResourceContext services through explicit contracts.


## Integration gates confirmed by the V3 audit

- The existing `ResourceContext` content API already exposes XML reads and
  create/update/clone/publish operations. The governance module must call the
  owning application services; it must not add parallel content endpoints or
  repositories.
- Content publication already has a transaction helper that locks the target
  resource and draft, checks that the draft is still a draft, and can compare
  the expected published content ID. Any future harmonization write must use
  that existing publication path and its optimistic source-version check.
- The generic editable-content repository update is not a safe harmonization
  primitive: its SQL predicate does not explicitly require
  `status = 'draft'`. Do not use it to mutate published or obsolete content.
- The audited V3 frontend route table explicitly says organization
  administration is not exposed in the current shell. The existing
  administration container is therefore not proof of a reachable route.
  Integration must first restore/expose the existing Administration shell
  route under its established access controls; it must not create a second
  administration area.
- The BPMN demo fixtures contain process, task, event and call-activity
  `name` values, plus `calledElement` references and BPMN DI geometry.
  This confirms that a future rename must be element/attribute-whitelisted:
  a broad replacement of XML text or all attributes would risk changing
  technical references or unrelated labels.

These are integration constraints, not an authorization to add routes,
migrations, XML writers, or publication behavior in this initial slice.


## Fixture evidence: RACI and BPMN label boundaries

A second pass over `frontend/tests/fixtures/Parking (copie)_v9.bpmn`
confirms the following concrete XML shapes (fixture SHA
`e3d5db0cc1901d573716ad3e4c6984cd46a47b99`):

- The document uses the `bpmn2:` prefix alongside `bpmndi:`, `dc:` and
  `di:`, and declares custom `raci:` and `url:` namespaces.
- The fixture contains 73 XML `name` attributes, including participant,
  process, task, event, call-activity, sub-process, message-flow and
  sequence-flow labels. A blanket `name` rewrite is therefore unsafe:
  flow labels and collaboration labels cannot be assumed to be actor names.
- RACI assignments occur as `raci:responsible`, `raci:accountable`,
  `raci:consulted` and `raci:informed` attributes. Their corresponding
  `*Status` attributes (for example `raci:responsibleStatus`) are separate
  metadata and must remain unchanged.
- `raci:actors` is a JSON array serialized inside an XML attribute. The
  fixture stores actor `name`, `source`, `active` and sometimes `bpmnId`.
  The XML attribute itself uses entity-escaped JSON quotes
  (`&#34;`). A future rename must parse the XML attribute value, parse the
  JSON array, change only a confirmed actor `name`, serialize JSON, then
  XML-escape the attribute value correctly.
- The same fixture contains `url:link`, `calledElement`, `sourceRef`,
  `targetRef`, BPMN IDs, DI bounds and waypoints. These are not actor-label
  targets and must be invariant across any proposed transformation.

The organisation demo fixture
`examples/organisation-demo/00-organisation-complete.bpmn` (SHA
`5c0d9ea0c542dbd3e906765d10cb8c3ce2a70d6f`) uses the `bpmn:` prefix and
contains ordinary process/task/event/call-activity names and call references,
but no RACI extension attributes in the inspected content. The implementation
must therefore support both prefixed BPMN variants without assuming that
every resource contains RACI metadata.

### Required read-only extraction and transformation test cases

Before selecting or approving an XML parser, tests must cover:

1. Both `bpmn:` and `bpmn2:` prefixes, with custom namespaces preserved.
2. RACI scalar actor attributes and their independent status attributes.
3. Entity-escaped `raci:actors` JSON, including Unicode, ampersands, quotes,
   inactive entries, duplicate labels and optional `bpmnId`.
4. Empty and non-actor `name` attributes, including sequence/message flows.
5. Preservation of every ID, reference, unknown attribute, namespace binding,
   documentation node, DI shape/edge, bounds and waypoint.
6. Parse -> serialize -> parse semantic equivalence, plus an explicit
   before/after invariant comparison. Byte-for-byte equality is not assumed
   because serializers may normalize whitespace or attribute order.
7. Malformed XML and malformed `raci:actors` JSON must fail closed and must
   never yield a partially writable document.

This is fixture-derived evidence and a test contract. A parser is implemented
for read-only extraction only (see the section below); no parser has been
approved for XML serialization or round-trip transformation. No XML writer has
been implemented, and no production BPMN content has been changed.


## NestJS integration and ACL boundary (verified)

- `BpmnToolAppModule` is currently declared in `backend/src/app.module.ts`
  and imports `ResourceContextModule` and `ProjectContextModule`. This is
  the correct application composition boundary for a future native module;
  there is no existing `RaciGovernanceModule` yet.
- `ProjectContextModule` exports the existing
  `ProjectResourceAccessService`. Its organization-admin check reads the
  configured user-groups header and accepts groups beginning
  `bpmn-tool-admin-`; the read/write group is separate
  (`bpmn-tool-readwrite-`). Project roles remain viewer/modeler/admin.
- `AclGuard` implements the same group-prefix convention for
  `@UseAcl([UserGroup.Admin])`, but this guard only authenticates access to
  the controller route. The governance operation must additionally enforce
  the organization-admin rule through the existing access service; project
  membership or read/write group must not authorize cross-project mutation.
- `ResourceContextModule` currently provides its command/query handlers and
  repositories internally but exports none of them. Therefore a sibling
  `RaciGovernanceModule` imported only by `BpmnToolAppModule` cannot inject
  those providers directly. Do not work around this by creating replacement
  repositories or duplicating handlers. Before integration, expose the
  minimum existing application contract from ResourceContext (or place a
  narrow facade in that owning module) and keep the governance module
  dependent on that contract. The module dependency must remain one-way:
  ResourceContext must not import RaciGovernance.
- `ResourceContextModule` already imports `ProjectContextModule`, while
  `ProjectContextModule` exports `ProjectResourceAccessService`. The
  application-level module can compose both without introducing a reverse
  dependency into the normal project/resource request paths.

This is an integration design constraint derived from the current NestJS
module declarations, not a code change or authorization to expose broad
repositories.

## Read-only BPMN actor extraction

The first XML implementation is deliberately read-only:
`domain/actor-label.xml-reader.ts` uses the already-declared
`fast-xml-parser@5.11.2` dependency to validate and traverse BPMN XML without
building or writing XML.

The reader currently:
- recognizes BPMN model elements by the BPMN model namespace URI;
- recognizes the RACI extension by its namespace URI, not by assuming the
  literal `raci` prefix (so a different prefix bound to the same URI works);
- extracts only `responsible`, `accountable`, `consulted` and `informed`
  scalar attributes, plus the `name` values inside the `raci:actors` JSON
  array;
- returns each occurrence with element ID/type, field provenance, original
  label and comparison-normalized label; JSON actor metadata such as
  `source`, `active`, `bpmnId` and array index is retained when present;
- preserves duplicate occurrences rather than silently deduplicating them;
- ignores BPMN `name` attributes, RACI status attributes and unrelated
  namespaces;
- fails closed on malformed XML, malformed actor JSON or an invalid actor
  entry, and never returns a partial result.

This reader is an audit/import aid only. It does not read from or write to the
database, does not change XML, does not establish the future synchronization
policy, and is not a runtime dependency of Viewer or Modeler. It does not
approve `fast-xml-parser` for XML serialization or round-trip fidelity.
Those remain separate gates requiring dedicated preservation tests before any
writer, migration, import mutation or export synchronization is designed.

The unit test suite covers namespace aliases, both BPMN prefixes, scalar
assignments, entity-escaped JSON metadata, duplicate labels, ignored fields
and namespaces, and fail-closed behavior. CI results must be checked on the
resulting commit; no local test execution is claimed.

## Read-only consistency comparison

`domain/raci-consistency.comparator.ts` adds a pure comparison step for one
explicit project/resource/content-version scope. Its caller supplies snapshots
already obtained through the existing authorized application paths; this
component does not query repositories or open content itself.

It compares:
- the XML `raci:actors` registry against the existing
  `project_raci_actors` rows, including active-state conflicts only when the
  XML actually supplies an `active` value;
- task assignments from the four scalar XML RACI attributes against
  `project_raci_entries`, using the BPMN element ID, normalized actor label
  and R/A/C/I role.

The report distinguishes XML-only and database-only entries and carries the
project, resource, content ID and content version used for the XML side.
Comparison is diagnostic only; it never proposes or applies a correction.

**Important versioning limitation:** the existing `project_raci_entries`
entity has no `contentId` or content-version relationship. The comparator
therefore explicitly reports `databaseMatrixVersioned: false`. A difference
against an older published BPMN version cannot be asserted to be a true
inconsistency with that historical version: the database matrix may represent
a more recent project state. This comparison must not be used to trigger
automatic synchronization, migration or mutation. Resolving that temporal
ambiguity requires a separate architectural decision about RACI matrix
versioning and its relationship to the existing content publication lifecycle.

The comparator is intentionally not wired into controllers, NestJS modules,
Viewer or Modeler. No database adapter, endpoint, migration or write path is
introduced in this tranche.


## RACI administration contract — design audit

A further review of `ProjectRaciController` and the owning NestJS modules
establishes the following constraints for the future administration capability.

### Existing write semantics that must be preserved

- `PUT /projects/:projectId/raci` accepts the **complete project matrix**.
  It validates every row, then transactionally deletes every existing
  `project_raci_entries` row for that project and inserts the submitted rows.
  It is not a per-process patch endpoint. A caller that submits only one
  process would erase assignments for the project's other processes.
- Each row is nevertheless scoped by `resourceId`, `taskId`, actor and role;
  the database uniqueness index also includes project, resource, task and
  actor. The API's replacement boundary is broader than an individual
  process.
- The route requires both the global read/write ACL group and at least the
  project `Modeler` role. Project `Viewer` can read the matrix. This is
  appropriate for ordinary project editing but is not sufficient authority
  for cross-project governance.
- `POST /projects/:projectId/raci/actors/sync` only adds previously unknown
  names to the project actor registry. It does not reactivate an inactive
  actor and does not remove actors absent from the latest XML. This is a
  non-destructive import behavior, not a general reconciliation operation.
- Actor rename updates matching assignment labels in a transaction and checks
  for collisions. Actor activation is a separate operation. Future global
  actor harmonization must not bypass these existing rules or silently rename
  project actors.

### Authorization matrix for governance

| Operation | Minimum authority |
| --- | --- |
| Read one project's local actors/matrix | Existing project Viewer membership, subject to global ACL |
| Edit one project's local matrix/actors | Existing global RW ACL plus project Modeler (or existing project Admin policy where explicitly supported) |
| Inspect cross-project actor matches | Organization/global Admin |
| Propose, confirm or reverse cross-project harmonization | Organization/global Admin, with explicit preview and audit |
| Publish BPMN content affected by a harmonization | Existing ResourceContext publication authorization and transaction; never inferred from governance read access |

A project administrator is not automatically an organization administrator.
Likewise, a global RW group alone must not authorize cross-project mutation.
For governance routes, the existing global Admin ACL and
`ProjectResourceAccessService.hasOrganizationAdminRole()` must be applied
consistently; project membership is not a substitute.

### Module composition contract

- `BpmnToolAppModule` is the composition root and already imports
  `ProjectContextModule` and `ResourceContextModule`.
- `ProjectContextModule` owns the RACI entities/controller and exports
  `ProjectResourceAccessService`, but does not expose a dedicated application
  service for safe RACI reads/writes. The current controller directly owns
  repository operations.
- `ResourceContextModule` owns content handlers and repositories and exports
  none of them. It already imports `ProjectContextModule` for resource ACL.
- A sibling governance module cannot safely inject those private providers
  merely because the owning modules are imported by the application root.

Before integration, add narrow application-facing contracts in the owning
modules rather than exporting TypeORM repositories or duplicating handlers.
The ProjectContext contract should expose authorized project actor/matrix
operations with explicit project/resource scope and must make the full-matrix
replacement semantics impossible to mistake for a per-resource update.
The ResourceContext contract should expose read of the selected published
content and the established create-draft/publish workflow, including the
expected source content ID. The governance module should orchestrate those
contracts only; it should not access persistence tables directly.

Keep dependencies one-way. The governance module may depend on the owning
contracts and be composed by `BpmnToolAppModule`; ProjectContext and
ResourceContext must not import the governance module. Do not export broad
repositories, add a second RACI controller, or add a parallel content
publication path.

### Immediate implementation decision

No route or mutation is added in this design slice. Before any implementation,
the narrow contracts and their transaction boundaries must be specified and
tested. In particular:
1. A project-scoped edit must not delete assignments belonging to other
   projects or processes.
2. A cross-project harmonization must preview every affected actor and
   assignment before confirmation.
3. A BPMN XML change must target an explicitly created draft, preserve
   non-target XML semantics, and publish only against the expected source
   content ID.
4. Any partial failure must leave the original matrix and published content
   unchanged, with an auditable and controlled reversal path.


## Narrow application facades — implementation contract

The follow-up source review confirms that the existing use cases can be
reused, but their current public boundaries are not sufficient for a safe
governance orchestrator. The next implementation should introduce two small
facades in the modules that own the data. The signatures below are logical
contracts; they are not yet implemented APIs.

### ProjectContext facade

Expose a ProjectRaciApplicationPort from ProjectContextModule, backed by
the existing TypeORM entities and the same authorization service:

- readProjectRaciScope({ projectId, resourceId, headers }): verify that the
  resource is linked to the selected project, verify the existing project
  Viewer membership, and return only that resource's actor registry and
  assignment rows. Never return the full project matrix when a
  resource-scoped snapshot was requested.
- readProjectRaciRegistry({ projectId, headers }): read the project's
  existing actor registry under the existing project read policy.
- replaceProjectRaciScope({ projectId, resourceId, entries, headers,
  expectedScopeRevision }): do not implement this by calling or wrapping
  the existing full-project PUT. Validate every row belongs to the supplied
  resource, validate active registered actors and the project link, then
  perform a resource-filtered delete/insert in a transaction. The revision
  precondition must be checked under the same transaction/lock to prevent
  stale preview confirmation from overwriting a concurrent edit.

The facade must not accept arbitrary project/resource pairs without checking
the ProjectProcessTypeOrmEntity link. It must preserve the existing
uniqueness semantics and reject duplicate actor/task assignments before any
write. Existing project-level full replacement remains a distinct use case;
its contract must be named/documented as full-project replacement.

Cross-project operations must use the existing organization-admin check in
addition to the global Admin ACL. A project Modeler/Admin or global RW user is
not sufficient. The facade should receive trusted request identity/context
from the authenticated application boundary; it must not trust a caller-
supplied user ID.

**Schema scope clarification:** `project_raci_actors` is keyed only by
`projectId`; the actor registry is project-wide, not process-specific.
`project_raci_entries` is the table filtered by both `projectId` and
`resourceId` for a process-scoped snapshot. The implementation and tests
preserve this distinction.

### ResourceContext facade

Expose a ResourceContentGovernancePort from ResourceContextModule, with
only the operations required by governance:

- Read a content snapshot by the exact resourceId + contentId, including
  status and version metadata; reject a content ID belonging to another
  resource. Apply the existing resource/project read policy.
- Create an explicit draft from the selected published source through the
  established clone/proposal workflow. The current generic clone handler
  clones a content version within the same resource; it does not itself
  express a target resource. Do not pretend it supports cross-resource
  promotion. Reuse the existing process-change-proposal path where its
  source/target semantics apply.
- Update only a draft whose identity and status have been re-read and
  verified inside the write transaction. The generic updateEditableFields
  method must not be treated as a draft guard because its update predicate
  does not itself require status = 'draft'.
- Publish through the existing transaction helper with the exact expected
  published source content ID. Keep the existing resource lock, draft lock,
  version increment, obsolete transition and auth-token behavior.

Do not export the ContentRepository, TypeORM repositories, or private command
handlers as a general-purpose API. The facade should return typed domain
results and map failures at the owning module boundary.

### Transaction boundary — required before write implementation

Both contexts use the application's TypeORM connection, but that alone does
not make two independent service calls atomic. The existing ProjectContext
matrix replacement opens its own transaction, while publication accepts an
EntityManager inside its own publication transaction. Calling these existing
operations sequentially would permit a partial result (matrix changed but XML
publication failed, or vice versa).

Therefore the final confirm operation must not be implemented as two ordinary
facade calls. Before enabling writes, introduce a narrow shared unit-of-work
contract backed by the single application DataSource, and make both owning
facades accept the same transaction-scoped EntityManager (or an equivalent
opaque transaction context). Under that one transaction:
1. re-check the preview's expected project-matrix revision and expected
   published content ID;
2. lock and validate the target project/resource link, actors and assignments;
3. write only the selected resource's RACI rows;
4. create/update the explicit draft without touching published content;
5. publish through the existing publishDraftContentWithinTransaction
   helper using the same manager;
6. append the audit event in the same transaction.

If the existing process-change-proposal lifecycle cannot be invoked with that
same manager, stop before mutation and redesign the workflow; do not silently
fall back to a two-transaction sequence. A compensating action is not an
equivalent substitute for atomicity unless it is itself durable, tested and
auditable.

### Required facade and orchestration tests

Before adding an administration route or enabling any mutation, tests must
prove:

- a resource not linked to the supplied project is rejected;
- a scoped read returns no other process's actors or assignments;
- a scoped write cannot delete or modify another process's rows;
- a stale matrix revision or changed published content ID rejects confirmation
  without writes;
- inactive or unregistered actors cannot be assigned implicitly;
- a content ID from another resource is rejected;
- a published or obsolete content row can never be edited as a draft;
- a publication failure rolls back matrix, draft and audit changes together;
- organization-admin checks reject project-only Admin and global RW identities;
- retries and concurrent confirmations cannot apply the same preview twice.

Until these contracts and tests exist, the governance module remains
read-only. No route, UI, migration, XML writer, or Viewer/Modeler dependency
is authorized by this design step.


## ProjectContext facade — first read-only implementation

Commit `d08dc7bc4d01123789d8dda2b4c03cfe3faff6d3` adds
`ProjectRaciApplicationService` to the owning ProjectContext module and
exports it as a narrow provider for future consumers.

Implemented operations:
- `readProjectRaciScope(projectId, resourceId, headers)`: checks existing
  project Viewer membership, verifies the exact project/process link, reads
  the project actor registry, and reads assignments filtered by both
  projectId and resourceId.
- `readProjectRaciRegistry(projectId, headers)`: reads the existing
  project-wide actor register under the same Viewer policy.

Schema clarification: `project_raci_actors` is keyed by projectId, not
resourceId. The actor register is therefore project-wide; only assignment
rows are process-scoped. The facade and its tests preserve that distinction.

Five focused unit tests cover Viewer authorization, missing project/process
links, scoped assignment filtering, denied reads and project-wide registry
reads. The facade exposes no write method and does not alter the existing
ProjectRaciController behavior. No repository/table duplication, route,
migration, UI or Viewer/Modeler integration is added.

The tests have been committed but have not been executed in this environment.
The latest commit currently has no associated workflow run or status check;
CI is not confirmed.


## ResourceContext facade — first read-only implementation

The ResourceContext owner module now exposes
`ResourceContentGovernanceService` as a narrow read-only contract for the
future governance orchestrator.

`readContentSnapshot(resourceId, contentId, headers)`:
- applies the existing `ProjectResourceAccessService.assertCanReadResource`
  policy before reading content;
- queries by the exact pair `resourceId + contentId`, so an identifier from
  another resource is not accepted;
- returns the XML payload together with status, version, change comment and
  update timestamp needed for a scoped comparison;
- returns not-found for a missing or cross-resource content identifier.

The service is exported only by its owning `ResourceContextModule`. It does
not expose repositories or generic command handlers, and it has no draft,
update, XML-write or publication method. This preserves the existing
one-way module dependency: ResourceContext already depends on ProjectContext
for resource access, while ProjectContext does not depend on ResourceContext
as a Nest module.

Four focused unit tests cover access-before-read, exact resource/content
scoping, cross-resource rejection and denied-access short-circuiting. They
have been committed but not executed in this environment. The shared
transaction and all write operations remain blocked.


## Shared transaction feasibility — second implementation audit

A source-level pass over the current V3 code confirms that the application
uses one TypeORM `DataSource` registered in `backend/src/app.module.ts`.
Both ProjectContext and ResourceContext therefore participate in the same
database connection. More importantly, the existing proposal workflow already
demonstrates the required low-level pattern:

- `createProposalWorkspace(manager, ...)` creates the proposal resource and
  draft through repositories obtained from the caller's `EntityManager`.
- `publishProposalWorkspace(manager, ...)` delegates to
  `publishDraftContentWithinTransaction(manager, ...)`.
- `publishApprovedProposal` wraps publication, proposal status transition
  and the `published` audit event in one `dataSource.transaction` callback.
  The publication helper receives that same manager and checks the expected
  source published-content ID.

This proves that draft/workspace creation, BPMN publication and proposal
audit can already share one transaction when called from the existing
proposal controller. It does **not** yet prove that the ProjectContext RACI
matrix can be safely included in that transaction through the current
application facade.

### Remaining blockers before a shared write

1. `ProjectRaciApplicationService` is currently read-only and its
   repositories are injected directly. A future write method must use
   `manager.getRepository(...)` from the caller's transaction, not the
   injected repositories.
2. The current full-project `PUT /projects/:projectId/raci` validates
   actors and project/process links before opening its transaction, then
   deletes every assignment for the project. It does not lock a common
   project/process coordination row. A process-scoped writer cannot safely
   assume its resource-only delete/insert is serialized against this legacy
   full-project replacement.
3. Existing actor creation, activation, synchronization and rename paths do
   not all share a common project-level lock protocol. A transaction-scoped
   re-check alone is insufficient if competing legacy writers do not honor
   the same lock.
4. `assertProjectRole` currently uses an injected repository outside the
   transaction. A final confirm operation must re-check the authenticated
   user's current membership inside the transaction, using the same manager.
5. `project_raci_entries` has no explicit revision/version column. The
   current schema cannot supply a durable monotonic scope revision. A
   preview/confirm contract must not invent one or use a content version as
   a substitute. The implementation must first define a serialization and
   stale-preview strategy that also covers existing write paths.
6. The proposal publish endpoint contains controller-owned authorization,
   pending-remark checks, proposal locking and audit behavior. Reusing only
   its low-level publication helper does not reuse the complete proposal
   lifecycle. Governance must not create or publish a proposal workspace
   behind that lifecycle's back.

### Safe conclusion

The existing TypeORM design is technically capable of a single transaction:
the same `EntityManager` can be passed to ProjectContext persistence and the
existing ResourceContext publication helper. The missing part is a shared
write contract and a lock/revision protocol honored by **all** competing RACI
writers. Until that is designed and tested, no mutation method or unit of
work is exposed. The read-only facades remain the only new application
contracts.

The next implementation gate is to design the common lock protocol and
revision semantics, then adapt the existing full-project matrix and actor
write paths to honor it without changing their public behavior. Only after
that should a resource-scoped transaction-aware write facade be introduced.


### Candidate serialization protocol — design proposal, not implemented

The existing project row is a candidate coordination lock because every RACI
actor and assignment belongs to a project. A future write transaction could
acquire `projects.id = projectId` with `pessimistic_write` before reading or
changing either table. The protocol would have to be adopted by every
ProjectRaciController mutation path (full matrix replacement, actor create,
BPMN actor import, rename and activation), not only by the new governance
facade. The selected `project_processes` link should also be re-read and
locked in the same transaction so a concurrent unlink cannot invalidate the
scope.

For a stale-preview precondition, the current schema has no monotonic RACI
revision. One candidate that does not pretend otherwise is a deterministic
fingerprint of the canonical sorted actor-register and selected-process
assignment snapshot. Confirmation would re-read the same data under the
coordination lock and compare fingerprints before writing. This is a
state-precondition, not a database revision number; it must be documented as
such and must include every field whose change invalidates the preview.
Membership and organization-admin authorization must also be revalidated
inside the transaction using its manager.

This protocol remains a proposal, not a verified implementation decision.
Before adopting it, inspect all project-process link mutation paths, all
RACI persistence writers and membership revocation paths; then add
concurrency/integration tests against PostgreSQL. If any competing writer
cannot honor the same lock, the protocol is insufficient and writes remain
blocked. No schema change, migration or runtime behavior is introduced here.


### Lock-protocol audit — project links and membership

The follow-up inspection of `ProjectController` refines the candidate lock
protocol:

- Membership changes already use `changeProjectMember`, which locks the
  `projects` row with `pessimistic_write` before changing memberships.
  A governance confirmation can use the same project-row lock and re-check
  the current member under that lock.
- The normal process-link endpoint currently saves a link directly, and
  unlink currently deletes it directly; neither takes the project-row lock.
- Variant creation uses a transaction for resource/content/link creation,
  but does not lock the project row.
- Therefore a project-row lock by itself is not yet a complete scope guard:
  attach, unlink and variant-link creation must adopt the same lock before a
  governance transaction can rely on a stable project/resource relationship.
- The RACI actor/matrix write paths are concentrated in
  `ProjectRaciController`; the project-link and membership paths are in
  `ProjectController`. Both controllers must participate in the protocol.

This means the next safe code slice, if approved for implementation, is an
internal serialization refactor across these existing write paths (without
changing their public API), followed by PostgreSQL concurrency tests. It is
not sufficient to add a lock only to the new governance facade.

### Lock-protocol audit — proposal workspace link creation

A further repository-wide controller pass found one additional project-link
writer outside `ProjectController`: the proposal workflow in
`ProcessChangeProposalController.createProposal`.

Within its existing `DataSource.transaction`, the workflow:
- reads the selected source `project_processes` row with
  `pessimistic_read`;
- creates a private proposal resource and draft through
  `createProposalWorkspace(manager, ...)`;
- for a non-Common source, inserts a new
  `project_processes` row linking the proposal workspace to the same project;
- deliberately does not create a second project link for a Common source.

The transaction is atomic for workspace/resource/content/proposal/event
creation, but it does not acquire the candidate `projects` row coordination
lock before rechecking membership and the source link. Its source-link
`pessimistic_read` is not a substitute for the common project-row protocol:
it does not serialize against existing attach/unlink writers that currently
do not lock the project row.

Consequently, the complete adoption inventory is broader than the two
controllers first identified. Before relying on a project-row lock, the
protocol must cover:
1. every RACI actor and assignment writer in `ProjectRaciController`;
2. ordinary attach, unlink and variant creation in `ProjectController`;
3. proposal workspace link creation in
   `ProcessChangeProposalController.createProposal`;
4. membership changes, which already take the project-row write lock.

Proposal operations that only update proposal state or comments do not
themselves create or remove project-process links. Their existing
proposal/resource/content locks remain separate and must retain their current
ordering; any future addition of project-row locks must be reviewed for
deadlock-safe, consistent lock ordering across the proposal lifecycle.

This is an audit finding only. No lock or runtime behavior has been changed.
The common lock protocol remains unimplemented, and RACI governance writes
remain blocked pending adoption by every relevant writer and PostgreSQL
concurrency tests.

### Lock-protocol audit — indirect link deletion through ResourceContext

The audit of `ResourceController.deleteResource` and the owning migration
found an additional indirect mutation path that must not be overlooked.

The resource deletion command recursively deletes the selected resource and
its descendants. The existing schema declares
`project_processes.resourceId -> resources.id ON DELETE CASCADE`; RACI
assignment rows also cascade when their project/process link is deleted.
Therefore, deleting a resource tree can remove project-process links and
their RACI assignments without calling `ProjectController.unlinkProcess`.

The controller currently calls `assertCanDeleteResourceTree` before invoking
the ResourceContext delete handler. That policy rejects Common processes and
resources linked to multiple projects, but the deletion repository performs
the recursive resource deletion without a transaction-scoped project-row
coordination lock or a re-check of the affected links under such locks.

This means the candidate project-row protocol must also account for
ResourceContext tree deletion. Before deletion, the affected resource tree
and all project IDs whose links will cascade must be determined; the
coordination rows must then be locked in a deterministic order and the
resource/link policy revalidated in the same transaction as the deletion.
The current generic resource deletion command/repository does not expose that
transaction contract. It must be adapted in its owning module or wrapped by a
narrow ResourceContext application service; ProjectContext must not become a
dependency of the governance module in the reverse direction.

The complete writer inventory now includes direct link insert/delete paths,
proposal workspace link creation, RACI writes, membership changes, and
indirect cascade deletion through ResourceContext. No common lock is safe to
rely on until this deletion path participates too. This finding is
documentation only; no runtime behavior has changed.

### Candidate transaction protocol — resource-first, then project coordination

The earlier project-row-only candidate is insufficient once ResourceContext
recursive deletion and link creation are considered. A project lock cannot by
itself protect a resource tree from a concurrent child creation or resource
deletion. The candidate protocol is therefore revised to a single global
ordering:

1. Lock all affected resource rows first, in ascending UUID order.
2. Lock all affected project rows second, in ascending UUID order.
3. Re-read and validate the exact resource/project links and the caller's
   current membership/organization authorization under those locks.
4. Perform all related writes through the same transaction's EntityManager.
5. Commit only after link changes, RACI changes, content publication (where
   applicable), and required audit events have all succeeded.

Operations that touch only project membership or project metadata may take
the project row lock without resource locks, but must never subsequently
request a resource lock. This preserves the resource-before-project order
without creating a project-to-resource lock cycle.

#### Required resource participation

A link writer must lock the target process resource before locking its
project. A variant workflow must lock its source resource before the project
row; its newly inserted variant row is transaction-owned. A proposal workspace
workflow must lock the source resource before the project row and keep its
existing resource/content/proposal transaction semantics.

Resource tree deletion needs a stronger protocol than a one-time recursive
query:
- Lock the requested root resource row first.
- Enumerate descendants; lock discovered resource rows in ascending UUID
  order.
- Re-enumerate the tree after acquiring those locks, locking newly discovered
  rows and repeating until the locked set and current tree are stable.
- Determine every project linked to any resource in the stable tree.
- Lock those project rows in ascending UUID order.
- Re-read the tree/link set and revalidate delete policy under the locks.
- Delete the complete tree and its cascaded links/assignments in the same
  transaction.

For this to prevent phantom descendants, every resource creation that assigns
a non-null parent must lock that parent row before inserting the child.
Resource clone/variant paths that create a child under an existing parent must
follow the same rule. Any future move/reparent operation must lock both old
and new parent rows in ascending UUID order and participate in the same
hierarchy protocol. The current generic ResourceContext create/delete
repository contract does not yet provide these transaction-scoped guarantees.

#### Project-side participation

The following paths must coordinate on the project row:
- membership changes (already implemented);
- default-validator and project metadata updates that depend on membership;
- project deletion, with its linked-process count checked after locking;
- process attach, unlink and variant-link creation;
- proposal workspace link creation;
- all RACI actor/matrix writes that depend on the project or a project-process
  link.

For database-only RACI mutations (actor registry, actor rename/active
state, and project matrix replacement), the project row is the coordination
lock. These operations must not acquire a resource lock after taking the
project lock. They must re-read the actor registry, current matrix and exact
`project_processes(projectId, resourceId)` links inside the transaction.
This is sufficient to serialize them against attach/unlink/resource-tree
deletion once every link writer follows the resource-first/project-second
protocol, because those writers cannot pass the project lock while the RACI
transaction is active.

A future XML/content reconciliation that also locks or publishes a BPMN
resource must instead acquire its resource row(s) first, then the project row,
and only then re-read and mutate the RACI rows. It must never start with the
project row and later request a resource lock.

The current project update/default-validator and project delete paths still
perform their checks and writes outside a transaction-scoped project lock.
They must be included in the implementation inventory; it is not enough to
refactor only attach/unlink and membership changes.

#### Deadlock and consistency constraints

- Every multi-resource lock set is sorted by resource UUID; every multi-project
  lock set is sorted by project UUID.
- Never acquire a resource lock after acquiring a project lock.
- The resource-tree deletion loop must lock newly discovered descendants
  before revalidating the final tree.
- A writer that cannot follow the protocol must be adapted or must not be
  allowed to mutate the protected relationship.
- Existing content/proposal locks must be reviewed against the new prefix
  ordering before adoption. In particular, proposal workflows must not lock a
  proposal/content row first and later request resource/project locks if a
  competing workflow can acquire those rows in the reverse order.
- Authorization must be re-read in the transaction. An earlier controller
  pre-check is useful for fast rejection but is not an authorization guarantee.
- All repositories involved in a coordinated mutation must be obtained from
  the same `EntityManager`; injected global repositories and pre-transaction
  reads must not be used for the protected write decision.
- The deterministic snapshot fingerprint remains a stale-preview precondition,
  not a database revision number. It must be computed from the locked,
  re-read canonical actors and scoped entries; the expected fingerprint must
  be checked before any mutation.
- The matrix replacement endpoint that deletes all project entries must not
  be reused for process-scoped reconciliation.

#### Implementation gate

This is a candidate protocol, not an approved implementation. Before any
writer is changed, inspect and map every resource hierarchy writer, project
metadata/deletion writer, RACI writer, proposal writer, and cascade path.
Then implement shared transaction helpers and migrate all participants as
one coordinated change. Add PostgreSQL integration tests with two independent
connections for:
- attach racing with resource-tree deletion;
- child creation racing with ancestor deletion;
- unlink racing with process-scoped RACI confirmation;
- membership revocation racing with RACI confirmation;
- two simultaneous project deletions/last-admin changes;
- proposal workspace creation racing with unlink/deletion;
- stable lock ordering for overlapping multi-resource/multi-project trees.

Until all writers participate and those tests pass, no RACI governance write
or XML reconciliation may be enabled.

### Additional hierarchy-writer inventory

A focused pass over ResourceContext command handlers found the concrete
resource-tree writers that must adopt the parent-row rule:

- `POST /resources` delegates to `CreateResourceCommandHandler`, which
  currently reads the parent, checks sibling names, and saves through the
  generic repository without a transaction or parent lock.
- `POST /resources/:resourceId/clone` creates a resource under the source's
  existing parent and then copies content in separate repository operations;
  it currently has no transaction-scoped parent lock.
- `ProjectController.createProcessVariant` inserts a variant under the
  source's parent inside a transaction, but currently does not lock that
  parent or the source row.
- `createProposalWorkspace(manager, ...)` inserts a proposal workspace under
  the source's parent inside the proposal transaction; it currently does not
  lock the parent row as part of a common hierarchy protocol.
- `UpdateResourceCommandHandler` changes name/description only; it does not
  currently reparent resources. If reparenting is added later, it must lock
  old and new parents in sorted UUID order and participate in the hierarchy
  protocol.

This confirms that parent locking cannot be added only to the delete handler.
All child creation paths must coordinate through the same parent-row lock;
otherwise a folder deletion can miss a concurrently inserted descendant.

Project-level mutation inventory is also wider than process links:
- `ProjectController.updateProject` validates and saves the default validator
  outside a transaction, while membership changes can concurrently demote or
  remove that user. It must lock the project row and revalidate membership in
  the same transaction.
- `deleteProject` and `deleteOrganizationProject` count links and delete
  the project outside a transaction. They must lock the project row before
  checking the final link count, so a concurrent attach cannot race the
  deletion.
- `updateOrganizationProject` writes project metadata outside a transaction;
  it should use the shared project mutation transaction helper for a uniform
  project-row write discipline.
- `createProject` currently saves the project and its initial administrator
  in separate operations with compensating cleanup. It is a new-project
  lifecycle rather than a contested existing-project mutation, but should be
  made one transaction when the project mutation service is introduced.

The resource tree protocol therefore has to be integrated at the application
service/repository boundary, not implemented as ad hoc controller locks.
The generic `ResourceRepository` currently exposes no EntityManager-aware
transaction API, and its TypeORM delete method performs recursive selection
and deletion using an injected global repository. The ResourceContext
application contract must be extended so the controller's policy checks,
resource/parent locks, project-link checks, and recursive deletion share one
transaction manager.

### Variant and clone semantics — RACI state boundary

A source review of the three existing clone paths identifies materially different lifecycle semantics that the governance contract must preserve:

- **Project variant** — `ProjectController.createProcessVariant` reads the source's latest published BPMN content, then in one transaction creates a new resource with a new `resourceId`, copies the XML into its first draft, and links the new resource to the selected project with `usage = Variant` and `sourceResourceId`. It does not copy `project_raci_entries`. The copied XML can therefore still contain RACI extensions while the new resource has no corresponding database assignments. The project-wide actor registry remains the same registry because it is keyed by `projectId`.
- **Generic resource clone** — `POST /resources/:resourceId/clone` creates a separate resource and copies the selected source XML through separate handler calls. It does not create a project link or copy RACI assignment rows. If content copying fails, cleanup is best-effort rather than part of one shared transaction. This path is not a safe primitive for governance harmonization.
- **New version draft of the same resource** — `POST /resources/:resourceId/contents/:contentId/clone` creates a draft from an existing content version under the same `resourceId`. It copies XML only. The existing project RACI matrix remains the current database matrix for that resource; it is neither cloned nor frozen for the draft. Publishing the draft does not create a RACI snapshot.

#### Consequence and proposed policy

A new project variant must be treated as an independent process, not as an implicit copy of the source process's database matrix. Its copied XML RACI values are import evidence only. The initial database matrix for the variant should remain empty until an administrator explicitly reviews a preview and confirms an import/transfer. The project actor registry is not copied because it is already project-wide; candidate actors found in the XML must be reconciled against that registry through the existing non-destructive actor workflow.

This is a proposed governance rule, not an enabled behavior or an already approved product decision. Before implementing it, confirm whether a project variant should always start with an empty assignment matrix or whether the administrator should be offered an explicit, previewed copy of the source matrix as a starting point. In either case, no automatic copy, merge, or XML-to-database synchronization is permitted.

Required integration tests must distinguish all three paths and assert the resource IDs, content status/version, project links, actor registry, assignment rows, and retained XML RACI extensions. They must also prove that a failed clone cannot leave a partially linked or partially governed variant.

#### Accepted decision — variant starts empty; optional explicit transfer

Decision confirmed by the product owner on 2026-11-08:

1. Every newly created project variant starts with **no database assignment rows** in `project_raci_entries`. The source process's matrix is never copied implicitly.
2. The project-wide actor registry is not duplicated or reset. It remains shared by the project, as required by the existing `project_raci_actors` scope.
3. An administrator may later request an explicit transfer from the source process to the variant. This is a separate governance operation, not part of variant creation or XML publication.
4. The transfer must first produce a read-only preview. Only a subsequent explicit confirmation may write assignments. There is no automatic merge, overwrite, XML rewrite, or publication.

##### Preview contract to implement later

The preview should be bound to the exact source and target scope and include:
- project ID, source resource ID, target variant resource ID;
- source matrix snapshot and its deterministic fingerprint;
- target resource's exact draft content ID, version and XML fingerprint;
- each proposed assignment, matched by stable BPMN element ID and role;
- actor-register validation (registered, active, normalized-name collision);
- target BPMN element validation, duplicate candidates, and all rejected/unmapped rows with explicit reasons.

The preview must not silently drop rows. Any assignment whose BPMN element ID is absent from the target draft, whose actor is inactive/unregistered, or whose role is invalid must be reported as unresolved. A name-only task match is not sufficient for automatic transfer. Human resolution is required for unresolved rows.

Confirmation must revalidate the source matrix fingerprint, target draft identity/version/fingerprint, actor registry, project membership and administrator authorization inside the same transaction that writes the target assignments. It must reject stale previews without partial writes. A confirmed transfer must be auditable and idempotent; retrying the same confirmation cannot duplicate or reapply it. It must not modify the source matrix or either BPMN XML document.

**Implementation gate:** this contract is approved as a design direction, but implementation remains blocked until the shared lock/revision protocol is adopted by every competing RACI writer and project/process-link mutation path, and PostgreSQL integration tests prove concurrency, stale-preview rejection, authorization revalidation, atomicity and idempotency. No new table, migration, endpoint, UI or writer is authorized by this decision alone.


### Writer inventory — direct endpoint and handler audit (2026-11-08)

A further source pass mapped the concrete write entry points. This is an
inventory of current behavior, not an implementation approval.

#### RACI actor and assignment writers

| Entry point | Current write behavior | Coordination gap |
|---|---|---|
| `PUT /projects/:projectId/raci` | Validates actor registry and project-process links before opening a transaction; transaction then deletes every assignment for the project and inserts the submitted matrix. | Authorization, active actor checks, and link checks are stale-able; no project lock; broad project-wide delete is unsuitable for process-scoped reconciliation. |
| `POST /projects/:projectId/raci/actors` | Checks duplicate using injected repository, then saves actor outside a transaction. | No project lock; concurrent duplicate/create and membership revocation can race. |
| `POST /projects/:projectId/raci/actors/sync` | Reads existing registry outside transaction, then inserts additions with `orIgnore` in a transaction. | No project lock; pre-read can be stale; ignored conflicts conceal which proposed rows were actually inserted. |
| `PUT /projects/:projectId/raci/actors/:actorId` | Transactionally renames actor and rewrites matching assignment labels. | Transaction does not lock project row or revalidate membership inside transaction; collision scan and updates are not coordinated with other writers. |
| `PATCH /projects/:projectId/raci/actors/:actorId` | Reads actor and saves active flag outside transaction. | No project lock; can race assignment replacement, transfer confirmation, and membership revocation. |

The current controller therefore has five distinct write paths across two tables.
A transaction alone is not a common concurrency protocol: only actor rename
currently wraps its related writes, and even that transaction lacks the
project-level serialization lock and transaction-scoped authorization check.

#### Project membership, metadata and process-link writers

| Entry point | Current behavior | Coordination gap |
|---|---|---|
| `POST /projects` | Creates project and initial admin membership in separate saves with compensating project deletion. | Not atomic; should become one transaction in the shared project lifecycle service. |
| `PUT /projects/administration/projects/:projectId/members/:userId` and `DELETE .../members/:userId` | Delegate to `changeProjectMember`, which already locks the project row and performs membership changes transactionally. | This is the strongest existing project-row locking pattern; confirm every related membership/default-validator check uses the same manager. |
| `PUT /projects/administration/projects/:projectId` | Reads and saves project metadata through injected repository. | No project lock or manager-scoped write. |
| `PUT /projects/:projectId` | Checks default validator membership and active account before saving project through injected repository. | Membership/account validation can race demotion/removal; no project lock or transactional re-read. |
| `DELETE /projects/administration/projects/:projectId` and `DELETE /projects/:projectId` | Count process links, then delete project in separate operations. | Attach can race the count/delete; project row must be locked before final link count. |
| `POST /projects/:projectId/processes` | Checks role/resource visibility, then saves link through injected repository. | No project/resource locks; link creation can race project deletion, resource-tree deletion, and scoped RACI confirmation. |
| `DELETE /projects/:projectId/processes/:resourceId` | Reads link, counts links to resource, then deletes link separately. | No project/resource locks; last-link invariant can race another attach/unlink and RACI confirmation. |
| `POST /projects/:projectId/processes/variants` | Transactionally inserts variant resource, first draft XML and project link. | Does not lock source resource, destination parent or project; must follow global resource-before-project lock order and revalidate source publication under lock. |

#### Resource hierarchy and content writers that intersect governance

- `POST /resources` uses `CreateResourceCommandHandler`; parent/sibling checks
  and resource save use the generic repository without a parent lock or shared
  transaction.
- `POST /resources/:resourceId/clone` creates the new resource and copies its
  content through separate handler calls; cleanup on content failure is
  best-effort. It is not an atomic governance primitive.
- `DELETE /resources/:resourceId` recursively discovers descendants and
  deletes them through the injected global repository. The recursive set is
  not protected against concurrent child creation.
- `POST /resources/:resourceId/contents`, `PUT /resources/:resourceId/contents/:contentId`,
  `DELETE /resources/:resourceId/contents/:contentId` and
  `POST /resources/:resourceId/contents/:contentId/clone` use handlers/repositories
  that are not uniformly manager-aware. Their read/check/write sequences need
  review against resource deletion and any future RACI preview confirmation.
- `POST /resources/:resourceId/contents/:contentId/publish` does use the
  existing atomic publication helper, which locks the resource and content
  rows. Its lock prefix must be reconciled with the proposed resource-before-
  project order before any cross-context transaction is introduced.
- Proposal workspace creation is transaction-scoped but currently inserts a
  resource under the source's parent without participating in a common parent
  lock. Proposal publication uses the shared content publication helper.
  Proposal/content lock acquisition order must be checked end-to-end, not
  inferred from the helper alone.

#### Consequences for the shared protocol

1. The project row is the serialization point for project membership,
   project-process links, actor registry and RACI assignment mutations.
2. Any operation touching both resource hierarchy/content and project state
   must acquire all resource/parent locks first (resource UUID order), then
   project locks (project UUID order), then re-read authorization, links,
   actor registry, assignments and target draft through the same
   `EntityManager`.
3. A project-only operation must not later acquire a resource lock. A resource
   operation must not hold a project lock while waiting for a resource lock.
4. Existing content publication and proposal flows require an explicit
   lock-order audit before they can be composed with project governance;
   do not weaken or bypass their existing publication/proposal guards.
5. No writer is changed by this inventory. The next design step is a complete
   lock graph and manager-aware application contracts, followed by PostgreSQL
   concurrency tests. RACI write/reconciliation remains disabled until every
   participating writer follows the same protocol.


### Proposal workflow lock-order audit (2026-11-08)

A deeper pass through `ProcessChangeProposalController` and
`publishDraftContentWithinTransaction` found that the proposal workflow is
already transactional, but its lock acquisition order is not yet compatible
with the proposed resource-before-project protocol. It must not be treated as
a ready-made cross-context coordinator.

| Workflow | Observed lock/read order | Implication |
|---|---|---|
| Create proposal / first Viewer remark | Membership read; project-process link `pessimistic_read`; source resource `pessimistic_write`; published content `pessimistic_read`; optionally proposal clone draft `pessimistic_write`; then workspace resource/content and optional project-process link inserts. | Acquires project-link lock before resource lock; workspace child insertion does not lock parent. Authorization is re-read from membership in the transaction, but the project row itself is not locked. |
| Submit proposal | Proposal row `pessimistic_write`; source resource `pessimistic_read`; source published content `pessimistic_read`; project-process link `pessimistic_read`; workspace draft `pessimistic_write`. | Proposal lock precedes resource and project-link locks; role is re-read in transaction but no project serialization lock is held. |
| Decide proposal | Proposal row `pessimistic_write`; latest submitted event and remarks; project-process link `pessimistic_read`; membership re-read; proposal/event writes. | Proposal lock precedes project-link lock; no project-row serialization lock. |
| Publish approved proposal | Proposal row `pessimistic_write`; project-process link `pessimistic_read`; membership and remarks; then `publishDraftContentWithinTransaction` locks source resource, submitted draft, prior published content and latest version. | Concrete reverse-order risk: proposal/link locks are held before the source resource lock. Publication helper correctly locks the resource before content rows, but the caller's prefix must be redesigned as a whole. |
| Add remark to proposal | Proposal row `pessimistic_write`; membership re-read; comment/event writes. | Does not lock project row; a membership revocation is not serialized by the same project lock. |
| Decide individual remark | Must be reviewed alongside the remaining controller method and its comment/proposal row locks before protocol adoption. | Do not assume it shares the parent proposal's lock order without checking its full transaction. |

#### Required correction before composing governance transactions

- Do not simply add a project-row lock at the beginning of these existing
  transactions: that would put the project lock ahead of the source resource
  lock in create/publish paths and violate the resource-before-project order.
- Establish the complete ordered lock set from the request's immutable
  identifiers before entering the transaction: relevant source/target
  resources and parent resources first, then project rows, then content,
  proposal and comment rows in a documented stable order.
- Re-read the proposal, link, membership, validator, source publication and
  target draft only after the required locks are held; verify that the locked
  records still match the pre-transaction identifiers.
- Review all proposal transitions (create/reuse, submit, decision, publish,
  add remark, decide remark) as one coordinated change. A partial conversion
  can introduce a deadlock or leave an authorization race.
- The publication helper's existing resource/content locks remain mandatory.
  A cross-context caller may pass an already-locked resource only when that
  exact row was acquired through the same transaction manager and in the
  global order.
- Include two-connection PostgreSQL tests for proposal creation vs unlink,
  proposal publish vs unlink/resource deletion, membership revocation vs
  remark insertion, and competing proposal/transfer confirmation.

This audit identifies a concrete lock-order conflict, not merely missing locks.
The shared coordinator design must resolve it before implementation. No
proposal workflow or content publication code was changed.


#### Clarification — individual remark decisions

The full `decideProposalComment` transaction was inspected after the table
above was written. It locks the proposal row first, then the project-process
link, re-reads membership, and finally locks the individual comment row.
Therefore it has the same proposal-before-link prefix and also needs to be
included in the ordered transition redesign. The pre-transaction membership
and role checks are only early rejection; the transaction does re-read
membership, but does not serialize against membership changes with the project
row lock.

The validator resolution helper also reads the project default validator and
membership through the transaction manager, but currently without a project
row lock. The future coordinator must lock the project before resolving or
confirming validator identity and must keep the project default, membership,
active account, and proposal assignment mutually consistent.


### Proposed global lock protocol — design baseline, not yet implemented (2026-11-08)

This section turns the inventory into a candidate protocol for review. It is
not permission to change writers. The protocol must first be checked against
all database constraints, foreign keys, cascade behavior, repository methods,
and every transaction that can touch the same rows.

#### A. Canonical lock classes and order

For a transaction that spans more than one class, acquire locks in this order:

1. **Resource hierarchy rows**: all known affected resource rows, including
   source/target resources and relevant parent rows. Sort by immutable UUID
   ascending; acquire each row lock in that order. If ancestors must be
   discovered, read candidate IDs first, then lock the ordered set and
   revalidate parent relationships. If the set changed, abort and retry from
   a fresh snapshot; do not acquire a newly discovered lower-order resource
   after later classes have been locked.
2. **Project rows**: all affected project rows, UUID ascending, with
   `pessimistic_write`. Re-read project existence, membership, default
   validator and project-level policy only after these locks.
3. **Project-process link rows**: exact `(projectId, resourceId)` pairs in
   lexicographic UUID tuple order. Re-read existence and usage after project
   locks. Link attach/unlink and variant creation must use this same order.
4. **Governance rows**: actor registry rows, RACI assignment rows, proposal
   rows, proposal comment rows and governance event rows. Within each table,
   acquire exact rows in stable primary-key order. For absent rows, row locks
   do not serialize competing inserts: rely on a database unique constraint
   plus conflict handling, or lock the owning project before checking and
   inserting.
5. **Content rows**: draft, current published and version rows, in the
   exact deterministic order established by the ResourceContext publication
   contract. The publication helper currently locks the resource, draft,
   previous published row and latest version in that order. Any caller that
   composes it must already own the resource lock through the same
   EntityManager and must not have acquired a later class first.
6. **Writes and audit**: perform mutations only after all relevant locks and
   revalidation have succeeded. Keep state changes, audit events and
   publication/proposal transitions in the same transaction.

The ordering above is a proposed cross-context hierarchy, not a claim that
all current handlers comply. In particular, the current publication helper's
resource/content sequence must be retained and explicitly composed with the
governance sequence. If a transaction needs a row not included in its initial
lock set, it must abort and restart with the expanded sorted set rather than
acquiring it out of order.

#### B. Lock-set discovery and stale-set handling

- A preliminary read may discover candidate resource IDs, parent IDs, project
  IDs and link pairs. It is discovery only and grants no authority.
- Start the transaction, lock the complete discovered resource set in sorted
  order, then project rows, then link rows. Re-read the relationships through
  the same manager.
- If a parent, project link, source publication, proposal source or target
  identity differs from the discovery snapshot, abort with a retryable
  conflict. Do not append an out-of-order lock.
- For operations with a user preview (such as variant matrix transfer), also
  compare the stored preview fingerprints and exact content IDs/versions after
  acquiring locks. A lock does not make an old preview current.
- Authorization is re-evaluated under the locks: authenticated account active
  state, organization-admin status where applicable, current project
  membership/role, `canSubmitRemarks`, process usage, configured validator
  and target draft eligibility. Pre-transaction checks may reject early but
  cannot authorize the write.
- All reads and writes in the critical section use the transaction's
  `EntityManager`. Injected global repositories must not be used for
  authorization or state used to decide a mutation after transaction start.

#### C. Operation classes and required serialization

| Operation class | Minimum rows in the canonical lock set | Required invariant |
|---|---|---|
| Actor create / import / rename / activate / deactivate | Project; relevant actor rows; relevant assignment rows | Actor uniqueness, active state and every affected assignment label are serialized with all other project RACI writers. |
| RACI matrix replace | Project; exact project-process links for all submitted and currently affected resource IDs; actor rows; assignment rows | Reconcile only the intended resource scope. A process-scoped operation must never delete the entire project's matrix. |
| Variant creation | Source and target/parent resource rows; project; exact source/target project-process links; source published content | Source publication, parent hierarchy, project link and new variant draft are created atomically. New variant matrix remains empty by default. |
| Explicit variant matrix transfer | Source and target resource rows; project; both exact project-process links; source and target draft/content rows; actor registry and assignment rows | Revalidate source fingerprint, exact target draft, stable BPMN IDs, active registered actors, authorization and unresolved rows; write only target assignments and audit. |
| Attach / unlink process | Resource and relevant parent rows; project; exact link row (or unique-key insert) | Link operations serialize with project deletion, resource deletion, proposal actions and RACI preview/confirm. |
| Project membership / default validator | Project; membership rows; project row already serializes current membership path | Role, remark permission, default validator and active account checks cannot race governed operations. |
| Resource create / clone / delete / reparent | Parent/source/target resource rows; affected projects and links when resource is linked or deletion constraints require them | No child may appear during a protected recursive delete; no linked resource may disappear while a project operation relies on it. |
| Proposal create / submit / decide / publish / remark add / remark decide | Source/workspace/parent resource rows; project; link; proposal; comment; content rows as applicable | All proposal transitions share one lock order and preserve existing state-machine, validator, pending-remark and publication guards. |

#### D. Specific migration of proposal workflows

The current proposal controller cannot be fixed by adding a project lock
inside its existing transactions. Its current order includes proposal or
project-process locks before the source resource lock. The proposed migration
is:

1. Resolve immutable candidate identifiers (source resource, workspace
   resource if already known, source parent, project, proposal and comment).
2. Begin transaction and lock the complete resource set first, including
   source and workspace resources where present, in UUID order.
3. Lock the project row; re-read membership, role, validator/default and
   process policy.
4. Lock/re-read the exact project-process link.
5. Lock proposal row, then comment rows, in stable ID order.
6. Lock content rows through the existing ResourceContext publication
   contract; for publication, pass an already locked source resource only
   after proving it was locked by this transaction and in step 2.
7. Revalidate proposal status, source published content ID, submitted draft
   ID/status, pending remarks and validator decision; then write proposal,
   content, event and audit state atomically.

For proposal creation, the workspace resource does not yet exist at step 2.
Its parent and source are locked first; workspace insertion then occurs under
the already locked parent. The new workspace row is owned by the transaction
and must not be re-locked out of order. A generated workspace ID must not
cause acquisition of a resource lock after project/governance locks; the
new row is not concurrently visible before commit, and its writes remain
inside the transaction.

This migration must be applied consistently to every proposal transition.
The current proposal row lock remains necessary for state-machine serialization;
it simply moves later in the global order.

#### E. Transaction ownership and API boundaries

- ProjectContext should own a narrow application-level coordinator for
  project-row locks, membership/policy revalidation and exact project-process
  link operations. It may accept an `EntityManager` supplied by the outer
  transaction; it must not start a nested independent transaction.
- ResourceContext should own a corresponding narrow resource-hierarchy and
  content-publication contract. It must provide manager-aware operations for
  locking parent/source rows and creating/deleting/reparenting resources.
- The app composition root may compose these contracts. Neither context may
  import the other's repositories, entities or controllers.
- Do not export generic repositories or `EntityManager`-level escape hatches
  as public cross-context APIs. Expose named operations with explicit
  invariants and typed inputs/results.
- A transaction has one owner. Helpers participate in the supplied manager
  and never commit independently.
- Keep the current content publication helper as the sole publication
  primitive until an equivalent or safer contract is implemented and tested.

#### F. Database and test prerequisites

Before implementation, verify:
- PostgreSQL isolation level used by TypeORM transactions and the behavior of
  `pessimistic_write` / `pessimistic_read` for the deployed PostgreSQL
  version.
- Unique constraints for actor normalized names, project-process links,
  resource sibling names, content version/status and RACI matrix cells.
- Foreign keys and cascade behavior for deleting projects/resources with
  memberships, links, contents, proposals, actors and assignments.
- Whether every path that changes parent IDs, resource links or project
  membership can be forced through the owning coordinator.
- Whether a database constraint or trigger is needed for invariants that
  cannot be guaranteed by application locks alone.

Required PostgreSQL integration tests use two independent connections and
explicit barriers (not timing sleeps): actor create vs rename; actor deactivate
vs RACI replace; RACI replace vs unlink; attach vs project delete; child create
vs recursive delete; variant create vs source publish/unlink; proposal create
vs unlink; proposal publish vs source publication/resource delete; membership
revocation vs remark add/decision; and two confirmations from the same stale
variant-transfer preview. Assert both final rows and absence of deadlocks,
partial audit, orphan workspace resources and duplicate matrix cells.

No schema, lock helper, service, endpoint, writer or test has been changed as
part of this design note. This protocol remains a candidate until the
remaining resource and project mutation paths and database constraints have
been checked against it.
