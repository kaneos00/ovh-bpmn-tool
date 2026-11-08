# RACI governance — transaction coordination ADR

- Status: **proposed; not approved for runtime implementation**
- Date: 2026-11-08
- Scope: `feat/raci-governance-module-v3`, ticket #155
- Decision boundary: administration-only governance; no Viewer/Modeler behavior change

## 1. Context and decision drivers

The RACI governance capability must compare and, only after explicit human
approval, reconcile the existing project actor registry, process-scoped RACI
assignments and BPMN XML metadata. PostgreSQL remains the source of truth for
actors and assignments. BPMN XML remains an interoperability and portability
representation; it is not a second actor database.

The current code has useful read-only facades and a proven content-publication
transaction helper, but the mutation paths do not yet share a lock protocol.
The same TypeORM `DataSource` is used by ProjectContext and ResourceContext;
that makes a single database transaction technically possible, but does not
make independent service calls atomic or serialize legacy writers.

The following constraints are binding:

- No duplicate RACI tables, repositories, controllers, publication path or UI.
- No broad repository or generic `EntityManager` API exported between modules.
- No write, migration, XML writer, route, job or administration screen in this
  ADR.
- No dependency from ProjectContext or ResourceContext back to
  RaciGovernance.
- Existing proposal state-machine, validator, pending-remark and publication
  guards must remain authoritative.
- No merge or deployment is part of this work.

## 2. Decision proposed: one application-owned unit of work

A future cross-context confirmation must execute inside exactly one
application-owned PostgreSQL transaction.

The transaction boundary belongs to a small application infrastructure
contract composed at `BpmnToolAppModule`. The use case (eventually in
RaciGovernance) requests a unit of work; it does not create transactions in
individual ProjectContext or ResourceContext services.

Conceptual contract:

```ts
interface ApplicationUnitOfWork {
  run<T>(
    work: (transaction: TransactionContext) => Promise<T>,
  ): Promise<T>;
}

/** Opaque, transaction-scoped capability. Not a repository or manager API. */
interface TransactionContext {
  readonly transactionId: unique symbol;
}
```

This is illustrative TypeScript, not an implemented interface. The opaque
context must not expose TypeORM, repositories, query builders, commit or
rollback methods. It must be valid only during the callback and must not be
stored, returned, reused after completion or passed to background work.

The infrastructure implementation privately associates the context with the
single TypeORM `EntityManager`. Only owner-module adapters can resolve that
association through an internal infrastructure dependency. The resolver and
manager are not exported as application-facing APIs. An invalid, foreign or
expired context fails closed.

The unit-of-work implementation owns begin/commit/rollback. Owner-module
operations participate in the supplied context and never open nested
transactions or commit independently. Exceptions abort the entire unit.

### Why not pass EntityManager publicly?

Passing `EntityManager` through public facades would turn the module boundary
into a generic persistence escape hatch. It would let callers issue arbitrary
queries against tables they do not own and make transaction invariants
conventional rather than enforced. The opaque capability communicates only
that operations belong to the same transaction; named owner operations retain
control over persistence and invariants.

If a safe opaque-context implementation cannot be built without exporting
TypeORM primitives, stop and revisit the module boundary rather than
introducing generic repository access.

## 3. Ownership and proposed contracts

The contracts below are logical responsibilities, not approved signatures.
They must be implemented in the module that owns the underlying data.

### 3.1 ProjectContext owns project and RACI state

ProjectContext remains the sole owner of:

- project and membership records;
- project/process links and their usage;
- `project_raci_actors` (project-wide actor registry);
- `project_raci_entries` (project + process assignment rows);
- project role and membership policy, including remark permissions and
  default-validator membership checks.

A narrow transaction-aware application port should offer named operations,
not repositories:

