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

This is fixture-derived evidence and a test contract only. No parser has been
approved, no XML writer has been implemented, and no production BPMN content
has been changed.


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
