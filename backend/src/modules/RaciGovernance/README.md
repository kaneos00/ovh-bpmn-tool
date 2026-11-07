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
