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
