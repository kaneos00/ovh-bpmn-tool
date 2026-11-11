import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const proposals = read('../src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx');
const modeler = read('../src/Containers/ContentModeler/ContentModeler.container.tsx');
const remarks = read('../src/Containers/ContentModeler/components/ProposalRemarksPanel.tsx');
const routeState = read('../src/shared/hooks/useViewerRouteState.ts');
const controller = read('../../backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts');

test('review entry opens the exact submitted snapshot in the canonical Modeler workspace', () => {
  assert.match(proposals, /reviewRemarks=1[\s\S]*?proposal\.submittedContentId/);
  assert.match(modeler, /const proposalId = searchParams\.get\('proposalId'\)/);
  assert.match(modeler, /const reviewRemarksMode = searchParams\.get\('reviewRemarks'\) === '1'/);
  assert.match(modeler, /<ProposalRemarksPanel[\s\S]*?proposalId=\{proposalId\}[\s\S]*?canDecide=\{reviewRemarksMode\}/);
  assert.match(routeState, /searchParams\.get\('contentId'\)/);
});

test('approved proposal publication uses the approved snapshot and remains a distinct workflow', () => {
  assert.match(proposals, /publishApproved=1[\s\S]*?sourceResourceId=\$\{proposal\.sourceResourceId\}[\s\S]*?proposal\.submittedContentId/);
  assert.match(modeler, /const approvedProposalMode = searchParams\.get\('publishApproved'\) === '1'/);
  assert.match(modeler, /readOnly=\{approvedProposalMode\}/);
  assert.match(modeler, /\/projects\/process-change-proposals\/\$\{proposalId\}\/publish/);
  assert.match(controller, /publishProposalWorkspace/);
});

test('modeler remark descriptions show BPMN element names while retaining IDs as fallback/tooltips', () => {
  assert.match(remarks, /const getElementDisplayName = \(modeler: Modeler, elementId: string\)/);
  assert.match(remarks, /element\?\.businessObject\?\.name \?\? element\?\.name/);
  assert.match(remarks, /getElementDisplayName\(modeler, remark\.elementId\)/);
  assert.match(remarks, /title=\{remark\.elementId\}/);
});

test('remark workflow preserves proposal scope, BPMN element identity and event-thread history', () => {
  assert.match(remarks, /process-change-proposals\/\$\{proposalId\}\/comments/);
  assert.match(remarks, /elementId: selectedElementId/);
  assert.match(remarks, /comments\/\$\{remark\.id\}\/decision/);
  assert.match(remarks, /comments\/\$\{remark\.id\}\/clarification/);
  assert.match(remarks, /comments\/\$\{remark\.id\}\/response/);
  assert.match(remarks, /remark_clarification_requested/);
  assert.match(remarks, /remark_author_responded/);
  assert.match(controller, /assertCanSubmitRemarks/);
});

test('proposal review interface uses French loading and empty states', () => {
  assert.match(proposals, /Chargement des demandes…/);
  assert.match(proposals, /Réessayer/);
  assert.match(proposals, /Aucune demande en attente de validation\./);
  assert.doesNotMatch(proposals, /Caricamento delle richieste|Nessuna richiesta|>Riprova</);
});
