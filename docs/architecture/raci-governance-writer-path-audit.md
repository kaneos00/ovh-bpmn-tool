# RACI governance — concrete writer-path audit

- Date: 2026-11-08
- Branch: `feat/raci-governance-module-v3`
- Related ADR: [transaction coordination](./raci-governance-transaction-coordination.md)
- Status: source audit; no runtime changes

This note records concrete controller/handler behavior observed in the current
branch. It supplements the conceptual writer inventory in the ADR. It is not
a live-schema assessment and does not approve implementation.

## 1. ProjectRaciController

Source: `backend/src/modules/ProjectContext/infrastructure/controllers/project-raci.controller.ts`

| Operation | Observed sequence | Concrete consequence |
|---|---|---|
| `PUT /projects/:projectId/raci` | Role check; validate body; read actor registry and project-process links using injected repositories; then transactionally delete every `project_raci_entries` row for the project and insert submitted rows | Validation can become stale before transaction. The transaction is atomic but project-wide. It is not safe as a process-scoped writer and can race actor/link mutations. |
| `POST .../actors` | Role check; injected-repository duplicate read; injected-repository save | No shared transaction/project lock. Unique violation is mapped to conflict, but that does not serialize dependent assignment checks. |
| `POST .../actors/sync` | Role check; read actor registry; compute additions; transaction insert with `orIgnore`; read registry again | Pre-read can be stale; concurrent additions are silently ignored by the insert conflict policy. No project lock or explicit conflict report. |
| `PUT .../actors/:actorId` | Role check outside transaction; transaction reads actor/duplicate and rewrites assignment labels, then saves actor | Atomic rename, but no project coordination lock and no transaction-scoped membership revalidation. Its collision query uses `lower(btrim())`, not the governance normalizer. |
| `PATCH .../actors/:actorId` | Role check; read actor and save active flag through injected repository | No transaction, project lock or dependent assignment policy check. |

### Required preservation

- Keep the existing public endpoint semantics while routing writes through a
  ProjectContext-owned coordinator.
- Preserve the distinction between project-wide actor registry and
  process-scoped assignment rows.
- Do not silently retain `orIgnore` behavior if it hides a meaningful
  conflicting actor identity; define explicit, reviewable sync diagnostics.
- Any normalization change requires collision inventory and human resolution;
  no automatic actor merge.

## 2. ProjectController

Source: `backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts`

| Operation | Observed sequence | Concrete consequence |
|---|---|---|
| `POST /projects` | Save project, then save initial Admin membership; on membership failure, best-effort project delete | Project and its required initial admin are not one atomic transaction. |
| Organization project metadata update | Read project, mutate fields, save via injected repository | No transaction/project coordination lock. |
| Organization project deletion | Read project; count links; delete project | Link count can race a concurrent attach. |
| Project metadata/default-validator update | Role check and project read; default-validator membership/account checks use injected repositories/query; save project | Membership/account validation can become stale before save; does not share the membership-change lock. |
| Project deletion | Role check; count links; delete project | Link count can race attach/variant/proposal link creation. |
| Process attach | Role/visibility checks; read resource; save project-process link | No resource-parent or project coordination lock. |
| Variant creation | Role/visibility checks; transaction reads source published content, inserts variant resource, first draft and project link | Transaction is atomic for these three writes, but does not lock source resource, parent or project before checking source/link policy. The new matrix is not copied, consistent with empty-matrix policy. |
| Process unlink | Role check; read exact link; count links to resource; delete exact link | Checks and delete are outside a transaction. Database FK may cascade RACI rows; final-link check can race another link change. |
| Membership change | Transaction locks project row with `pessimistic_write`, then re-reads and changes membership | Existing useful project-only serialization pattern. It must be reconciled with resource-first ordering for operations that also need resource locks. |

### Required preservation

- Membership change's last-admin and role invariants must survive refactoring.
- Project-only changes may lock project rows, but must not request resource
  locks after doing so.
- Attach/unlink and variant creation need resource-first then project
  coordination and exact link revalidation.
- Project deletion must validate final link count under its project lock.
- Default-validator validation must be repeated under the same transaction as
  the write and serialized against membership changes.

