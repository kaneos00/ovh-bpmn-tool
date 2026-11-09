# RACI governance — writer inventory follow-up

- Date: 2026-11-09
- Branch: `feat/raci-governance-module-v3`
- Related ticket: #155
- Related notes: [transaction coordination ADR](./raci-governance-transaction-coordination.md), [concrete writer-path audit](./raci-governance-writer-path-audit.md)
- Status: additional source inspection; **not a closed repository-wide inventory**

## 1. Scope of this pass

A second source pass inspected the ProjectContext, ResourceContext and RaciGovernance TypeScript files present in the branch tree at commit `27139533145da15b3b7c1472874df66d4d049189`. It focused on persistence calls and command/repository boundaries. This is a static source review only: no database was queried, no tests were run, and no production behavior was exercised.

## 2. Additional concrete write paths

### Content lifecycle — ResourceContext

Source: `backend/src/modules/ResourceContext/infrastructure/repositories/typeorm/content.repository.ts`

- `save()` persists a content entity through the injected repository, without an explicit transaction context.
- `updateEditableFields()` performs a direct UPDATE. It constrains the resource/content pair and excludes submitted/terminal proposal snapshots, but is not a general draft-status/fingerprint guard and does not join a shared resource/project lock protocol.
- `delete()` performs a guarded direct DELETE for content referenced as submitted/approved/rejected/published proposal content. The predicate is useful, but it is not a transaction-scoped owner operation shared with resource deletion/publication.
- `publishAtomically()` opens its own DataSource transaction, locks the resource and delegates to the existing publication helper. This is the existing publication primitive to preserve; a future cross-context unit of work must allow it to participate without opening a nested independent transaction.

Command paths:
- `application/commands/Content/createContent/createContent.commandHandler.ts`: generic content creation delegates to repository save.
- `application/commands/Content/cloneContent/cloneContent.commandHandler.ts`: content clone delegates to repository save.
- `application/commands/Content/deleteContent/deleteContent.commandHandler.ts`: content deletion delegates to repository delete.
- `application/commands/Content/updateContent/udpateContent.commandHandler.ts`: editable update delegates to the direct UPDATE path.
- `infrastructure/controllers/content.controller.ts`: exposes the content lifecycle routes; route-level ACL/resource checks must be revalidated by the owner operation when a coordinated write is introduced.

**Implication:** a future governance draft update cannot call generic save/update and assume publication-safe semantics. It needs an exact draft/content identity, status and fingerprint check under the same transaction as the write. Generic content deletion and resource-tree deletion must also be coordinated against proposal references and publication.

### Comments — ResourceContext

Source: `backend/src/modules/ResourceContext/infrastructure/repositories/typeorm/comment.repository.ts`

- `save()` and `delete()` write comments through the generic repository, with no explicit transaction-scoped resource lock.
- The resource comment model is distinct from proposal review comments/events. Do not conflate these tables or silently move their ownership into RaciGovernance.
- Recursive resource deletion and comment creation/deletion need a defined policy for concurrent operations and FK/cascade behavior, confirmed against the live schema.

### Resource metadata — ResourceContext

Source: `backend/src/modules/ResourceContext/infrastructure/repositories/typeorm/resource.repository.ts` and `application/commands/Resource/updateResource/updateResource.commandHandler.ts`

- Resource save/update and recursive delete are repository operations outside a shared cross-context transaction contract.
- The update command currently handles resource metadata; no reparent operation was identified in the inspected handler.
- Parent/descendant locking remains an owner-module responsibility. Any future reparent operation must lock old/new parents in deterministic order.

### Proposal workspace creation — ProjectContext

Source: `backend/src/modules/ProjectContext/infrastructure/services/process-change-proposal-content.service.ts`

- Proposal workspace creation persists a resource and its initial content using repositories supplied by the caller.
- This helper therefore participates in the proposal lifecycle's transaction/lock requirements; it must not independently create a nested transaction.
- Its caller and the proposal transition must be reviewed together so resource, content, proposal and event writes remain atomic.

## 3. Consolidated write-path groups to include in the coordinator adoption matrix

| Owner | Write family | Current observation | Required treatment |
|---|---|---|---|
| ProjectContext | Actor registry and RACI entries | Existing controller writes; full-project replacement differs from process-scoped scope | One project serialization path; keep full-project and process-scoped operations distinct |
| ProjectContext | Project, membership, default validator | Several direct saves/deletes; membership change already locks project | Preserve last-admin invariant; revalidate membership and default-validator authority under transaction |
| ProjectContext | Project/process links | Attach/unlink and variant creation use different transaction/lock behavior | Resource-first then project/link protocol; exact link recheck |
| ProjectContext | Proposal, events, proposal remarks | Several independently transactional transitions with different lock prefixes | Map and refactor the entire lifecycle as one protocol; preserve state machine and publication helper |
| ProjectContext + ResourceContext | Proposal workspace resource/content | Resource/content creation is part of proposal transaction | Named ResourceContext owner operation using caller's transaction context |
| ResourceContext | Resource create/clone/update/delete | Generic command/repository writes; clone resource/content currently separate | Parent/descendant locks; atomic clone; stable-tree deletion |
| ResourceContext | Content create/clone/update/delete/publish | Generic save/update/delete plus a separate atomic publication path | Exact draft guards and transaction participation; preserve one publication primitive |
| ResourceContext | Resource comments | Generic save/delete | Define deletion/concurrency behavior without confusing them with proposal comments |

## 4. Remaining inventory gaps — do not mark the audit closed

The inspected tree is limited to the three modules and does not establish that all write paths in the repository have been found. Before implementation, still search and classify:

1. Every direct SQL/TypeORM write to `project_processes`, `project_raci_entries`, `project_raci_actors`, `resources.parentId` and `contents` outside these module paths.
2. Seed, import, bootstrap, maintenance, administrative and test-support scripts that can write those tables.
3. Every resource child-creation path, including generic clone, project variant and proposal workspace.
4. Every content status/version writer and every call site of `publishDraftContentWithinTransaction`.
5. Every recursive-delete/cascade path and every FK action in each deployed database.
6. Every proposal transition and its exact lock acquisition order, including the helper's resource/content locks.

The GitHub branch tree at the inspected commit is not evidence of the schema in a deployed database. The five result sets from `backend/migrations/raci-governance-read-only-preflight.sql` remain a hard gate.

## 5. Decision

No runtime implementation is authorized by this follow-up. Do not add a generic repository/EntityManager escape hatch, writer, migration, endpoint, job, XML writer or UI. The next valid step is to finish the repository-wide write search and obtain the target database preflight; only then can the lock graph be approved and the coordination-only implementation scoped safely.
