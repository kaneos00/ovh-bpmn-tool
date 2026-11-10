const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.BPMN_E2E_BASE_URL || 'http://127.0.0.1:18080';
const username = process.env.DEMO_AUTH_USER || 'demo-v2';
const password = process.env.DEMO_AUTH_PASSWORD;
const projectId = '10000000-0000-4000-8000-000000000001';
const sourceResourceId = '20000000-0000-4000-8000-000000000002';

async function main() {
  assert.ok(password, 'DEMO_AUTH_PASSWORD is required for the browser workflow');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`${baseUrl}/login?next=%2Fmes-demandes`);
    await page.locator('input[autocomplete="username"]').fill(username);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/mes-demandes');

    // Create an isolated proposal through the same authenticated API used by
    // the Viewer. The database and demo account are recreated for every CI run.
    const created = await page.evaluate(async ({ projectId, sourceResourceId }) => {
      const response = await fetch(
        `/bpmn-api/projects/${projectId}/processes/${sourceResourceId}/change-proposals`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            elementId: 'Task_ProcessRequest',
            comment: 'CI E2E — vérifier la qualification de la demande',
          }),
        },
      );
      const body = await response.json();
      return { status: response.status, body };
    }, { projectId, sourceResourceId });

    assert.equal(created.status, 201, `Proposal creation failed: ${JSON.stringify(created.body)}`);
    assert.ok(created.body.id, 'The API did not return a proposal id');

    await page.getByText('Traiter une demande', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Traiter dans le modeleur' }).click();
    await page.waitForURL(/reviewRemarks=1/);
    await page.waitForURL(/contentId=/);
    await page.getByText('Remarques BPMN', { exact: true }).waitFor();
    await page.getByText('CI E2E — vérifier la qualification de la demande', { exact: true }).waitFor();

    // Validator asks for clarification; the author responds; only then can the
    // validator make the individual remark decision.
    await page.getByPlaceholder('Demander une précision à l’auteur…').fill(
      'Pouvez-vous préciser le critère de qualification ?',
    );
    await page.getByRole('button', { name: 'Demander une précision' }).click();
    await page.getByText('En attente de la réponse de l’auteur avant la décision finale.').waitFor();

    await page.getByPlaceholder('Votre réponse à la demande de précision…').fill(
      'Le critère est la complétude des informations obligatoires.',
    );
    await page.getByRole('button', { name: 'Répondre à la précision' }).click();
    await page.getByText('Réponse de l’auteur', { exact: true }).waitFor();

    await page.getByRole('button', { name: 'Accepter', exact: true }).click();
    await page.getByText('Acceptée', { exact: true }).waitFor();

    // Validate the proposal, then publish exactly the approved frozen snapshot.
    await page.goto(`${baseUrl}/mes-demandes`);
    await page.getByText('Traiter une demande', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Approuver', exact: true }).click();
    await page.getByRole('button', { name: 'Publier la version approuvée' }).waitFor();
    await page.getByRole('button', { name: 'Publier la version approuvée' }).click();

    await page.getByText(
      'La contribution est approuvée et figée. Le diagramme est en lecture seule jusqu’à sa publication.',
    ).waitFor();
    await page.getByPlaceholder('Synthèse des modifications apportées…').fill(
      'Publication de validation du parcours E2E.',
    );
    await page.getByRole('button', { name: 'Publier la version approuvée' }).click();
    await page.waitForURL(`**/${sourceResourceId}`);

    const finalState = await page.evaluate(async () => {
      const response = await fetch('/bpmn-api/projects/me/process-change-proposals', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Proposal list returned HTTP ${response.status}`);
      return response.json();
    });
    assert.ok(
      finalState.some(proposal => proposal.id === created.body.id && proposal.status === 'published'),
      'The proposal did not reach the published state',
    );

    process.stdout.write('Browser E2E passed: login → Viewer remark → clarification → author response → remark decision → proposal approval → approved snapshot publication.\\n');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error}\\n`);
  process.exitCode = 1;
});