## 3. ResourceController and command handlers

Sources:
- `backend/src/modules/ResourceContext/infrastructure/controllers/resource.controller.ts`
- `backend/src/modules/ResourceContext/application/commands/Resource/createResource/createResource.commandHandler.ts`
- `backend/src/modules/ResourceContext/application/commands/Resource/deleteResource/deleteResource.commandHandler.ts`

| Operation | Observed sequence | Concrete consequence |
|---|---|---|
| `POST /resources` | Command handler reads parent, reads siblings, checks name, then calls repository save | No transaction or parent-row lock. A concurrent child insertion can race recursive ancestor deletion and sibling uniqueness checks. |
| `POST /resources/:id/clone` | Reads source and content; creates clone resource through command handler; creates first content in a separate command; on content failure, best-effort deletes clone | Resource and content are not atomic. A failure/cleanup race can leave inconsistent state; source and parent are not locked as a coordinated set. |
| `DELETE /resources/:id` | Controller calls delete policy precheck, then generic delete command handler; handler calls repository delete | Policy and recursive delete are separate. The generic handler has no transaction context and cannot coordinate linked projects, descendant creation or proposal references. |
| Resource update | ACL check then update command | Current command changes name/description; no reparent operation observed. Any future reparent must lock old/new parents in sorted order. |

### Required preservation

- ResourceContext must own parent/descendant locking and all child creation
  paths, including ordinary create, clone, project variant and proposal
  workspace.
- Clone resource + initial content should be made atomic in ResourceContext
  before it can participate safely in higher-level workflows.
- Recursive deletion must use a manager-aware owner operation, stabilize the
  tree, inspect exact linked projects and proposal/content references, and
  revalidate policy under locks.
- Do not infer actual cascade behavior from this source audit; run the
  read-only live PostgreSQL preflight for every target environment.

## 4. Proposal workflow implications

Source:
`backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts`

The controller contains its own transactions for proposal creation, submit,
decision, publish, comments and remark decisions. The source audit shows
different lock acquisition prefixes across transitions: proposal-first in
some paths, link/resource-first in others, and publication delegates to the
ResourceContext content helper.

This confirms that the proposal lifecycle cannot be repaired by adding a
project lock to one endpoint. It needs a coordinated lifecycle migration
preserving:
- proposal state transitions and terminal states;
- validator identity and current membership;
- pending remark rules;
- exact source published-content identity;
- draft identity/status and optimistic source-version checks;
- event/comment/audit atomicity;
- existing publication helper as the sole publication primitive.

The ADR's resource → project → link → proposal/comment → content order remains
a candidate only. Each transition must be mapped individually before any
change, and a lock graph must be checked for cycles against the exact
publication helper order.

## 5. Newly explicit implementation blockers

1. Resource clone is a non-atomic two-command workflow with best-effort
   cleanup. It should be made atomic inside ResourceContext, independently of
   RACI governance.
2. Project creation is a two-save workflow with compensation; its initial
   administrator membership is a required invariant and should be committed
   atomically.
3. Actor activation is a direct injected-repository write; it must join the
   same project serialization as actor create/sync/rename and matrix writes.
4. Full-project matrix replacement performs actor and link validation before
   its transaction and deletes the complete project matrix. It needs a
   separate process-scoped contract, not a parameterized reuse of the current
   delete-all operation.
5. Unlink's last-project check and deletion are separate; its database cascade
   effects on RACI rows must be explicitly handled after live FK preflight.
6. Resource deletion policy precheck and recursive deletion are separate;
   generic command handler cannot currently participate in cross-context
   locks or revalidation.

## 6. Scope and next gate

This note is documentation only. It does not change controller behavior,
repository contracts, migrations, schema, XML, endpoints or UI. No tests were
executed locally and no live database was queried.

Next, close the remaining source inventory around all direct writes to
`project_processes`, `resources.parentId`, `project_raci_entries` and
`project_raci_actors`, including seed/import/maintenance paths. Then obtain
the five live PostgreSQL preflight result sets and review the proposed lock
graph. Only then should a coordination-only implementation be considered.