| Named operation (conceptual) | Required invariant |
|---|---|
| `lockProjects(ids)` | Lock distinct project rows in ascending UUID order. |
| `revalidateOrganizationAdmin(context)` | Re-read trusted identity and organization-admin authority under the transaction; global RW or project Admin is insufficient. |
| `revalidateProjectMembership(projectId, policy)` | Re-read membership, role, account state and relevant permissions under the same transaction. |
| `readProjectProcessLink(projectId, resourceId, lock)` | Read the exact pair; reject absent or changed link/usage. |
| `readRaciRegistry(projectId)` | Return the project-wide actor register; never imply it is process-scoped. |
| `readRaciScope(projectId, resourceId)` | Return only assignments for that exact process plus the project-wide registry. |
| `replaceRaciScope(projectId, resourceId, expectedFingerprint, entries)` | Recheck fingerprint and active registered actors; delete/insert only this process's rows. |
| `replaceProjectRaciMatrix(...)` | Preserve the legacy full-project replacement as a separately named operation; never call it with a process subset. |
| `create/rename/activate/deactivate/syncActor(...)` | Serialize all registry mutations through the same project lock and validate dependent assignments/collisions. |
| `attach/unlinkProcess(...)` | Coordinate the resource and project locks, recheck exact link and destructive cascade effects. |

The existing `ProjectRaciApplicationService` is read-only. Its current
injected repositories are suitable for reads but must not be reused for a
coordinated write decision. Every write-side read and write must resolve
repositories from the transaction internally.

The actor registry is project-wide because `project_raci_actors` is keyed by
`projectId`. Assignment rows are process-scoped by `projectId` and
`resourceId`. Any port and tests must preserve this distinction.

### 3.2 ResourceContext owns resources and content

ResourceContext remains the sole owner of:

- resource hierarchy and parent/child integrity;
- resource create, clone, variant and recursive delete;
- content drafts, published/obsolete versions and content metadata;
- the existing `publishDraftContentWithinTransaction` primitive.

A narrow transaction-aware port should offer named operations:

| Named operation (conceptual) | Required invariant |
|---|---|
| `lockResourceSet(ids)` | Lock all known affected resource rows in ascending UUID order. |
| `lockAndStabilizeResourceTree(rootId)` | Lock root, enumerate descendants, lock newly found descendants in sorted order, and repeat until stable. |
| `lockParentForChildCreation(parentId)` | Every child creation path locks its parent before inserting a child. |
| `readContentSnapshot(resourceId, contentId)` | Exact resource/content pair; include status, version and XML fingerprint. |
| `createGovernanceDraft(...)` | Only through an explicitly approved, owner-controlled draft creation workflow; never clone by guessing semantics. |
| `updateGovernanceDraft(resourceId, contentId, expectedFingerprint, xml)` | Re-read and require exact draft identity/status/fingerprint under the transaction. |
| `publishGovernanceDraft(..., expectedPublishedContentId)` | Delegate to the existing publication helper with the same transaction; retain resource, draft, previous-publication and version checks. |
| `deleteResourceTree(...)` | Revalidate the stable tree, linked projects, proposal references and actual FK constraints before deletion. |

The existing `ResourceContentGovernanceService` is read-only and remains so
until the transaction and lock protocol is adopted. The generic editable
content update is not a draft guard and must not be used for this purpose.

### 3.3 RaciGovernance owns policy and orchestration, not persistence

RaciGovernance may own:

- XML read-only extraction and semantic comparison;
- actor matching and normalization proposals;
- deterministic preview/fingerprint construction;
- explicit human approval state and governance audit intent;
- orchestration of the owner-module contracts inside one unit of work.

It must not own TypeORM entities for existing project/resource tables, SQL
queries against their tables, content publication logic, membership
authorization logic or a second actor registry.

## 4. Candidate global lock order

The current source audit suggests this order, subject to live PostgreSQL
preflight and complete writer review:

1. **Resource hierarchy rows:** all affected source, target, parent and
   descendant resources, sorted by UUID.
2. **Project rows:** all affected projects, sorted by UUID.
3. **Project/process link rows:** exact `(projectId, resourceId)` pairs,
   lexicographically sorted.
4. **Governance rows:** actor registry, RACI entries, proposal, comment and
   event rows in a stable table/ID order.
5. **Content rows:** exact resource/draft/previous-published/version lock
   sequence required by the existing publication helper.
