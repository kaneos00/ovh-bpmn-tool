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
