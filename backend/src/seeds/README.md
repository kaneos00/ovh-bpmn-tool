# Pizza Store demo seed

This fixture creates a complete, reviewable Pizza Store demonstration in a dedicated **test database**. It does not run during application startup or deployment.

## Safety model

The command refuses to run unless all of these checks pass:

- `PIZZA_DEMO_SEED_TARGET=test`;
- `PIZZA_DEMO_SEED_CONFIRM=CREATE_PIZZA_STORE_DEMO`;
- `DATABASE_NAME` exactly matches `PIZZA_DEMO_SEED_EXPECTED_DATABASE`;
- the database name contains `test`;
- the connected database reports the same database name;
- `PIZZA_DEMO_SEED_USER_ID` identifies an active row in `app_users`.

The seed uses one TypeORM transaction. It is idempotent: matching records are reused; conflicting records are not overwritten and cause the transaction to fail. It never deletes existing records. The BPMN is stored as a published project-specific process and the source fixture is not modified.

## GitHub Actions prerequisites

The manual workflow is `.github/workflows/seed-pizza-demo.yml`. It requires a GitHub Actions self-hosted runner with all labels:

`self-hosted`, `linux`, `x64`, `coolify-test`.

Install/register that runner only on the test host or on a host with private network access to the test PostgreSQL instance. Do not use a production runner. The runner needs Node.js 24 and outbound access to the package registry.

Create a GitHub Actions environment named `test` and add these environment secrets:

| Secret | Purpose |
| --- | --- |
| `DATABASE_HOST` | Test PostgreSQL hostname reachable from the runner |
| `DATABASE_PORT` | Test PostgreSQL port |
| `DATABASE_USER` | Restricted test database user |
| `DATABASE_PASSWORD` | Password for that user |
| `DATABASE_NAME` | Exact test database name |
| `DATABASE_SSL` | Existing application setting (`off`, `required`, or `strict`) |
| `PIZZA_DEMO_SEED_EXPECTED_DATABASE` | Must exactly equal `DATABASE_NAME` |
| `PIZZA_DEMO_SEED_USER_ID` | Existing active `app_users.username` used for audit fields and project administration |

The database user should have only the permissions needed to insert and read the application's project, resource, content, job architecture and RACI tables.

## Execution

After the workflow file is present on the repository's default branch and the runner/environment are configured:

1. Open **Actions → Seed Pizza Store demo (test only)**.
2. Select the feature branch containing this seed.
3. Check the confirmation box and run the workflow.
4. Review the job summary and logs before opening the project in the application.

The workflow is manual only. It does not deploy, publish a new application version, or run automatically on pushes.

## Dataset

- Two BPMN pools from the original Pizza Store fixture: customer (external) and vendor (internal).
- Three internal positions: Responsable de comptoir, Pizzaïolo, Livreur.
- Three reference job functions.
- Four competency blocks and twelve competencies.
- Position/block applicability, competency-level overrides and inherited reference levels.
- Three registered RACI actors, twelve RACI assignments and four BPMN activity mappings.
- Customer-pool tasks remain external and are deliberately not assigned to internal positions.
