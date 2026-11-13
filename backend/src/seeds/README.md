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

## Run from Coolify (recommended for a test deployment)

The backend runtime image compiles the seed and includes its BPMN fixture. No `pnpm`, `ts-node`, or development dependencies are needed in the running container.

1. In the **test Coolify application only**, select branch `feat/pizza-store-demo-seed` and redeploy the backend image from that branch.
2. In the backend service environment variables, set:
   - `PIZZA_DEMO_SEED_TARGET=test`
   - `PIZZA_DEMO_SEED_CONFIRM=CREATE_PIZZA_STORE_DEMO`
   - `PIZZA_DEMO_SEED_EXPECTED_DATABASE` to the exact value of `DATABASE_NAME`
   - `PIZZA_DEMO_SEED_USER_ID` to the username of an existing active application user
3. Confirm that `DATABASE_NAME` is the dedicated test database and contains the word `test`. Do not proceed if it is a production database or if its purpose is unclear.
4. Open the backend container terminal in Coolify, in `/app`, and run:

   ```sh
   npm run seed:pizza-demo
   ```

5. Review the output. The seed runs in a single transaction and aborts on a configuration mismatch, an inactive seed user, or conflicting existing demo records.

The command is available in the runtime image as `node dist/seeds/pizza-store-demo.seed.js`. The seed is never run automatically at container startup or during deployment.

## GitHub Actions alternative

The manual workflow is `.github/workflows/seed-pizza-demo.yml`. It requires a GitHub Actions self-hosted runner with all labels:

`self-hosted`, `linux`, `x64`, `coolify-test`.

This route also requires a GitHub Actions environment named `test` with database connection secrets and `PIZZA_DEMO_SEED_USER_ID`. It is not available until that runner and environment are configured.

## Dataset

- Two BPMN pools from the original Pizza Store fixture: customer (external) and vendor (internal).
- Three internal positions: Responsable de comptoir, Pizzaïolo, Livreur.
- Three reference job functions.
- Four competency blocks and twelve competencies.
- Position/block applicability, competency-level overrides and inherited reference levels.
- Three registered RACI actors, twelve RACI assignments and four BPMN activity mappings.
- Customer-pool tasks remain external and are deliberately not assigned to internal positions.
