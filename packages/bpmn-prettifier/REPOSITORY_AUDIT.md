# Audit technique initial — moteur de prettyfication BPMN

Date de l’audit : 2026-10-29. Audit de lecture uniquement ; aucune modification de l’interface dans ce lot.

## Pile BPMN identifiée

- Frontend : React + TypeScript.
- Éditeur et viewer : `camunda-bpmn-js`; le `frontend/package.json` déclare également `bpmn-js` 16.x et le panneau de propriétés.
- Instance du Modeleur : `frontend/src/shared/hooks/useModelerInstance.ts`, qui construit `BpmnModeler` et `BpmnViewer`.
- Cycle d’import et attachement : `frontend/src/Containers/ContentModeler/hooks/useModeler.ts`.
- Sauvegarde et export : `frontend/src/Containers/ContentModeler/hooks/useContentModeler.ts`; l’export BPMN et la sauvegarde passent par `bpmnModelerInstance.saveXML({ format: true })`.
- Barre d’action : `frontend/src/Containers/ContentModeler/components/ModelerActionBar.tsx`, montée par `ContentModeler.container.tsx`. C’est le point d’entrée UI candidat pour une commande explicite ultérieure.
- Pagination A4 : `frontend/src/shared/utils/paginatedBpmnSvg.ts`, indépendante de ce moteur.

## Fixtures et tests réutilisables

- `frontend/tests/fixtures/Parking (copie)_v9.bpmn` : fixture BPMN réelle utilisée pour un test de parsing/réécriture.
- `frontend/tests/fixtures/pagination-witness.bpmn` : fixture témoin créée pour la pagination ; utile aussi comme cas géométrique, mais ne doit pas devenir une dépendance du moteur de pagination.
- `examples/organisation-demo/*.bpmn` : exemples BPMN métier du dépôt.
- Tests frontend existants : `frontend/tests/unit`, `frontend/tests/ui-regression.test.mjs` et `frontend/tests/viewer-interactions.test.mjs`.

## Architecture retenue

1. Le cœur `packages/bpmn-prettifier/src/engine.ts` opère sur des types géométriques sans dépendance UI.
2. `bpmn-xml.ts` est un adaptateur dédié utilisant `bpmn-moddle` comme dépendance directe de ce package, au lieu de dépendre indirectement de l’installation frontend.
3. L’adaptateur ne modifie que les bounds des formes DI existantes et recale les extrémités des edges sur les formes déplacées ; il conserve les waypoints intermédiaires.
4. La vérification XML expose des diagnostics géométriques et les avertissements de parsing, mais ne prétend pas remplacer un validateur complet de conformité BPMN.

## Limites à résoudre avant intégration UI

- Le réagencement des lanes sœurs et du participant n’est pas implémenté : une égalisation qui chevaucherait une lane sœur est refusée et diagnostiquée.
- Les extrémités des edges sont recalées géométriquement ; les routes complexes, associations, flux diagonaux, labels et événements attachés doivent être couverts par des fixtures ciblées.
- L’orientation du lane est estimée depuis son rapport largeur/hauteur. Ce choix doit être validé sur les diagrammes verticaux et atypiques.
- L’affectation à un lane s’appuie d’abord sur `flowNodeRef`, puis sur une inclusion géométrique non ambiguë pour des formes comme les références de données.
- Le test d’une fixture réelle vérifie le round-trip XML ; la validation visuelle et la comparaison du rendu avant/après restent à faire.
- Il faut éviter toute application automatique à l’ouverture ou à la sauvegarde. La future intégration doit être une action explicite et réversible.

## Prochaine tranche technique

1. Ajouter des fixtures de pools/participants multiples, lanes verticaux, événements attachés, sous-processus, data objects, labels et edges avec plusieurs waypoints.
2. Tester la conservation des identifiants et références sémantiques avant/après.
3. Améliorer l’algorithme de réagencement de lanes en tenant compte des formes, des bounds des participants et des edges.
4. Ajouter des tests d’idempotence et des tests de non-régression géométrique sur le corpus.
5. Seulement après ces garde-fous, préparer un raccord UI minimal dans la barre d’action, sans toucher au moteur de pagination A4.
