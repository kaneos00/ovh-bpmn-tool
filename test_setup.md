# TEST_SETUP — Plan de mise en place des tests automatisés

- **Dépôt :** [kaneos00/ovh-bpmn-tool](https://github.com/kaneos00/ovh-bpmn-tool)
- **Branche de référence à examiner :** `release/v2.2-reference-2026-10-24` (`bf0a5e0e3f0d6e23e9c5099312dc174559570bf5`)
- **Audit de départ :** [AUDIT_V2.2_2026-10-24.md](docs/audit/AUDIT_V2.2_2026-10-24.md)
- **Objectif :** mettre en place une base de tests fiable, l'intégrer au CI et livrer un état vérifiable, avec un bilan reproductible.
- **Règle de travail :** petits lots séquentiels, preuves à chaque étape, aucun déploiement.

> Ce document est un fil rouge d'exécution. Il ne présume ni du framework de test déjà installé ni de la structure exacte du dépôt : les vérifier avant toute modification. Ne pas déclarer qu'un test existe ou qu'un CI a réussi sans résultat vérifiable.

## 1. Résultat attendu

À la fin du travail, fournir :
1. un inventaire de l'existant (tests, scripts, dépendances, workflows CI) ;
2. une première suite de tests frontend réellement exécutables ;
3. des tests ciblant les fonctions métier et les régressions BPMN prioritaires ;
4. une commande locale documentée et un job CI qui exécutent ces tests ;
5. les résultats des commandes et du CI, les éventuels échecs et leurs causes ;
6. un rapport final indiquant les fichiers modifiés, les commits, les limites et les prochaines étapes.

La couverture doit être utile, pas seulement élevée : privilégier des comportements critiques vérifiables. Ne pas viser arbitrairement 100 % de couverture.

## 2. Contraintes non négociables

- Partir de la branche indiquée et relever le SHA exact du commit de départ.
- Vérifier l'état CI et le fonctionnement existant avant les changements.
- Réutiliser en priorité les outils et conventions déjà présents ; ne pas ajouter un deuxième framework si un outil adapté existe.
- Ajouter les dépendances uniquement si elles sont nécessaires et compatibles avec le gestionnaire de paquets et la version de Node du dépôt.
- Ne pas modifier le comportement applicatif pour faire passer un test. Si un défaut est découvert, le documenter et isoler sa correction dans un lot explicite.
- Ne pas supprimer, désactiver ou assouplir des contrôles, tests ou jobs existants pour obtenir un CI vert.
- Ne pas remplacer des tests instables par des tests triviaux ni masquer les erreurs.
- Ne pas committer de secrets, jetons, données de production ou artefacts de build.
- Aucun déploiement, aucune publication d'image, aucune modification de production, aucune fusion de PR.
- Ne pas toucher aux changements sans rapport avec les tests.
- Si le dépôt ou le CI n'est pas accessible, si la branche a changé de manière inattendue, ou si une opération destructive est nécessaire : arrêter et consigner le blocage au lieu d'improviser.

## 3. Phase A — Inventaire et état initial

Effectuer ces vérifications avant d'éditer le code :

- [ ] Confirmer le dépôt, la branche, le SHA et l'existence de changements non commis, si un environnement de travail local est disponible.
- [x] Parcourir l'arborescence : frontend React/TypeScript (`frontend/`), backend (`backend/`), modules partagés, scripts de build et workflows.
- [x] Dépendances examinées : frontend `pnpm@11.1.3`, Node `>=24`, CI Node 24 et lockfile `frontend/pnpm-lock.yaml`.
- [x] Tests inventoriés : suite backend Jest existante ; pas de suite frontend dédiée dans la référence avant ce lot. Runner natif Node `node:test` retenu sans framework supplémentaire.
- [x] Workflows examinés : `validate.yml` (lint/build frontend, lint/build/tests backend et smoke tests démo) et workflow dédié aux tests frontend ajouté dans ce lot.
- [x] Baseline CI de la référence vérifiée : [Validate, run 40106918343](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40106918343), succès. Exécution par GitHub Actions ; aucun résultat local n'est revendiqué.
- [ ] Consigner les résultats réels, les commandes exactes, la durée approximative et les échecs préexistants.
- [x] Audit `docs/audit/AUDIT_V2.2_2026-10-24.md` lu : il précise qu'aucun test navigateur automatisé n'a été exécuté dans l'audit initial.

**Livrable A :** tableau « contrôle / commande / résultat / preuve / anomalie préexistante ». Ne pas conclure à l'absence de tests sur la seule base d'une recherche partielle.

## 4. Phase B — Choix de l'outillage

À décider après l'inventaire, pas avant :

- Tests unitaires : réutiliser le framework existant ; sinon évaluer Vitest pour le frontend, selon la configuration réelle.
- Tests React : React Testing Library si cela correspond à la stack et si des tests de composants apportent une valeur réelle.
- Tests de bout en bout : envisager Playwright dans un lot ultérieur, après identification d'un parcours reproductible et d'un environnement de test.
- Backend : conserver et exécuter la suite existante ; ne pas la remplacer par des tests frontend.
- CI : intégrer les commandes au workflow existant le plus pertinent plutôt que créer un pipeline concurrent sans nécessité.

Avant toute installation, vérifier la compatibilité des versions, les conventions du projet, le lockfile et les conséquences sur le build. Toute décision doit être justifiée dans le rapport.

## 5. Phase C — Priorité des tests

Commencer par des tests déterministes, rapides et à forte valeur. Adapter la liste aux modules réellement présents :

### C1. Fonctions métier et données
- [ ] Validation des éléments BPMN et règles de cohérence, là où elles sont implémentées.
- [ ] Conversion, import/export ou traitement XML : cas nominal, entrée invalide et cas limites.
- [ ] Identifiants et recherche de nœuds : unicité, nœud absent et données limites.
- [x] Arbre et relations parent/enfant : résolution de liens, parent unique, ambiguïtés, auto-liens et cycles couverts par tests unitaires ; sélection/expansion couverts par contrats source.
- [ ] Règles RACI ou fonctions de recherche associées, si elles sont isolables.

### C2. Régressions fonctionnelles de l'éditeur BPMN
Vérifier d'abord si les cas sont reproductibles et comment ils sont représentés dans le code. Écrire des assertions observables plutôt que de tester uniquement l'implémentation interne.

- [ ] Style cohérent des gateways.
- [ ] Représentation des flèches rondes / marqueurs des tâches associées à une URL, si cette fonctionnalité existe.
- [x] `SubProcess` / `Call Activity` : extraction XML, résolution de cible par ID de ressource ou ID BPMN unique, cibles ambiguës, déduplication et cycles testés ; pas encore d'interactions navigateur réelles.
- [ ] Comportement de la minimap lors de la sélection, du déplacement et de la mise à jour du diagramme.
- [ ] Différenciation clic simple / double clic et navigation associée.
- [x] Navigation et expansion/repli de l'arbre couvertes par contrats source.
- [ ] Filtrage effectif des favoris et recherche à tester séparément.

Ces éléments proviennent de l'audit et de régressions évoquées précédemment : ils sont des **candidats à vérifier**, pas des défauts à présumer. Si un comportement ne peut pas être testé de façon fiable dans un test automatisé rapide, expliquer pourquoi et le planifier séparément.

### C3. Parcours de bout en bout — lot ultérieur
Après la mise en place de tests unitaires stables, sélectionner au moins un parcours critique reproductible, par exemple : ouvrir un diagramme de test, modifier un élément, enregistrer, recharger et vérifier les données persistées. Ne pas utiliser de données de production. Ajouter Playwright seulement si l'environnement peut être démarré et nettoyé de manière fiable dans le CI.

## 6. Phase D — Implémentation en lots séquentiels

### Lot 0 — Baseline
- [ ] Terminer l'inventaire et enregistrer les résultats initiaux.
- [ ] Confirmer que les commandes existantes fonctionnent ou identifier les échecs préexistants.
- [ ] Définir le périmètre du premier lot.

**Gate :** aucune modification tant que l'état de départ n'est pas compris.

### Lot 1 — Infrastructure minimale de test
- [x] Aucun framework ajouté : utilisation de `node:test`, fourni avec Node 24.
- [x] Scripts reproductibles ajoutés : `pnpm test:regression`, `pnpm test:unit`, `pnpm test:all` dans `frontend/package.json`.
- [x] Tests métier ajoutés pour `buildQuery`, `checkForLinterIssues` et le moteur RACI.
- [ ] Vérifier le lockfile et exécuter le test en local.
- [ ] Exécuter lint et build pour détecter les effets de bord.

**Gate :** la commande de test fonctionne localement et échoue correctement quand une assertion est volontairement invalidée, sans conserver cette invalidation dans le dépôt.

### Lot 2 — Premier lot de tests métier
- [x] Modules isolés retenus : helpers API, helpers du Modeler et moteur RACI.
- [x] Cas nominaux et limites couverts : paramètres API vides/encodés, problèmes de Modeler, règles RACI R/A manquants, A multiples et acteurs inutilisés.
- [ ] Éviter les mocks excessifs et les tests dépendant de détails d'implémentation.
- [x] Contrôles exécutés dans le CI sur le SHA 2503ab14edd31057ff47da85196ebbfb903ddbdd : 23/23 tests unitaires, 15/15 contrats, Validate complet réussi. Aucune exécution locale n'est revendiquée.
- [x] Aucun défaut applicatif confirmé ; l'échec intermédiaire du contrat source est consigné séparément dans le journal du 25 octobre.

**Gate :** tests déterministes, compréhensibles et reproductibles.

### Lot 3 — Régressions BPMN prioritaires
- [x] 15 contrats de régression : panneaux, cinq types de gateways, minimap, sélection simple/double, sélection BPMN, explorateur, navigation Call Activity, liens externes et délégation de l'arbre vers le résolveur testé.
- [x] Chaque contrat relie un comportement attendu à des assertions sur le code source concerné.
- [ ] Vérifier que les tests échouent si le comportement attendu est cassé, lorsque cette vérification est praticable.
- [ ] Ne pas faire dépendre les tests de captures d'écran ou de temporisations arbitraires si une assertion plus robuste est possible.

**Gate :** chaque test a une raison d'exister et protège un comportement utilisateur ou métier identifié.

### Lot 4 — Intégration au CI
- [x] Workflow `frontend-regression-tests.yml` ajouté sur push, pull request et lancement manuel ; exécute contrats UI et tests métier.
- [x] Workflow aligné sur Node 24, pnpm 11.1.3 et installation `--frozen-lockfile`.
- [x] Installation reproductible configurée : `pnpm install --frozen-lockfile`.
- [x] Les commandes `node --test` / `pnpm test:unit` propagent les échecs et font échouer le job CI.
- [x] Workflow de tests avec permissions minimales `contents: read` ; aucun secret ni service externe requis.
- [x] Tests déterministes, locaux au dépôt, sans accès réseau externe ni données de production.
- [x] Workflow dédié avec deux jobs bloquants ; le workflow de validation principal reste distinct et inchangé.
- [x] CI final vert sur le SHA de tête `2503ab14edd31057ff47da85196ebbfb903ddbdd` : [Frontend regression tests, run 40168970949](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168970949) (15/15 contrats, 23/23 tests unitaires) et [Validate, run 40168971603](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168971603) (lint/build frontend, lint/build/tests backend, builds Compose/Docker et smoke tests démo tous réussis). SHA de merge PR testé par Actions : `1bfebcba0407774ec3c67d0f0d94371fd5324edd`.

**Gate :** le CI est vert sur le commit visé et le job de test apparaît bien dans les résultats. Un fichier de workflow modifié ou un test local vert ne suffisent pas à affirmer que le CI est vert.

### Lot 5 — Durcissement et bilan
- [ ] Vérifier l'absence de tests ignorés ou de suites silencieusement non découvertes.
- [ ] Mesurer la durée de la suite et repérer les lenteurs évidentes.
- [ ] Ajouter une couverture chiffrée seulement si elle est supportée proprement ; ne pas imposer un seuil arbitraire sans baseline.
- [x] Commandes et limites documentées dans le bilan ci-dessous.
- [x] Rapport de bilan avec SHA et preuves CI ajouté au compte rendu ci-dessous.

### Lot 6 — E2E, seulement si les lots précédents sont stables
- [ ] Évaluer le démarrage de l'application et des services nécessaires dans un environnement isolé.
- [ ] Créer des données de test déterministes et un nettoyage fiable.
- [ ] Ajouter un parcours Playwright à forte valeur — reporté au lot suivant ; aucun navigateur/E2E n'a été installé.
- [ ] Exécuter localement puis dans le CI, vérifier la stabilité et le temps d'exécution.
- [ ] Si l'infrastructure est trop fragile, consigner le blocage plutôt que d'ajouter un job intermittent.

## 7. Critères de réussite

Le travail n'est considéré comme terminé que si les points applicables ci-dessous sont prouvés :

- [x] Inventaire documenté : tests Jest backend conservés ; frontend `node:test` (15 contrats + 23 tests unitaires) ; tests navigateur/E2E absents et explicitement reportés.
- [x] Les commandes `pnpm test:regression`, `pnpm test:unit` et `pnpm test:all` sont documentées ; le CI les exécute avec Node 24 et pnpm 11.1.3.
- [ ] Les tests ajoutés passent localement dans l'environnement documenté.
- [x] Lint/build frontend et lint/build/tests backend réussis dans `Validate` run 40168971603.
- [x] Le CI a exécuté les tests sur le SHA de tête annoncé (`2503ab14...`) ; la merge ref CI est `1bfebcba...`.
- [x] Statuts finaux consultés et cités ci-dessus ; l'échec intermédiaire du contrat source obsolète est décrit dans le journal du 25 octobre.
- [x] Aucun test, job ou contrôle existant n'a été désactivé, ignoré ou assoupli.
- [x] Aucun déploiement, publication d'image ni changement de production n'a été effectué.
- [x] Modifications limitées aux tests, à leur script et à l'extraction sans changement fonctionnel du résolveur d'arbre.
- [x] SHA, commits, liens CI, résultats, limites et prochaines étapes consignés dans le journal du 25 octobre.

**Si le CI ne peut pas être lancé ou si un résultat reste indéterminé, le résultat doit être présenté comme incomplet, avec le blocage précis. Ne jamais annoncer un succès non observé.**

## 8. Compte rendu de fin d'exécution

Compléter ce tableau dans le bilan final (ou dans une section datée ci-dessous) :

| Élément | Résultat à renseigner |
|---|---|
| Branche et SHA de départ | `release/v2.2-reference-2026-10-24` @ `bf0a5e0e3f0d6e23e9c5099312dc174559570bf5` |
| Branche et SHA final | Branche de tests @ `2503ab14edd31057ff47da85196ebbfb903ddbdd` (SHA du code testé ; commit documentaire postérieur) |
| Inventaire des tests existants | Suite Jest backend conservée ; frontend `node:test` : 15 contrats et 23 tests unitaires ; aucun E2E navigateur. |
| Outil de test retenu et justification | `node:test` fourni par Node 24 ; aucun framework/dépendance de test supplémentaire ; TypeScript compilé dans `.test-dist/`. |
| Fichiers créés/modifiés | `FolderTree/processLinks.ts` (nouveau), `FolderTree/hooks/useFolderTree.ts`, `frontend/package.json`, `tests/unit/process-links.test.mjs` (nouveau), `tests/ui-regression.test.mjs`, `test_setup.md`. Aucun lockfile changé ; `Modeler.css` identique à la référence (blob `fd2b2306…`). |
| Commandes locales exécutées | Aucune revendiquée. CI : `node --test frontend/tests/ui-regression.test.mjs frontend/tests/viewer-interactions.test.mjs` et `pnpm test:unit`. |
| Nombre de tests ajoutés/exécutés | 15/15 contrats (dont 1 nouveau) ; 23/23 tests unitaires (8 nouveaux) ; 38 cas passés au total. |
| Lint / build | Succès dans `Validate` run 40168971603 : frontend lint/build, backend lint/build/tests, Docker/Compose et smoke démo. |
| URL du workflow CI | [Frontend regression tests #40168970949](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168970949) ; [Validate #40168971603](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168971603). |
| SHA vérifié par le CI | Tête PR `2503ab14edd31057ff47da85196ebbfb903ddbdd` ; merge ref Actions `1bfebcba0407774ec3c67d0f0d94371fd5324edd`. |
| Statut du CI | Vert : deux workflows finaux réussis ; aucun job échoué/non exécuté. |
| Problèmes découverts | Échec intermédiaire d'un contrat source devenu obsolète après extraction ; corrigé sans modifier le comportement. Aucun défaut applicatif confirmé. |
| Points restant à faire | Test de mutation pour démontrer la détection des régressions ; interactions navigateur/E2E ; filtrage réel des favoris/recherche ; exécution locale et durée globale. |
| Déploiement | Aucun ; PR #33 ouverte, non fusionnée ; branche de référence conservée. |

## 9. Format du rapport à présenter au matin

Le rapport doit commencer par un résumé concis :
- **État :** terminé / partiel / bloqué.
- **CI :** statut réel et lien.
- **Tests :** ce qui est désormais protégé.
- **Risques :** problèmes confirmés, échecs préexistants et limites.
- **Changements :** fichiers et commits exacts.
- **Suite recommandée :** prochaine petite étape.

Fournir ensuite les preuves : commandes exécutées, extraits de résultats pertinents, lien vers les tests et lien vers le commit. Distinguer systématiquement **fait vérifié**, **hypothèse** et **travail restant**.

---

## Journal d'exécution

Ne pas préremplir ce journal avec des résultats supposés. Ajouter une entrée datée après chaque lot terminé, avec commit et preuve associée.

### Journal d'exécution — 24 octobre 2026

- **Base de départ vérifiée :** `release/v2.2-reference-2026-10-24`, SHA `bf0a5e0e3f0d6e23e9c5099312dc174559570bf5`. CI de référence réussie : [run 40106918343](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40106918343).
- **Tests unitaires :** 15 tests présents dans `frontend/tests/unit/` (helpers API, helpers du Modeler, moteur RACI), tous passés en CI.
- **Contrats Viewer/explorateur :** 14 tests passés en CI couvrent hauteur/repli des panneaux, cinq types de gateways, minimap fermée par défaut, sélection simple/double, sélection et navigation Call Activity, liens externes, expansion et sélection de l'arbre, résolution non ambiguë des processus appelés, déduplication et prévention des cycles.
- **Commandes locales documentées :** `pnpm test:regression`, `pnpm test:unit`, `pnpm test:all`. `test:unit` compile les modules isolés dans `.test-dist`, puis exécute `node:test`.
- **CI récent vérifié :** [Frontend regression tests, run 40115723540](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40115723540) réussi sur `54e8ede` (14/14 contrats, 15/15 tests unitaires). Le workflow `Validate` complet doit encore terminer sur la tête finale ; ne pas annoncer son succès avant observation.
- **PR :** [#33](https://github.com/kaneos00/ovh-bpmn-tool/pull/33) ouverte et maintenant ciblée sur la référence du 24 octobre. Scripts locaux, commande CI et assertions liens externes ajoutés ; CI de la nouvelle tête à revérifier.
- **Limites :** assertions de contrat sur le code source, pas d'interactions navigateur réelles ; pas de Playwright ; aucune exécution locale ni mesure de durée locale dans cette session. Aucun changement applicatif effectif par rapport à la référence : `Modeler.css` a été aligné sur le contenu exact de la V2.2. Aucun déploiement et aucune fusion.
- **Échec intermédiaire et correction :** une exécution a détecté que la branche de tests contenait encore l'ancien sélecteur gateway `> :first-child`, alors que la V2.2 validée utilise `> *` pour les symboles internes. La feuille `Modeler.css` de la branche de tests a été réalignée exactement sur celle de la référence ; le workflow de tests est ensuite passé.
### Journal d'exécution — 25 octobre 2026

- **État initial vérifié avant modification :** sur la tête précédente `57ad778aa2035fa0354b4faea35b93e51c437640`, [Validate run 40115809190](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40115809190) et [Frontend regression tests run 40115809244](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40115809244) étaient tous deux réussis.
- **Tests ajoutés :** `frontend/tests/unit/process-links.test.mjs` ajoute 8 tests déterministes sur l'extraction des cibles XML, les Call Activities, les sous-processus repliés, les ID BPMN ambigus, la déduplication, les liens vers soi, le parent unique et les cycles. Le contrat Viewer passe à 15 tests.
- **Refactor sans changement fonctionnel recherché :** l'extraction XML et l'algorithme de résolution ont été déplacés à l'identique de `useFolderTree.ts` vers `FolderTree/processLinks.ts` ; le hook appelle ce module. Les tests couvrent maintenant directement le résolveur utilisé par l'application. `Modeler.css` a le même blob que la référence V2.2 (`fd2b23063bb3705fb271a5d52a514aeca50f7580`).
- **Échec intermédiaire transparent :** [Frontend regression tests run 40168901527](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168901527), sur le SHA `920206a45fadc95afbfc17ef020d50502d04ad55`, a échoué sur 1 contrat / 15 : l'assertion cherchait encore l'extraction XML dans le hook après son déplacement. Les tests unitaires du même run ont réussi (23/23). L'assertion a été corrigée pour viser le nouveau module ; aucun défaut de comportement applicatif n'a été identifié.
- **SHA de code testé après correction :** `2503ab14edd31057ff47da85196ebbfb903ddbdd` — [commit](https://github.com/kaneos00/ovh-bpmn-tool/commit/2503ab14edd31057ff47da85196ebbfb903ddbdd). La PR CI a testé la merge ref `1bfebcba0407774ec3c67d0f0d94371fd5324edd` sur la base de référence `bf0a5e0e3f0d6e23e9c5099312dc174559570bf5`.
- **Résultats finaux observés :** [Frontend regression tests run 40168970949](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168970949) réussi : 15/15 contrats et 23/23 tests unitaires, zéro échec/skip. [Validate run 40168971603](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168971603) réussi : lint/build frontend, lint/build/tests backend, builds Docker/Compose et smoke tests de démonstration.
- **Périmètre et limites :** aucune dépendance ajoutée, aucun lockfile changé, aucun contrôle désactivé. Pas d'exécution locale ni de navigateur/E2E dans cette session. Aucun déploiement, aucune fusion ; la référence V2.2 reste inchangée et la PR [#33](https://github.com/kaneos00/ovh-bpmn-tool/pull/33) reste ouverte.
- **Suite recommandée :** ajouter un test de mutation ciblé et évaluer ensuite un parcours Playwright isolé ; tester séparément le filtrage effectif des favoris et de la recherche. Ne pas déclarer la couverture E2E terminée.


### Journal d'exécution — audit explorateur, 25 octobre 2026

- **Référence protégée :** `release/v2.2-reference-2026-10-24` @ `bf0a5e0e3f0d6e23e9c5099312dc174559570bf5`. Toutes les modifications ci-dessous restent sur la branche de travail `test/frontend-ci-regression-suite-2026-10-24`; aucune fusion ni aucun déploiement.
- **Point 7 — constat confirmé dans le code :** l'interface réellement utilisée est `FolderTree.tsx` (librairie `react-complex-tree`). Le gestionnaire de sélection de ligne naviguait vers la ressource, mais ne développait pas lui-même le dossier sélectionné. La correction ajoute le dossier à `expandedNodes` uniquement s'il possède des enfants et n'est pas déjà ouvert ; les autres nœuds développés sont conservés. Le clic continue d'appeler `onNodeClick`.
- **Point 7 — test :** le contrat source a été modifié pour couvrir le comportement additif. La dernière modification de test a été poussée dans le commit `45f1d68b085e6ea665992cd9c571e3bfb95b3842`. Le workflow dédié était vert sur un commit précédent du même lot (`c6fb7389d05c218feb657fe822b547e818175258`, 15 contrats et 23 tests unitaires à ce moment) ; le dernier ajout du test point 6 doit encore être validé par la nouvelle exécution CI. Aucun test navigateur réel n'a été effectué.
- **Point 6 — audit du shell Viewer :** `routes.tsx` route `/:resourceId` vers `BpmnLayout`. Pour un dossier, `BpmnLayout.container.tsx` rend un seul `FolderTree`; pour un processus, `ProcessDetails.tsx` intègre un seul `FolderTree`. Aucun import `ResourceExplorer` n'a été trouvé dans ces deux composants actifs. Un contrat source supplémentaire vérifie ces liens de code.
- **Limite importante du point 6 :** le composant historique `Components/BusinessComponents/ResourceExplorer/ResourceExplorer.tsx` existe encore dans le dépôt. Je ne conclus donc pas que tout l'ancien code a été supprimé ; il faut terminer la vérification des références globales avant de décider si ce composant et ses dépendances peuvent être supprimés sans effet de bord.
- **Point 8 — constats confirmés :** `useBpmnLayoutBreadcrumbs.ts` construit les chemins via `getFolderHierarchy`. Dans `shared/hooks/useFolders.ts`, `makeFlatHierarchy` remonte les `parentId` sans détection de cycle ; si un parent référencé n'existe pas dans la liste des dossiers, la remontée s'arrête et le fil d'Ariane est tronqué. Le champ `depth` de la ressource n'est pas utilisé pour construire le fil d'Ariane. Cela confirme une fragilité du code, mais ne prouve pas encore que les données de test sont corrompues.
- **Données :** aucune donnée n'a été modifiée, nettoyée ou réinitialisée. Il reste à comparer les chaînes de `parentId` et les valeurs `depth` réelles de façon non destructive.
- **CI :** [Frontend regression tests run 40168970949](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168970949) et [Validate run 40168971603](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40168971603) étaient verts pour le précédent lot de tests. Ces résultats ne couvrent pas les changements du 25 octobre ; attendre les workflows déclenchés par le dernier commit avant d'annoncer un nouveau CI vert.


- **Complément point 7 après revue du cycle de navigation :** le clic initial peut faire démonter/remonter `FolderTree` lorsque l'on passe de la vue processus à la vue dossier. Pour ne pas dépendre de l'état local avant navigation, `useFolderTree.ts` développe désormais aussi le dossier sélectionné dans son effet d'initialisation (la chaîne d'ancêtres inclut le dossier lui-même quand la ressource courante est un dossier). Cela complète la mise à jour additive de `expandedNodes` dans `FolderTree.tsx`.
- **Derniers commits du lot explorateur :** correction d'expansion après navigation `80de6fbb8d18faf6d499e8c9b9e25a0714af43c7`, contrat de test correspondant `c35383cfc2c4c7a9346bcc9d7601ceaf0b0d1f6b`, suivi `check.md` `ebf1aca446d152912e3f6c5134036ba06d67e6d6`. Le CI doit être relu sur la tête de branche la plus récente, pas déduit des exécutions antérieures.


### Journal d'exécution — branche de reprise du 25 octobre 2026, mise à jour

- **Branche de travail courante :** `fix/v2.2-checks-1-14-final-2026-10-25`. La branche de référence V2.2 n'a pas été modifiée ; aucun merge ni déploiement Coolify effectué.
- **Dernier commit applicatif testé :** `1c43a6cce078ea69a734cd8af3f665d0e07de801` ([commit](https://github.com/kaneos00/ovh-bpmn-tool/commit/1c43a6cce078ea69a734cd8af3f665d0e07de801)).
- **CI complète réussie sur ce commit :** [Validate run 40189645176](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40189645176). Lint/build frontend, lint/build/tests backend, validation Compose, builds d'images et smoke-test (base de données, login, session et API protégée) ont réussi.
- **Tests frontend réussis :** [Frontend regression tests run 40189645212](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40189645212) : **26/26 contrats de régression** et **27/27 tests unitaires**, aucun échec ni test ignoré. Les tests couvrent notamment le panneau de détail, les interactions de navigation, l'arbre, les liens de processus et la détection des cycles.
- **Correctif complémentaire confirmé par test :** la résolution des liens de processus construit maintenant le graphe acyclique progressivement ; une référence circulaire n'efface plus tous les liens valides. Le test unitaire confirme que la partie acyclique est conservée.
- **Contrat source ajusté après échec intermédiaire :** le test de contrat référençait l'ancienne implémentation du filtre de cycles. Il a été mis à jour pour vérifier l'algorithme incrémental. La suite complète est ensuite repassée au vert sur le commit ci-dessus.
- **Documentation :** `check.md` mis à jour pour les points 5, 14 et 29 et les liens CI. Le commit documentaire peut avoir sa propre exécution CI ; le résultat applicatif ci-dessus reste la preuve du code testé.
- **Limites restantes :** pas de test navigateur/E2E exécuté ; les points 1, 5, 7, 8, 10, 11, 12 et 13 exigent encore une recette fonctionnelle dans Coolify. Les contrats source ne prouvent pas à eux seuls les interactions réelles.
- **Prochaine étape :** vérifier la CI du dernier commit documentaire, puis tester sur Coolify les points ouverts dans cet ordre : panneau/minimap, expansion des dossiers et fil d'Ariane, double-clic et flèches, Récents, clignotement lors de la navigation. Aucun point ne doit être fermé sur la seule base d'une CI verte.


### Complément de validation — 25 octobre 2026

- **Commit testé :** `035ac68698d7e3342da556c3aea814ccc2abe806` ([commit](https://github.com/kaneos00/ovh-bpmn-tool/commit/035ac68698d7e3342da556c3aea814ccc2abe806)).
- **Validate :** [run 1518](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40189970316) réussi, incluant lint/build frontend et backend, tests backend, validation Compose, construction des images Docker et smoke-test login/session/API.
- **Tests frontend :** [run 226](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40189970355) réussi : **27/27 contrats de régression et 27/27 tests unitaires**, zéro échec et zéro test ignoré.
- **Contrat supplémentaire :** le panneau de détail doit présenter une description pédagogique du type BPMN immédiatement sous l'identifiant. Le contrat vérifie plusieurs types, notamment les passerelles et événements Start/End ; le rendu visuel reste à valider dans le navigateur.
- **Suivi :** `check.md` a été actualisé avec le SHA `035ac68`, les preuves CI et le statut du point 43.
- **État de livraison :** branche de travail uniquement ; aucune fusion dans la référence V2.2 et aucun déploiement Coolify. Les points fonctionnels 1, 5, 7, 8, 10, 11, 12 et 13 restent soumis à la recette navigateur.
