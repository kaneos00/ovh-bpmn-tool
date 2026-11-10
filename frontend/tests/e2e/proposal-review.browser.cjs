const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.BPMN_E2E_BASE_URL || 'http://127.0.0.1:18080';
const reviewerUsername = process.env.DEMO_AUTH_USER || 'demo-v2';
const reviewerPassword = process.env.DEMO_AUTH_PASSWORD;
const authorUsername = process.env.CI_READER_USERNAME || 'ci-reader';
const authorPassword = process.env.CI_READER_PASSWORD;
const projectId = '10000000-0000-4000-8000-000000000001';
const sourceResourceId = '20000000-0000-4000-8000-000000000002';

async function signIn(page, username, password) {
  await page.goto(`${baseUrl}/login?next=%2Fmes-demandes`);
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/mes-demandes');
}

async function main() {
  assert.ok(reviewerPassword, 'DEMO_AUTH_PASSWORD is required for the reviewer');
  assert.ok(authorPassword, 'CI_READER_PASSWORD is required for the remark author');

  const browser = await chromium.launch({ headless: true });
  const reviewerPage = await browser.newPage();
  const authorPage = await browser.newPage();
  reviewerPage.setDefaultTimeout(30000);
  authorPage.setDefaultTimeout(30000);

  try {
    // Separate authenticated browser contexts are intentional: a Viewer
    // submits the remark, while the global administrator reviews it.
    await signIn(authorPage, authorUsername, authorPassword);
    const created = await authorPage.evaluate(async ({ projectId, sourceResourceId }) => {
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
    assert.ok(created.body.cloneResourceId, 'The API did not return a proposal workspace');
    assert.ok(created.body.cloneContentId, 'The API did not return the proposal draft');

    await signIn(reviewerPage, reviewerUsername, reviewerPassword);
    await reviewerPage.getByText('Traiter une demande', { exact: true }).waitFor();
    await reviewerPage.getByRole('button', { name: 'Traiter dans le modeleur' }).click();
    await reviewerPage.waitForURL(/reviewRemarks=1/);
    await reviewerPage.waitForURL(/contentId=/);
    await reviewerPage.getByText('Remarques BPMN', { exact: true }).waitFor();
    await reviewerPage.getByText('CI E2E — vérifier la qualification de la demande', { exact: true }).waitFor();

    // The reviewer asks for clarification. The original author must answer
    // from their own authenticated session before the reviewer can decide.
    await reviewerPage.getByPlaceholder('Demander une précision à l’auteur…').fill(
      'Pouvez-vous préciser le critère de qualification ?',
    );
    await reviewerPage.getByRole('button', { name: 'Demander une précision' }).click();
    await reviewerPage.getByText('En attente de la réponse de l’auteur avant la décision finale.').waitFor();

    await authorPage.goto(
      `${baseUrl}/${created.body.cloneResourceId}/modeler?proposalId=${created.body.id}&contentId=${created.body.cloneContentId}`,
    );
    await authorPage.getByPlaceholder('Votre réponse à la demande de précision…').fill(
      'Le critère est la complétude des informations obligatoires.',
    );
    await authorPage.getByRole('button', { name: 'Répondre à la précision' }).click();
    await authorPage.getByText(/Réponse de l’auteur/).waitFor();

    await reviewerPage.reload();
    await reviewerPage.getByText(/Réponse de l’auteur/).waitFor();
    await reviewerPage.getByRole('button', { name: 'Accepter', exact: true }).click();
    await reviewerPage.getByText('Acceptée', { exact: true }).waitFor();

    // Validate the proposal, then publish exactly the approved frozen snapshot.
    await reviewerPage.goto(`${baseUrl}/mes-demandes`);
    await reviewerPage.getByText('Traiter une demande', { exact: true }).waitFor();
    await reviewerPage.getByRole('button', { name: 'Approuver', exact: true }).click();
    await reviewerPage.getByRole('button', { name: 'Publier la version approuvée' }).waitFor();
    await reviewerPage.getByRole('button', { name: 'Publier la version approuvée' }).click();

    await reviewerPage.getByText(
      'La contribution est approuvée et figée. Le diagramme est en lecture seule jusqu’à sa publication.',
    ).waitFor();
    await reviewerPage.getByPlaceholder('Synthèse des modifications apportées…').fill(
      'Publication de validation du parcours E2E.',
    );
    await reviewerPage.getByRole('button', { name: 'Publier la version approuvée' }).click();
    await reviewerPage.waitForURL(`**/${sourceResourceId}`);

    const finalState = await reviewerPage.evaluate(async () => {
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

    process.stdout.write('Browser E2E passed: Viewer author → validator clarification → author response → remark decision → proposal approval → approved snapshot publication.\\n');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error}\\n`);
  process.exitCode = 1;
});
