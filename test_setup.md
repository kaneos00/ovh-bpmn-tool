# TEST_SETUP — Plan de mise en place des tests automatisés

- **Dépôt :** [kaneos00/ovh-bpmn-tool](https://github.com/kaneos00/ovh-bpmn-tool)
- **Branche de référence à examiner :** `release/v2.2-reference-2026-10-23`
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
- [ ] Parcourir l'arborescence et identifier les applications frontend/backend, les répertoires partagés et les scripts de build.
- [ ] Examiner les fichiers de dépendances et de verrouillage : `package.json`, lockfile(s), versions de Node et gestionnaire de paquets.
- [ ] Rechercher les tests existants, les configurations de test, les mocks/fixtures et les commandes de test.
- [ ] Examiner tous les workflows CI pertinents : déclencheurs, jobs, commandes, dépendances, cache et conditions de succès.
- [ ] Exécuter les contrôles existants pertinents (lint, tests déjà présents, build) sans modifier le code.
- [ ] Consigner les résultats réels, les commandes exactes, la durée approximative et les échecs préexistants.
- [ ] Vérifier le contenu du rapport d'audit et confirmer les constats relatifs aux tests sur le code courant.

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
- [ ] Gestion de l'arbre et relations parent/enfant : ajout, sélection, expansion et parent invalide.
- [ ] Règles RACI ou fonctions de recherche associées, si elles sont isolables.

### C2. Régressions fonctionnelles de l'éditeur BPMN
Vérifier d'abord si les cas sont reproductibles et comment ils sont représentés dans le code. Écrire des assertions observables plutôt que de tester uniquement l'implémentation interne.

- [ ] Style cohérent des gateways.
- [ ] Représentation des flèches rondes / marqueurs des tâches associées à une URL, si cette fonctionnalité existe.
- [ ] Rendu et comportement des éléments `SubProcess` et `Call Activity`.
- [ ] Comportement de la minimap lors de la sélection, du déplacement et de la mise à jour du diagramme.
- [ ] Différenciation clic simple / double clic et navigation associée.
- [ ] Navigation, favoris, recherche et expansion de l'arbre de dossiers.

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
- [ ] Installer/configurer uniquement l'outillage nécessaire, si absent.
- [ ] Ajouter un script de test explicite et reproductible.
- [ ] Ajouter un test témoin simple sur une fonction stable et représentative.
- [ ] Vérifier le lockfile et exécuter le test en local.
- [ ] Exécuter lint et build pour détecter les effets de bord.

**Gate :** la commande de test fonctionne localement et échoue correctement quand une assertion est volontairement invalidée, sans conserver cette invalidation dans le dépôt.

### Lot 2 — Premier lot de tests métier
- [ ] Choisir un petit module important et suffisamment isolé.
- [ ] Tester les cas nominal, invalide et limite pertinents.
- [ ] Éviter les mocks excessifs et les tests dépendant de détails d'implémentation.
- [ ] Exécuter les tests concernés puis l'ensemble des contrôles pertinents.
- [ ] Documenter les défauts découverts séparément.

**Gate :** tests déterministes, compréhensibles et reproductibles.

### Lot 3 — Régressions BPMN prioritaires
- [ ] Ajouter les tests de régression dont les assertions peuvent être stables.
- [ ] Pour chaque régression, relier le test à un comportement attendu précis.
- [ ] Vérifier que les tests échouent si le comportement attendu est cassé, lorsque cette vérification est praticable.
- [ ] Ne pas faire dépendre les tests de captures d'écran ou de temporisations arbitraires si une assertion plus robuste est possible.

**Gate :** chaque test a une raison d'exister et protège un comportement utilisateur ou métier identifié.

### Lot 4 — Intégration au CI
- [ ] Ajouter l'exécution des tests au workflow existant, sur les mêmes événements que les autres contrôles de validation.
- [ ] Respecter la version de Node, le gestionnaire de paquets et le lockfile utilisés par le projet.
- [ ] Utiliser une installation reproductible (mode strict du gestionnaire de paquets approprié).
- [ ] Faire échouer le job si les tests échouent.
- [ ] Vérifier les permissions, variables et services requis sans exposer de secrets.
- [ ] S'assurer que les tests ne requièrent ni accès réseau externe non maîtrisé ni données de production.
- [ ] Vérifier l'ordre et les dépendances des jobs afin que le statut global attende bien les tests.
- [ ] Déclencher le CI et consulter le résultat effectif, les logs et le SHA testé.

**Gate :** le CI est vert sur le commit visé et le job de test apparaît bien dans les résultats. Un fichier de workflow modifié ou un test local vert ne suffisent pas à affirmer que le CI est vert.

### Lot 5 — Durcissement et bilan
- [ ] Vérifier l'absence de tests ignorés ou de suites silencieusement non découvertes.
- [ ] Mesurer la durée de la suite et repérer les lenteurs évidentes.
- [ ] Ajouter une couverture chiffrée seulement si elle est supportée proprement ; ne pas imposer un seuil arbitraire sans baseline.
- [ ] Documenter les commandes pour les développeurs et les limites connues.
- [ ] Préparer un rapport de fin de travail avec preuves.

### Lot 6 — E2E, seulement si les lots précédents sont stables
- [ ] Évaluer le démarrage de l'application et des services nécessaires dans un environnement isolé.
- [ ] Créer des données de test déterministes et un nettoyage fiable.
- [ ] Ajouter un parcours Playwright à forte valeur.
- [ ] Exécuter localement puis dans le CI, vérifier la stabilité et le temps d'exécution.
- [ ] Si l'infrastructure est trop fragile, consigner le blocage plutôt que d'ajouter un job intermittent.

## 7. Critères de réussite

Le travail n'est considéré comme terminé que si les points applicables ci-dessous sont prouvés :

- [ ] L'inventaire distingue tests existants, tests ajoutés et zones non couvertes.
- [ ] Les nouvelles commandes de test sont documentées et reproductibles.
- [ ] Les tests ajoutés passent localement dans l'environnement documenté.
- [ ] Lint et build n'ont pas régressé.
- [ ] Le CI a réellement exécuté les tests sur le commit annoncé.
- [ ] Le statut CI final est consulté et cité ; les échecs ou jobs non exécutés sont explicitement signalés.
- [ ] Aucun test ou contrôle existant n'a été désactivé pour faire passer la pipeline.
- [ ] Aucun déploiement ni changement de production n'a été effectué.
- [ ] Les modifications sont limitées au périmètre annoncé.
- [ ] Les commits, liens, résultats et limites sont listés dans le rapport final.

**Si le CI ne peut pas être lancé ou si un résultat reste indéterminé, le résultat doit être présenté comme incomplet, avec le blocage précis. Ne jamais annoncer un succès non observé.**

## 8. Compte rendu de fin d'exécution

Compléter ce tableau dans le bilan final (ou dans une section datée ci-dessous) :

| Élément | Résultat à renseigner |
|---|---|
| Branche et SHA de départ | À relever |
| Branche et SHA final | À relever |
| Inventaire des tests existants | À documenter |
| Outil de test retenu et justification | À documenter |
| Fichiers créés/modifiés | Liste exacte |
| Commandes locales exécutées | Commandes et résultat |
| Nombre de tests ajoutés/exécutés | Valeurs observées |
| Lint / build | Résultat réel |
| URL du workflow CI | URL réelle, si disponible |
| SHA vérifié par le CI | SHA réel |
| Statut du CI | Vert, rouge, annulé ou non exécuté |
| Problèmes découverts | Séparer défauts confirmés et hypothèses |
| Points restant à faire | Liste priorisée |
| Déploiement | Aucun |

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