6. **Writes and audit:** only after all required locks and authorization
   revalidation succeed.

This is a candidate, not an approved global protocol. In particular, existing
proposal transitions currently acquire proposal/link/resource/content locks
in different orders. They must be refactored as a coordinated lifecycle, not
patched by adding a project lock at an arbitrary point.

### Mandatory ordering rules

- Never acquire a resource lock after acquiring a project lock.
- Sort every multi-resource and multi-project lock set by stable UUID.
- A project-only mutation may lock the project row, but must not later request
  a resource lock.
- A process/content reconciliation must lock resources first, then projects.
- A resource-tree delete must stabilize the descendant set before locking all
  linked projects; after project locks it must re-read the tree and links.
- A newly inserted child is protected by its already-locked parent; do not
  acquire a later resource lock after project/governance locks.
- If discovery reveals a new lock that belongs earlier in the order, abort and
  restart the transaction with the complete lock set. Do not acquire it late.
- All authorization, link, membership, validator and policy decisions used
  for a write must be re-read under the same transaction.

The lock order must be validated against PostgreSQL's actual isolation level,
constraints, indexes and FK actions for each deployed environment. ORM entity
definitions and fresh-demo bootstrap SQL do not establish the live schema of
an upgraded database.

## 5. Existing writers that must join the protocol

No governance writer can be enabled until every conflicting legacy writer
uses the same owner-module coordinator or is otherwise proven not to conflict.

| Existing path | Required change before governance writes |
|---|---|
| RACI actor create, sync, rename, active toggle | One transaction-aware ProjectContext path; project lock; recheck identity, role, collisions, actor and assignment references. |
| Full-project RACI replacement | Preserve public behavior; validate under project lock; coordinate against process-scoped replacement. |
| Process-scoped RACI replacement | New owner-module operation; exact resource filter; stale fingerprint checked under lock; no project-wide delete. |
| Process attach / unlink | Resource then project locks; exact link recheck; explicit handling of assignment cascade on unlink. |
| Membership change / default validator | Same project lock; recheck account and membership before changing authority or default validator. |
| Project metadata / project deletion | Lock project before checking links, membership invariants or deleting; avoid attach/delete races. |
| Variant creation | Lock source and parent resources, then project and source link; target matrix starts empty. |
| Proposal create / submit / decide / remark / publish | Refactor the entire lifecycle to the same lock order while preserving state machine, validator, pending-remark, source-version and audit checks. |
| Resource create / clone / variant child creation | Lock parent before inserting child. |
| Resource tree delete | Stabilize and lock descendants; identify/lock affected projects; revalidate proposal/content/FK references; delete in same transaction. |
| Resource reparent (if introduced) | Lock old and new parents in sorted order, then apply hierarchy validation and update atomically. |
| Content draft update / publication | Draft-only exact guard; use same transaction context and existing publication primitive. |

The inventory is not closed merely because the listed controllers have been
reviewed. A repository-wide search and integration test must establish that no
alternate command, import, maintenance task or cascade path can mutate the
same protected state without participating.

## 6. Preview and stale-state semantics

There is currently no monotonic revision column on `project_raci_entries`.
Do not invent a database revision or substitute a BPMN content version.

Until a deliberate schema decision is made, the preview may use a deterministic
state fingerprint. It is a precondition over the exact observed state, not a
revision number.

The canonical fingerprint input must be specified and versioned. At minimum:

- project ID and resource ID;
- actor normalizer algorithm/version;
- sorted actor registry fields that affect eligibility or identity;
- sorted assignment rows for the selected process, including stable BPMN
  element ID, actor label, role and any persisted field that affects behavior;
- exact target draft content ID, status, version and XML semantic fingerprint;
- expected currently published content ID;
- source snapshot fingerprint for any explicit variant transfer.

Canonicalization rules must define Unicode normalization, null/empty
treatment, sorting, duplicate handling, role representation and serialization.
Hashing an arbitrary JSON serialization without a canonical schema is not
sufficient.

