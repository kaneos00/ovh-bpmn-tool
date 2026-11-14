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

async function openProjectWorkspace(page) {
  // Select the project through the real workspace navigation rather than
  // writing the active-project key directly into localStorage. The project
  // page's Référentiel action is the supported entry point to /root.
  await page.goto(`${baseUrl}/projects/${projectId}`);
  const openWorkspace = page.getByRole('button', { name: 'Référentiel', exact: true });
  await openWorkspace.waitFor();
  await openWorkspace.click();
  await page.waitForURL('**/root');
  await page.getByText('Processus du projet', { exact: true }).waitFor();
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
    await signIn(reviewerPage, reviewerUsername, reviewerPassword);
    // Enter the target project through its visible UI entry point. This keeps
    // the E2E aligned with the same project-selection flow used by real users.
    await openProjectWorkspace(reviewerPage);

    // Create a real project variant through the public workflow endpoint.
    // This avoids relying on a static fixture that can silently drift from
    // the database seed and also exercises variant creation end to end.
    const createdVariant = await reviewerPage.evaluate(async ({ projectId, sourceResourceId }) => {
      const response = await fetch(`/bpmn-api/projects/${projectId}/processes/variants`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sourceResourceId,
          name: 'CI E2E — variante partenaire',
        }),
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    }, { projectId, sourceResourceId });
    assert.equal(
      createdVariant.status,
      201,
      `Variant creation failed: ${JSON.stringify(createdVariant.body)}`,
    );
    assert.ok(
      createdVariant.body?.resource?.id,
      `Variant creation returned no resource id: ${JSON.stringify(createdVariant.body)}`,
    );
    const variantResourceId = createdVariant.body.resource.id;

    // Re-enter the project through the supported UI action so the workspace
    // is reloaded with the newly created variant in its project context.
    await openProjectWorkspace(reviewerPage);

    // Verify that the source process History tab aggregates the new variant
    // and identifies the project that owns it.
    await reviewerPage.goto(`${baseUrl}/${sourceResourceId}`);
    await reviewerPage.getByRole('tab', { name: 'Historique des versions' }).click();
    const historyPanel = reviewerPage.getByRole('tabpanel');
    await historyPanel.getByText('Variantes de ce processus', { exact: true }).waitFor();
    await historyPanel.getByText('CI E2E — variante partenaire', { exact: true }).waitFor();
    const owningProjectName = await reviewerPage.evaluate(async projectId => {
      const response = await fetch('/bpmn-api/projects/me/workspace', { credentials: 'same-origin' });
      const workspace = await response.json();
      return workspace.projects.find(project => project.id === projectId)?.name ?? null;
    }, projectId);
    assert.ok(owningProjectName, 'The variant owning project is not present in the accessible workspace');
    await historyPanel.getByText(owningProjectName, { exact: true }).waitFor();

    // Submit the remark through the real Viewer UI. This also verifies that
    // the workspace cache and active-request banner refresh without a reload.
    await openProjectWorkspace(authorPage);
    await authorPage.goto(`${baseUrl}/${variantResourceId}`);
    const authorTask = authorPage.locator('.djs-element[data-element-id="Task_ProcessRequest"]');
    await authorTask.waitFor();
    await authorTask.click();
    await authorPage.waitForFunction(() => {
      const element = document.querySelector('.djs-element[data-element-id="Task_ProcessRequest"]');
      return Boolean(element && element.classList.contains('task-selected'));
    });
    await authorPage.getByRole('button', { name: 'Ajouter une remarque' }).click();
    await authorPage.getByPlaceholder('Décrivez le point à signaler…').fill(
      'CI E2E — vérifier la qualification de la demande',
    );
    const proposalResponsePromise = authorPage.waitForResponse(response =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname.endsWith('/change-proposals'),
    );
    await authorPage.getByRole('button', { name: 'Déposer la remarque' }).click();
    const proposalResponse = await proposalResponsePromise;
    const created = { status: proposalResponse.status(), body: await proposalResponse.json() };

    assert.equal(created.status, 201, `Proposal creation failed: ${JSON.stringify(created.body)}`);
    assert.ok(created.body.id, 'The API did not return a proposal id');
    assert.ok(created.body.cloneResourceId, 'The API did not return a proposal workspace');
    assert.ok(created.body.cloneContentId, 'The API did not return the proposal draft');
    await authorPage.getByText('Votre remarque a été déposée et transmise au circuit de validation du projet.').waitFor();
    await authorPage.getByLabel('1 commentaire(s)').waitFor();

    // The comment badge must also be visible to another member of the project.
    await reviewerPage.goto(`${baseUrl}/root`);
    const commentBadge = reviewerPage.getByLabel('1 commentaire(s)');
    await commentBadge.waitFor();
    const commentTreeItem = commentBadge.locator('xpath=ancestor::*[@role="treeitem"][1]');
    assert.match(await commentTreeItem.innerText(), /CI E2E — variante partenaire/);

    // A process without a request must not inherit another process's warning.
    await reviewerPage.goto(`${baseUrl}/${sourceResourceId}`);
    assert.equal(
      await reviewerPage.getByText(/Une demande de modification est déjà ouverte pour cette version/).count(),
      0,
      'The active-request banner leaked onto a process without an open request',
    );
    await reviewerPage.goto(`${baseUrl}/${variantResourceId}`);
    await reviewerPage.getByText(/Une demande de modification est déjà ouverte pour cette version/).waitFor();

    // The author's remark must be visible on the variant in its own project context.
    await authorPage.goto(
      `${baseUrl}/${variantResourceId}?elementId=Task_ProcessRequest`,
    );
    await authorPage.getByText(
      'CI E2E — vérifier la qualification de la demande',
      { exact: true },
    ).waitFor();

    // A project variant must open its own published BPMN content, not the
    // common source or an empty Viewer. Capture the actual XML request made
    // by the Viewer so identical initial source/variant XML cannot hide a
    // resource-ID mix-up.
    const variantContentResponses = [];
    reviewerPage.on('response', response => {
      const url = new URL(response.url());
      if (
        url.pathname.startsWith(
          `/bpmn-api/resources/${variantResourceId}/contents/`,
        ) &&
        url.pathname.endsWith('/content')
      ) {
        variantContentResponses.push({ url: url.pathname, status: response.status() });
      }
    });
    await reviewerPage.goto(`${baseUrl}/${variantResourceId}`);
    await reviewerPage.waitForTimeout(2000);

    // Exercise the real Viewer controls: initial 1:1 and the explicit reset
    // must both be observable in the rendered bpmn-js viewport.
    const readViewerScale = () => reviewerPage.evaluate(() => {
      const transform = document.querySelector('.djs-container .viewport')?.getAttribute('transform') ?? '';
      const matrix = transform.match(/matrix\(([^)]+)\)/);
      return matrix ? Number(matrix[1].split(/[ ,]+/)[0]) : null;
    });
    try {
      await reviewerPage.waitForFunction(() => {
        const transform = document.querySelector('.djs-container .viewport')?.getAttribute('transform') ?? '';
        return /matrix\(/.test(transform);
      }, { timeout: 12000 });
    } catch (error) {
      const diagnostics = await reviewerPage.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        viewerCanvasCount: document.querySelectorAll('.process-viewer-canvas').length,
        djsContainerCount: document.querySelectorAll('.djs-container').length,
        viewportCount: document.querySelectorAll('.djs-container .viewport').length,
        svgCount: document.querySelectorAll('.process-viewer-canvas svg').length,
        loadingText: document.querySelector('.process-viewer-loading')?.textContent ?? null,
        importError: Array.from(document.querySelectorAll('[role="alert"]')).map(node => node.textContent),
        canvasText: document.querySelector('.process-viewer-canvas')?.textContent?.slice(0, 1000) ?? null,
        bodyText: document.body.innerText.slice(0, 2500),
      }));
      throw new Error(`Viewer viewport was not initialized: ${JSON.stringify(diagnostics)}; ${error.message}`);
    }
    const initialScale = await readViewerScale();
    assert.ok(
      initialScale !== null && Math.abs(initialScale - 1) < 0.02,
      `The Viewer should initially be at 1:1, got scale ${initialScale}`,
    );
    await reviewerPage.getByRole('button', { name: 'Zoom avant' }).click();
    await reviewerPage.waitForFunction(() => {
      const transform = document.querySelector('.djs-container .viewport')?.getAttribute('transform') ?? '';
      const matrix = transform.match(/matrix\(([^)]+)\)/);
      return Boolean(matrix && Number(matrix[1].split(/[ ,]+/)[0]) > 1.01);
    });
    await reviewerPage.getByRole('button', { name: 'Zoom 1:1' }).click();
    await reviewerPage.waitForFunction(() => {
      const transform = document.querySelector('.djs-container .viewport')?.getAttribute('transform') ?? '';
      const matrix = transform.match(/matrix\(([^)]+)\)/);
      return Boolean(matrix && Math.abs(Number(matrix[1].split(/[ ,]+/)[0]) - 1) < 0.02);
    });

    const variantDiagnostics = await reviewerPage.evaluate(async ({ resourceId, sourceResourceId }) => {
      const [resourceResponse, contentsResponse, sourceContentsResponse] = await Promise.all([
        fetch(`/bpmn-api/resources/${resourceId}`, { credentials: 'same-origin' }),
        fetch(`/bpmn-api/resources/${resourceId}/contents`, { credentials: 'same-origin' }),
        fetch(`/bpmn-api/resources/${sourceResourceId}/contents`, { credentials: 'same-origin' }),
      ]);
      const [resource, contents, sourceContents] = await Promise.all([
        resourceResponse.json().catch(() => null),
        contentsResponse.json().catch(() => null),
        sourceContentsResponse.json().catch(() => null),
      ]);
      const variantPublished = Array.isArray(contents)
        ? contents.find(content => content.status === 'published')
        : null;
      const sourcePublished = Array.isArray(sourceContents)
        ? sourceContents.find(content => content.status === 'published')
        : null;
      const readXml = async (id, contentId) => {
        const response = await fetch(
          `/bpmn-api/resources/${id}/contents/${contentId}/content`,
          { credentials: 'same-origin' },
        );
        const body = await response.text();
        let xml = body;
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed === 'string') xml = parsed;
        } catch {
          // The endpoint may return the BPMN XML directly as text.
        }
        return { status: response.status, xml };
      };
      const [variantXml, sourceXml] = variantPublished && sourcePublished
        ? await Promise.all([
          readXml(resourceId, variantPublished.id),
          readXml(sourceResourceId, sourcePublished.id),
        ])
        : [null, null];
      const parsedXml = variantXml?.xml
        ? new DOMParser().parseFromString(variantXml.xml, 'application/xml')
        : null;
      const expectedLabels = parsedXml
        ? Array.from(parsedXml.getElementsByTagName('*'))
          .filter(element => !['definitions', 'process', 'collaboration'].includes(element.localName))
          .map(element => element.getAttribute('name'))
          .filter(Boolean)
        : [];
      return {
        resourceStatus: resourceResponse.status,
        resourceName: resource?.name ?? null,
        contentsStatus: contentsResponse.status,
        contentVersions: Array.isArray(contents)
          ? contents.map(content => ({ id: content.id, status: content.status, version: content.version }))
          : contents,
        variantContentId: variantPublished?.id ?? null,
        sourceContentId: sourcePublished?.id ?? null,
        variantXmlStatus: variantXml?.status ?? null,
        sourceXmlStatus: sourceXml?.status ?? null,
        variantXml: variantXml?.xml ?? null,
        sourceXml: sourceXml?.xml ?? null,
        expectedLabels,
        canvasCount: document.querySelectorAll('.djs-container').length,
        elementCount: document.querySelectorAll('.djs-element').length,
        diagramText: Array.from(document.querySelectorAll('.djs-container text'))
          .map(element => element.textContent || '')
          .join(' '),
        bodyText: document.body.innerText.slice(0, 3000),
      };
    }, { resourceId: variantResourceId, sourceResourceId });
    assert.equal(
      variantDiagnostics.resourceStatus,
      200,
      `Variant resource lookup failed: ${JSON.stringify(variantDiagnostics)}`,
    );
    assert.equal(
      variantDiagnostics.contentsStatus,
      200,
      `Variant contents lookup failed: ${JSON.stringify(variantDiagnostics)}`,
    );
    assert.ok(
      variantDiagnostics.variantContentId,
      `The variant has no published BPMN content: ${JSON.stringify(variantDiagnostics)}`,
    );
    assert.notEqual(
      variantDiagnostics.variantContentId,
      variantDiagnostics.sourceContentId,
      'The variant must own a distinct content version rather than reuse the source content row',
    );
    assert.equal(variantDiagnostics.variantXmlStatus, 200, 'The variant BPMN XML could not be loaded');
    assert.ok(
      variantContentResponses.some(response => response.status === 200),
      `The Viewer did not request BPMN XML through the variant resource: ${JSON.stringify(variantContentResponses)}`,
    );
    assert.equal(variantDiagnostics.sourceXmlStatus, 200, 'The source BPMN XML could not be loaded');
    assert.equal(
      variantDiagnostics.variantXml,
      variantDiagnostics.sourceXml,
      'A newly created variant must begin as an exact copy of the published source BPMN',
    );
    assert.ok(
      variantDiagnostics.expectedLabels.length > 0,
      'The copied variant BPMN contains no named elements',
    );
    for (const label of variantDiagnostics.expectedLabels) {
      assert.ok(
        variantDiagnostics.diagramText.includes(label),
        `The Viewer did not render the variant BPMN label "${label}": ${JSON.stringify(variantDiagnostics)}`,
      );
    }

    // Open the project home and use its explicit process list. This is the
    // canonical project-scoped entry point; searching the global folder tree
    // is not a reliable way to find a newly linked project variant.
    await reviewerPage.goto(`${baseUrl}/root`);
    // The project overview contains one process-list row and a separate
    // recent-changes row for the same resource. Scope the action to the
    // process row (which also exposes its usage and published version).
    const variantRow = reviewerPage.getByRole('row', {
      name: /CI E2E — variante partenaire Variante V1/,
    });
    const variantEntry = variantRow.getByRole('button', {
      name: 'CI E2E — variante partenaire',
      exact: true,
    });
    await variantEntry.waitFor();
    await variantEntry.click();
    await reviewerPage.waitForURL(`**/${variantResourceId}`);

    const variantTask = reviewerPage.locator('.djs-element[data-element-id="Task_ProcessRequest"]');
    await variantTask.waitFor();
    await variantTask.click();
    await reviewerPage.waitForFunction(() => {
      const element = document.querySelector('.djs-element[data-element-id="Task_ProcessRequest"]');
      return Boolean(element && element.classList.contains('task-selected'));
    });

    // The project home must be a visible first-level explorer node and return
    // to /root rather than opening project settings.
    await reviewerPage.getByText(/^Accueil — /).click();
    await reviewerPage.waitForURL('**/root');
    await reviewerPage.getByText('Processus du projet', { exact: true }).waitFor();
    const variantRowAfterHome = reviewerPage.getByRole('row', {
      name: /CI E2E — variante partenaire Variante V1/,
    });
    await variantRowAfterHome.getByRole('button', {
      name: 'CI E2E — variante partenaire',
      exact: true,
    }).click();
    await reviewerPage.waitForURL(`**/${variantResourceId}`);
    await reviewerPage.locator('.djs-element[data-element-id="Task_ProcessRequest"]').waitFor();

    // Exercise the header's quick search against the seeded published process.
    // The results page uses the same API and serves as the comparison path.
    await reviewerPage.goto(`${baseUrl}/${sourceResourceId}`);
    const quickSearch = reviewerPage.getByRole('textbox', {
      name: 'Rechercher dans tous les contenus',
    });
    await quickSearch.fill('demande');
    await reviewerPage.getByRole('button', { name: 'Voir tous les résultats' }).waitFor();
    const quickSearchResult = reviewerPage
      .locator('.workspace-navigation')
      .getByRole('listitem')
      .filter({ hasText: /Processus BPMN/ })
      .first();
    await quickSearchResult.waitFor({ state: 'visible' });
    assert.equal(
      await reviewerPage.getByText(/Recherche indisponible pour le moment/).count(),
      0,
      'The header quick search returned an API error',
    );
    await reviewerPage.goto(`${baseUrl}/search?q=demande`);
    await reviewerPage.getByText('Traiter une demande', { exact: true }).first().waitFor();
    await reviewerPage.goto(`${baseUrl}/mes-demandes`);

    await reviewerPage.getByText('CI E2E — variante partenaire', { exact: true }).first().waitFor();
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

    // The reviewer must still be able to save the proposal workspace after
    // accepting the individual remarks and before the final proposal approval.
    await reviewerPage.getByRole('button', { name: 'Save', exact: true }).click();
    await reviewerPage.getByText('Content has been saved successfully.', { exact: true }).waitFor();

    // Validate the proposal, then publish exactly the approved frozen snapshot.
    await reviewerPage.goto(`${baseUrl}/mes-demandes`);
    await reviewerPage.getByText('CI E2E — variante partenaire', { exact: true }).first().waitFor();
    await reviewerPage.getByRole('button', { name: 'Approuver', exact: true }).click();
    await reviewerPage.getByRole('button', { name: 'Publier la version approuvée' }).waitFor();
    await reviewerPage.getByRole('button', { name: 'Publier la version approuvée' }).click();

    await reviewerPage.getByText(
      'La contribution est approuvée et figée. Le diagramme est en lecture seule jusqu’à sa publication.',
    ).waitFor();
    // The publication summary is mandatory; enter it before waiting for the
    // action button to become enabled.
    await reviewerPage.getByPlaceholder('Synthèse des modifications apportées…').fill(
      'Publication de validation du parcours E2E.',
    );
    const publishApprovedButton = reviewerPage.getByRole('button', { name: 'Publier la version approuvée' });
    // The modeler becomes ready asynchronously after importing the frozen
    // approved snapshot. Do not click while its publication action is disabled.
    await reviewerPage.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(item => item.textContent?.trim() === 'Publier la version approuvée');
      return Boolean(button && !button.disabled);
    });
    await publishApprovedButton.click();
    await reviewerPage.waitForURL(`**/${variantResourceId}`);

    const finalState = await authorPage.evaluate(async () => {
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
