# V2.0alpha validation runbook

## Safety and scope

- Validate the V2.0alpha branch only. Keep main and production unchanged.
- Never run migrations or destructive tests against production.
- Use a dedicated test database and a test user with disposable project/process data.
- Record the tested commit SHA with every validation report.
- A check is PASS only when the command or scenario was actually executed and its result inspected.

## 1. Initial repository audit

From the repository root:

~~~bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
~~~

Confirm that the working tree changes are understood before running commands. Do not discard local or untracked files as part of validation.

## 2. Toolchain

The frontend and backend declare Node.js >=24 and pnpm 11.1.3. Install or activate those versions before relying on local results.

~~~bash
node --version
pnpm --version
~~~

The frontend and backend have separate lockfiles and dependency installations.

## 3. Frontend static checks and build

~~~bash
cd frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm build
~~~

The build includes TypeScript compilation. Resolve the first actionable error, rerun the failed command, and then rerun both lint and build after the final frontend change.

## 4. Backend static checks, build and unit tests

~~~bash
cd backend
pnpm install --frozen-lockfile
pnpm exec eslint "{src,apps,libs,tests}/**/*.{ts,js}"
pnpm build
pnpm exec jest --config ./tests/jest-unit.json --runInBand
~~~

The project validation workflow uses the same Node/pnpm versions and runs frontend lint/build plus backend lint/build/unit tests. Inspect the CI run for the exact commit; a missing status or workflow run is not a passing result.

## 5. Database migration rehearsal

Use a disposable PostgreSQL database, never production. Inspect the existing schema first.

For a fresh database, after the repository's baseline init.sql has run, apply these migrations in order:

1. backend/migrations/20261011_v2_project_context.sql
2. backend/migrations/20261011_v2_project_raci.sql
3. backend/migrations/20261012_v2_project_raci_actors.sql

Important: 20261011_projects_shared_processes.sql is an older alternative migration that creates overlapping project tables and enum types. Do not blindly apply both project-context migrations to a fresh database. For an existing database, inspect which migration/schema is already present and review the resulting constraints before applying anything.

After migration, verify:
- project, membership, project-process, RACI-entry and RACI-actor tables exist;
- unique constraints and foreign keys exist;
- legacy RACI entries have corresponding actor-register rows;
- rerunning the actor migration does not create duplicate actors;
- inactive actors stay inactive after BPMN actor synchronization;
- rollback/recovery is documented before any non-disposable environment is touched.

No database migration has been applied by this runbook.

## 6. Functional scenarios

Run against a dedicated test instance with seeded disposable data.

### Project boundaries and permissions
- User outside a restricted project cannot read its process, content or comments.
- Viewer can read but cannot edit process content, RACI assignments or actors.
- Modeler can edit linked project-specific processes and RACI/actors.
- Admin can manage membership; the last project admin cannot be removed or demoted.
- A shared common process remains readable from the catalogue and is read-only through generic process-edit endpoints.
- A process linked to multiple restricted projects is editable only when the user has edit rights in every linked project.

### Process catalogue
- Link a common process to two projects without duplicating its resource.
- Create a variant from a published source and verify it is an independent draft.
- Verify unlink/delete constraints and source-variant restrictions.

### RACI actor register and matrix
- Load activities from the latest published version of every linked process.
- Add an actor manually; reload and verify persistence.
- Synchronize BPMN actors; verify only new actors are inserted.
- Rename an actor and verify existing assignments follow the new name.
- Deactivate an actor and verify it disappears from active matrix columns without deleting historic assignments.
- Synchronize again and verify the deactivated actor is not silently reactivated.
- Assign and clear R/A/C/I cells; reload and verify persisted values.
- Reject duplicate normalized actor names, unregistered actors, invalid roles and assignments to processes not linked to the project.

### BPMN navigation and selection
- Click an activity in the project RACI summary.
- Verify the correct process opens and the URL carries the target activity ID.
- Verify the matching activity is highlighted and brought into view.
- Repeat for an activity in the currently open process and for a different process.

### Browser automation
The repository currently does not declare a frontend Playwright test script. Before claiming end-to-end coverage, confirm that a Playwright MCP or Playwright test runner is installed and reachable, that a non-production app URL is available, and that authentication/test data are prepared. A configured MCP entry alone is not proof that a browser session works.

## 7. Reporting format

For every check, report one of:

- PASS — executed and result matched the expected behavior.
- FAIL — executed and result did not match the expected behavior.
- BLOCKED — could not execute because a dependency/environment/access was unavailable.
- NOT TESTED — no execution was attempted.

Include the commit SHA, exact commands, concise output/error evidence, fixes and regression reruns. Report technical validation separately from functional validation. Do not deploy to production as part of this process.
