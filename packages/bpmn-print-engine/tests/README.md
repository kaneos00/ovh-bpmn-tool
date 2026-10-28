# Tests du moteur d'impression BPMN

## Référence Pizza-Store

Le fichier de référence est une copie exacte de
[\`examples/organisation-demo/Pizza-Store.bpmn\`](../../../../examples/organisation-demo/Pizza-Store.bpmn)
dans \`tests/fixtures/Pizza-Store.bpmn\`. Il contient deux participants BPMN,
trois lanes, des flux de séquence et des flux de messages entre participants.

Générer les quatre vues A4 portrait depuis la racine du dépôt :

\`\`\`bash
python3 packages/bpmn-print-engine/scripts/generate-pizza-store-pages.py
\`\`\`

Sorties :
- \`tests/fixtures/generated/pizza-store-page-01.bpmn\`
- \`tests/fixtures/generated/pizza-store-page-02.bpmn\`
- \`tests/fixtures/generated/pizza-store-page-03.bpmn\`
- \`tests/fixtures/generated/pizza-store-page-04.bpmn\`

Ces fichiers conservent le modèle BPMN sémantique complet et découpent uniquement
les informations BPMN-DI visibles sur chaque page. Ils servent à examiner la
répartition graphique et les dimensions A4 portrait ; ils ne sont pas quatre
processus métier indépendants. Le générateur est une fixture de référence et
ne doit pas être confondu avec l'implémentation de production du moteur.

## Génération et validation

\`\`\`bash
python3 packages/bpmn-print-engine/scripts/generate-fixtures.py
python3 packages/bpmn-print-engine/scripts/generate-pizza-store-pages.py
python3 -m unittest discover -s packages/bpmn-print-engine/tests -p 'test_*.py' -v
\`\`\`

La CI publie les quatre fichiers générés sous l'artefact
\`pizza-store-a4-portrait-pages\`.