At confirmation, the application must lock and re-read all relevant state,
recompute the fingerprint using the same algorithm version and reject stale
previews before the first write. A stale preview must produce no matrix,
content, audit or proposal mutation.

A fingerprint cannot solve a writer that does not honor the lock protocol.
Therefore fingerprint checks are necessary but not sufficient.

## 7. Variant matrix transfer remains a separate opt-in operation

The already approved variant policy remains unchanged:

- A new variant begins with an empty RACI matrix.
- The actor registry remains shared at project level.
- Transfer is optional, explicit and administrator-only.
- Preview is mandatory.
- Transfer never rewrites XML and never publishes content.
- Preview lists source and target process, source matrix snapshot/fingerprint,
  exact target draft content ID/version/XML fingerprint, proposed assignments
  by stable BPMN element ID and role, actor-registry validation, target BPMN
  element validation, duplicates and every unresolved row with its reason.
- Missing target element, inactive/unregistered actor or invalid role remains
  unresolved; name-only matching is insufficient.
- No row may be silently dropped.
- Confirmation revalidates source fingerprint, exact target draft, registry,
  membership and organization-admin authority inside one transaction.
- Stale preview is rejected without writes. Audit and idempotency are required.
- Source matrix and all XML content remain unchanged; only target assignment
  rows may be inserted.

This operation must not be combined with variant creation or XML harmonization.

## 8. Required PostgreSQL preflight and concurrency evidence

Before adopting the candidate lock order, run the committed read-only
preflight against each target database and review all five result sets:
PostgreSQL version/isolation, relation presence, FK actions, unique/index
definitions and triggers. The fresh Coolify demo bootstrap is not evidence
for a pre-existing production volume.

Required two-connection PostgreSQL tests must use explicit synchronization
barriers, not timing sleeps. They must cover at least:

- actor create vs rename; actor deactivate vs matrix replacement;
- full-project replacement vs process-scoped replacement;
- process-scoped replacement vs unlink;
- attach vs project deletion;
- child creation vs recursive ancestor deletion;
- variant creation vs source publish/unlink;
- proposal creation vs unlink/deletion;
- proposal publication vs source publication/resource deletion;
- membership revocation vs remark add/decision and governance confirmation;
- two confirmations from one stale preview;
- overlapping multi-resource/multi-project lock sets in opposite request order.

Assert final database rows, rollback of all related writes on failure, no
partial audit, no orphan workspace resources, no duplicate matrix cells and
absence of deadlocks. Include the actual deployed PostgreSQL version and
isolation mode in the test report.

## 9. Delivery sequence and stop conditions

1. Obtain and review the live schema preflight for the target environment.
2. Close the repository-wide writer inventory, including indirect cascades and
   all resource-parent creation paths.
3. Approve the global lock graph against actual constraints and proposal
   lifecycle ordering.
4. Implement the opaque application unit-of-work infrastructure and typed
   owner-module coordinator contracts only.
5. Migrate all existing conflicting writers without changing public endpoint
   semantics.
6. Add and pass PostgreSQL two-connection concurrency tests.
7. Add the transaction-aware process-scoped RACI operation and preview/confirm
   workflow.
8. Only after separate XML round-trip preservation tests, consider XML write
   capability. It remains a separate approval gate.

Stop and do not enable governance writes if:
- any target database has an unclassified schema;
- any competing writer cannot join the protocol;
- the lock graph contains an unresolved inversion;
- an owner operation needs a generic cross-module repository escape hatch;
- proposal state-machine guards cannot be preserved;
- a stale preview can write;
- any failure can leave a partial matrix/content/audit result.

## 10. Current implementation status

This ADR is a design artifact only. The current branch has read-only XML
extraction, pure consistency comparison, a ProjectContext read-only RACI
facade, a ResourceContext read-only content facade and the read-only SQL
preflight.

No opaque transaction context, lock coordinator, writer refactor, migration,
route, controller, UI, XML writer, job or governance mutation is implemented
by this document. No live database preflight has been run. No local test
execution is claimed. CI must be checked against the resulting commit.
