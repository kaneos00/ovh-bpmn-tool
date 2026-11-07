# Spécification — Référentiel hybride des acteurs RACI et détection des doublons (V3)

- **Statut :** spécification fonctionnelle et technique, à valider avant implémentation
- **Branche de préparation :** `feat/raci-actor-rationalization-v3`
- **Branche de base :** `feat/issue-125-v3-integration`
- **Périmètre :** backend ProjectContext, administration, lecture RACI consolidée
- **Principe :** migration additive ; aucune réécriture du RACI existant

## 1. Objectif

Permettre à l'organisation de reconnaître qu'un même acteur est désigné différemment dans plusieurs projets, sans imposer un vocabulaire identique aux projets.

Exemple :
- Projet A : « Directeur financier »
- Projet B : « Responsable finances »
- Projet C : « DAF »

Après validation humaine, ces acteurs locaux peuvent être rattachés à l'acteur de référence « Direction financière ». Les libellés et affectations RACI locaux restent inchangés.

La détection des doublons est automatique. La création d'une correspondance ou la fusion logique est toujours une décision humaine auditée : aucun score ne déclenche seul un rapprochement.

## 2. Principes non négociables

1. **Autonomie locale :** chaque projet conserve ses acteurs et leurs libellés.
2. **Identité transversale :** un acteur de référence peut regrouper plusieurs acteurs locaux.
3. **Pas de fusion destructive :** aucun acteur local ni aucune affectation RACI n'est supprimé lors d'un rapprochement.
4. **RACI inchangé :** les codes R/A/C/I, processus, éléments BPMN, pilotes, validateurs, droits et workflows ne sont pas modifiés.
5. **Décision explicite :** détection automatique, validation humaine.
6. **Traçabilité :** proposition, validation, refus, annulation et fusion d'acteurs de référence sont historisés.
7. **Sécurité par périmètre :** aucune consolidation ni suggestion ne doit exposer les noms ou données de projets auxquels l'utilisateur n'a pas accès.
8. **Compatibilité :** le module est indépendant du Viewer, du Modeleur et du workflow de propositions BPMN (#125).

## 3. État existant observé dans la branche de base

Le modèle actuel comporte :
- `project_raci_actors` : registre local avec `projectId`, `name`, `normalizedName`, `active`, `origin` (`manual` / `bpmn`) ;
- `project_raci_entries` : affectations avec `projectId`, `resourceId`, `taskId`, `taskName`, `actorName`, `role` ;
- `ProjectRaciController` : API sous `projects/:projectId/raci`, vérification des rôles projet et synchronisation des acteurs BPMN ;
- `ProjectContextModule` : module NestJS/TypeORM qui enregistre ces entités ;
- frontend : `ProjectRaciManager`, `ProjectRaciPanel` et moteur `raci-engine`.

Le modèle d'affectation conserve actuellement `actorName` sous forme de texte. Le registre local est donc la meilleure clé de raccordement : la nouvelle couche doit relier les identifiants des acteurs locaux aux identités de référence, sans remplacer les références textuelles des affectations dans cette première évolution.

**Avant migration**, confirmer sur le commit de base que les fichiers et migrations n'ont pas évolué. Ne pas déduire le schéma d'une ancienne branche.

## 4. Modèle conceptuel cible

### 4.1 Acteur local

Réutiliser `project_raci_actors` comme source des appellations propres à un projet. Ne pas créer une deuxième table d'alias projet dans le MVP : le champ `name` constitue le libellé local et `normalizedName` sa clé de normalisation actuelle.

Un acteur local peut être inactif ; il reste consultable pour l'historique et peut conserver son rattachement de référence.

### 4.2 Acteur de référence

Nouvelle table proposée : `reference_raci_actors`.

Champs indicatifs :
- `id` UUID ;
- `name` varchar(255), libellé canonique ;
- `normalizedName` varchar(255) ;
- `kind` enum : `PERSON`, `FUNCTION`, `SERVICE`, `EXTERNAL_ORGANIZATION`, `UNKNOWN` ;
- `description` nullable ;
- `active` boolean ;
- champs standard d'audit (`createdBy`, `createdAt`, `updatedAt`).

La portée du référentiel doit être celle de l'organisation/du tenant existant. **Point préalable obligatoire :** vérifier le modèle réel de tenant/organisation et les gardes d'accès. Si l'installation V3 est mono-organisation sans entité tenant, documenter explicitement cette portée et ne pas inventer un `organizationId` non supporté.

### 4.3 Correspondance acteur local → référence

Nouvelle table proposée : `project_raci_actor_mappings`.

Champs :
- `id` UUID ;
- `projectActorId` FK vers `project_raci_actors.id` ;
- `referenceActorId` FK vers `reference_raci_actors.id` ;
- `status` (MVP : correspondance validée/active, avec dates d'effet si nécessaires) ;
- `decisionId` ou référence vers l'événement d'audit ;
- champs d'audit.

Contraintes :
- un acteur local ne peut avoir qu'une seule correspondance active ;
- un acteur de référence peut recevoir plusieurs acteurs locaux, y compris plusieurs projets ;
- les FK doivent empêcher les rattachements croisés hors périmètre organisationnel ;
- aucun ON DELETE CASCADE ne doit supprimer silencieusement les historiques ou affectations ;
- la suppression physique d'un acteur de référence déjà utilisé est interdite ; désactivation/archivage uniquement.

Plusieurs acteurs locaux d'un même projet peuvent pointer vers le même acteur de référence si la gouvernance le valide.

### 4.4 Propositions de rapprochement

Nouvelle table proposée : `raci_actor_match_candidates`.

Champs :
- paire d'acteurs locaux comparés, stockée dans un ordre canonique ;
- score global et scores détaillés par critère ;
- version de l'algorithme ;
- explication lisible des signaux ;
- statut : `PENDING`, `APPROVED`, `REJECTED`, `DISMISSED`, `STALE` ;
- date de calcul, date de décision, auteur et commentaire de décision ;
- éventuel acteur de référence choisi lors de la validation.

Une contrainte unique sur la paire canonique et la version/état appropriée doit empêcher les propositions dupliquées. Un refus doit être mémorisé afin de ne pas reproposer continuellement la même paire ; une nouvelle proposition ne sera permise que si les données changent significativement ou si l'administrateur relance explicitement l'analyse.

### 4.5 Historique

Nouvelle table proposée : `raci_actor_events` ou mécanisme d'audit existant à réutiliser après vérification.

Événements minimum :
- acteur de référence créé/modifié/désactivé ;
- correspondance créée/annulée ;
- proposition approuvée/refusée/ignorée ;
- acteurs de référence fusionnés ;
- correspondance réaffectée.

Chaque événement garde l'acteur local, l'acteur de référence, l'utilisateur, la date, l'action et une justification facultative. Pas de journalisation de données sensibles inutiles.

## 5. Détection automatique

### 5.1 Déclencheurs

- synchronisation ou création/modification d'un acteur local ;
- action explicite « Analyser les doublons » par un administrateur ;
- tâche périodique idempotente ;
- changement de version du moteur de détection.

La détection ne doit pas ralentir la sauvegarde d'une matrice RACI. Les analyses volumineuses sont exécutées en arrière-plan ou par lots.

### 5.2 Étapes

1. Normaliser : trim, casse, espaces multiples, ponctuation, accents et abréviations contrôlées.
2. Comparer les noms normalisés et les variantes/synonymes configurés.
3. Comparer les types d'acteur lorsqu'ils sont connus ; une incompatibilité de type est un signal bloquant ou fortement pénalisant.
4. Examiner le contexte disponible : périmètre projet, processus et répartition R/A/C/I. Le contexte est un indice, jamais une preuve d'identité.
5. Produire un score explicable, les critères contributifs et une version d'algorithme.
6. Enregistrer ou mettre à jour une proposition sans modifier de correspondance.

### 5.3 Scoring initial à calibrer

Pondérations de départ (non contractuelles) :
- similarité lexicale/normalisée : 30 % ;
- proximité sémantique via dictionnaire métier contrôlé : 25 % ;
- compatibilité du type : 15 % ;
- contexte organisationnel/processus : 20 % ;
- cohérence du périmètre : 10 %.

Seuils initiaux proposés :
- 95–100 : priorité élevée ;
- 80–94 : à examiner ;
- 65–79 : faible confiance, affichage secondaire ou masqué ;
- inférieur à 65 : pas de proposition par défaut.

Ces seuils sont calibrés sur un jeu d'essai représentatif. Aucun seuil ne permet une validation automatique. Les acteurs de même nom peuvent être distincts, notamment si les périmètres organisationnels diffèrent.

Le MVP doit privilégier une méthode déterministe et testable (normalisation, dictionnaire de synonymes/abréviations, similarité textuelle). Un modèle sémantique externe/IA et une infrastructure vectorielle sont hors périmètre initial.

### 5.4 Anti-bruit et qualité

- Ne pas comparer les acteurs au sein de projets auxquels l'utilisateur courant n'a pas accès dans l'interface.
- Le service système peut calculer les paires interprojets, mais les résultats exposés doivent être filtrés côté serveur selon les droits.
- Éviter les comparaisons inutiles entre acteurs inactifs, sauf analyse historique explicitement demandée.
- Dédupliquer les paires et rendre le calcul idempotent.
- Expliquer les scores ; ne jamais présenter un score comme une probabilité statistique si ce n'est pas calibré.

## 6. Validation et gouvernance

Pour chaque proposition, l'administrateur autorisé peut :
- rattacher les deux acteurs locaux à un acteur de référence existant ;
- créer un nouvel acteur de référence puis rattacher les acteurs ;
- rattacher un seul des deux acteurs et laisser l'autre indépendant ;
- refuser la proposition ;
- ignorer temporairement ;
- consulter les processus et les rôles R/A/C/I concernés, dans les limites de ses droits.

Une correspondance interprojets doit être validée par un administrateur global/organisationnel selon le mécanisme d'autorisation existant. Un administrateur de projet peut consulter et proposer, mais ne doit pas pouvoir modifier seul une identité globale qui impacte d'autres projets.

**Préalable sécurité :** inventorier les rôles globaux réellement présents. Ne pas supposer qu'un rôle `globalAdmin` existe. Réutiliser les gardes ACL existantes et ajouter la permission minimale manquante si nécessaire.

## 7. Fusion d'acteurs de référence

La fusion de deux identités de référence est distincte du rapprochement de deux acteurs locaux.

- opération explicite et confirmée ;
- choix de l'identité survivante ;
- transfert transactionnel des correspondances ;
- conservation de l'identité absorbée en état archivé/fusionné avec référence vers la survivante ;
- historique complet ;
- détection des collisions de correspondances ;
- possibilité de réaffectation/annulation contrôlée.

Aucune suppression physique et aucune réécriture de `project_raci_entries` dans le MVP.

## 8. RACI consolidé

Le service de consolidation est une lecture calculée à partir des affectations existantes et des correspondances validées.

Chaque ligne doit conserver au minimum :
- acteur de référence et libellé local ;
- projet ;
- processus/ressource ;
- tâche/élément BPMN ;
- code R/A/C/I ;
- source et date/version si disponibles.

Ne jamais fusionner les codes R/A/C/I en un seul code global. En cas de responsabilités différentes entre projets, les afficher séparément. Les vues de synthèse peuvent calculer des indicateurs (nombre de projets, processus, R/A/C/I) mais doivent permettre de revenir au détail et à sa provenance.

## 9. API indicative

Respecter le style NestJS et les conventions API actuelles. Routes à confirmer lors de l'implémentation :

- `GET /raci/reference-actors` : liste filtrée par périmètre autorisé ;
- `POST /raci/reference-actors` : créer une référence ;
- `PATCH /raci/reference-actors/:id` : modifier/désactiver ;
- `GET /raci/actor-match-candidates` : lister les propositions visibles ;
- `POST /raci/actor-match-candidates/run` : lancer une analyse ;
- `POST /raci/actor-match-candidates/:id/approve` : valider et créer les correspondances ;
- `POST /raci/actor-match-candidates/:id/reject` : refuser ;
- `POST /raci/actor-match-candidates/:id/dismiss` : ignorer ;
- `POST /raci/actor-mappings/:id/revoke` : annuler une correspondance ;
- `POST /raci/reference-actors/:id/merge` : fusionner deux identités, si inclus dans le lot gouvernance ;
- `GET /raci/consolidated` : lecture consolidée.

Les endpoints globaux ne doivent pas être placés artificiellement sous `projects/:projectId`. Si le projet possède déjà un contrôleur d'administration organisationnelle, intégrer le contrôleur au bon module plutôt que créer une navigation concurrente.

## 10. Interface d'administration

Entrée proposée : **Administration → Référentiel → Acteurs RACI**.

Vues :
1. **Acteurs de référence** : recherche, type, état, nombre de projets/appellations associées.
2. **Rapprochements à examiner** : score, explications, projets, appellations, statut.
3. **Détail d'un acteur** : appellation canonique, alias locaux, projets, processus et affectations.
4. **Historique** : décisions et annulations.

Actions : créer, modifier, désactiver, analyser, valider, refuser, ignorer, annuler une correspondance. Toute action est conditionnée par les droits serveur.

Respecter le design system et le shell d'administration V3 existants. Ne pas créer une nouvelle page Viewer ni une deuxième matrice RACI.

## 11. Migration et compatibilité

Migration strictement additive :
- créer les tables de référence, correspondances, propositions et événements ;
- ajouter index/FK/contraintes ;
- ne pas modifier ni renommer `project_raci_entries` ou `project_raci_actors` ;
- ne pas backfiller automatiquement des correspondances globales à partir de noms identiques ;
- éventuellement créer des candidats de détection après migration, sans validation ;
- garder les routes actuelles et le format des réponses existantes compatibles.

La migration doit être rejouable selon les conventions du dépôt, testée sur une base avec données existantes et une base vide, et accompagnée d'une stratégie de rollback. Les données historiques ne sont jamais supprimées.

## 12. Tests obligatoires

### Backend / données
- migration sur base vide et base existante ;
- unicité de la correspondance active par acteur local ;
- impossibilité de rattacher des projets/tenants de périmètres différents ;
- idempotence de la détection ;
- unicité et canonicalisation des paires candidates ;
- validation/refus/annulation transactionnels et audités ;
- droits globaux et droits projet ;
- filtrage des résultats selon les ACL ;
- fusion de références sans perte de correspondances ;
- absence de modification des entrées RACI.

### Détection
- égalité exacte ;
- casse, espaces, accents et ponctuation ;
- abréviations et synonymes configurés ;
- faux amis et homonymes ;
- types incompatibles ;
- périmètres différents ;
- acteurs inactifs ;
- paire déjà rejetée ;
- recalcul après changement d'algorithme.

### Frontend
- états chargement, vide, erreur et pagination ;
- comparaison lisible des deux acteurs ;
- explication des scores ;
- actions disponibles selon les droits ;
- confirmation avant validation/fusion ;
- aucune fuite d'information interprojets ;
- responsive et cohérence visuelle V3.

### Non-régression
- RACI projet actuel ;
- synchronisation des acteurs BPMN ;
- édition et renommage des acteurs locaux ;
- viewer RACI ;
- matrice du Modeleur ;
- workflow de commentaires/propositions/validation #125.

## 13. Découpage de livraison

- **Lot 0 — Audit et contrat :** vérifier tenant/organisation, ACL, conventions de migrations, modèle réel des acteurs et écrans d'administration.
- **Lot 1 — Référentiel et correspondances :** tables additives, entités TypeORM, services et API sécurisée.
- **Lot 2 — Détection :** normalisation, règles, scoring explicable, candidats et tâche idempotente.
- **Lot 3 — Administration :** écrans de consultation et de validation.
- **Lot 4 — Consolidation :** lecture RACI transversale et indicateurs avec provenance.
- **Lot 5 — Gouvernance avancée :** fusion d'acteurs de référence, annulation, audit et durcissement.

Ordre recommandé : Lot 0 → Lot 1 → Lot 2 → Lot 3 → Lot 4 → Lot 5. Chaque lot a sa CI et sa recette ; aucun lot ne doit bloquer le workflow #125.

## 14. Critères de sortie globale

- les projets gardent leurs noms locaux et leurs affectations ;
- les correspondances sont explicites, uniques et auditables ;
- la détection crée des suggestions, jamais des fusions automatiques ;
- les refus sont mémorisés ;
- le RACI consolidé garde la provenance et les codes séparés ;
- les droits sont contrôlés côté serveur ;
- la migration n'entraîne aucune perte de données ;
- les tests de non-régression et la CI sont verts.

## 15. Hors périmètre initial

- remplacement des utilisateurs par des acteurs RACI ou inversement ;
- synchronisation automatique avec un annuaire RH ;
- IA externe, embeddings ou base vectorielle ;
- normalisation forcée des libellés des projets sans action explicite, aperçu et validation de l'administrateur ;
- réécriture non contrôlée des BPMN XML ou des affectations RACI ; les remplacements ciblés et audités décrits au §16 sont inclus dans le périmètre ;
- modification des rôles d'accès, pilotes ou validateurs ;
- consolidation statistique qui masque les différences R/A/C/I locales.

## 16. Administration des appellations et remplacements transversaux (exigence complémentaire)

L'administrateur de l'organisation doit pouvoir corriger et harmoniser facilement les noms d'acteurs et les libellés métier utilisés dans l'ensemble des RACI et des BPMN accessibles dans son périmètre.

Exemple : remplacer « Responsable IVV » par « Responsable VV » dans tous les projets, matrices RACI et diagrammes BPMN concernés.

### 16.1 Deux opérations distinctes

- **Fusionner des appellations/acteurs :** déclarer que plusieurs appellations locales désignent le même acteur de référence. Les appellations sources et leur provenance restent consultables ; la fusion logique ne détruit pas les acteurs locaux.
- **Remplacer un libellé :** effectuer un renommage explicite d'une appellation source vers un libellé cible, sur un périmètre choisi (organisation entière, projets sélectionnés, processus sélectionnés ou occurrences sélectionnées).

L'administrateur peut choisir une opération globale ou limitée. Une fusion d'identités ne doit pas entraîner implicitement une réécriture de tous les textes BPMN ; le remplacement des libellés est une action distincte, proposée dans le même parcours lorsque pertinent.

### 16.2 Sources à couvrir

L'audit du lot 0 doit inventorier précisément les occurrences éditables et leur stockage. Le périmètre cible comprend au minimum :
- les acteurs et affectations RACI, sans modifier les codes R/A/C/I ;
- les noms d'acteurs et libellés de lanes/pools/participants BPMN ;
- les libellés textuels BPMN pertinents (activités, événements, passerelles, annotations et autres éléments retenus après audit).

Les identifiants techniques BPMN, références, liens, expressions, scripts, propriétés techniques, noms de fichiers et données non textuelles ne sont jamais remplacés par une recherche textuelle générique. Les occurrences ambiguës ou non éditables sont signalées, pas modifiées silencieusement.

### 16.3 Parcours administrateur obligatoire

1. Saisir l'appellation source et l'appellation cible.
2. Choisir le périmètre (tous les projets autorisés ou sélection explicite).
3. Analyser les occurrences sans rien modifier.
4. Afficher un aperçu regroupé par projet, processus, version BPMN, matrice RACI, élément et champ, avec le texte avant/après.
5. Permettre d'exclure des occurrences et signaler les collisions (acteur cible déjà présent, doublon dans une matrice, libellé identique avec sens différent).
6. Afficher le nombre exact d'occurrences et les objets qui seront modifiés.
7. Demander une confirmation explicite avant application.
8. Exécuter l'opération de manière contrôlée, enregistrer un journal d'audit et fournir un bilan des réussites/échecs.

Aucun remplacement global ne doit être lancé automatiquement par le moteur de détection de doublons.

### 16.4 Intégrité, versions et réversibilité

- Préserver les identifiants BPMN, les références entrantes/sortantes, les connexions DI et la structure XML.
- Ne pas modifier les codes R/A/C/I, les pilotes, validateurs, droits, commentaires ou historiques de validation.
- Respecter le mécanisme de versionnement/publication des BPMN : ne jamais écraser une version publiée ou un brouillon concurrent sans contrôle de version et confirmation.
- Prévoir une opération atomique par lot lorsque techniquement possible ; sinon, produire un état détaillé et reprenable sans masquer les échecs partiels.
- Conserver avant/après, auteur, date, périmètre, critères et références des objets modifiés afin de permettre une annulation contrôlée.
- Respecter les ACL côté serveur pour l'analyse comme pour l'application. Un administrateur ne peut modifier que les objets de son périmètre autorisé ; les opérations réellement transversales sont réservées au rôle organisationnel compétent identifié par l'audit.

### 16.5 Critères d'acceptation

- Un administrateur peut prévisualiser puis remplacer « Responsable IVV » par « Responsable VV » sur plusieurs projets.
- Le parcours couvre les occurrences RACI et les champs BPMN retenus par l'audit, sans toucher aux identifiants ni à la structure des diagrammes.
- Les occurrences peuvent être exclues individuellement avant confirmation.
- Les collisions et homonymies sont présentées avant application.
- Le nombre d'occurrences annoncé correspond au bilan réel.
- L'opération est auditée et son annulation est possible sans perte de données.
- Les tests prouvent l'absence de modification des rôles R/A/C/I, des liens BPMN, des versions et des droits.
- Les accès interprojets sont filtrés et contrôlés côté backend.
