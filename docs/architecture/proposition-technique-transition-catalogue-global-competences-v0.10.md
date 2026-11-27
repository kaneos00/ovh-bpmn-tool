# Proposition technique — refonte du référentiel global des compétences

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** décision de conception retenue ; schéma et migration à implémenter après vérification finale des consommateurs.

## 1. Décision actée

La base concernée est une base de test. Il n'est donc pas nécessaire de conserver les anciennes compétences, leurs identifiants, leurs codes historiques ou une correspondance vers le nouveau modèle.

La stratégie retenue est une **migration de remplacement**, et non une migration additive de compatibilité :

- supprimer les anciennes définitions de compétences et les données de test qui leur sont directement rattachées ;
- créer un catalogue global de compétences, indépendant de tout bloc ;
- recréer les associations nécessaires entre compétences globales et blocs projet ;
- recréer les associations de compétences aux blocs de missions et aux compétences transversales des fiches de poste ;
- adapter les API, services, contrôleurs et interfaces pour utiliser le nouveau modèle ;
- ne conserver aucune table de correspondance historique ni double écriture.

Les identifiants des compétences seront régénérés. Aucun rapprochement automatique entre anciennes et nouvelles compétences n'est requis.

## 2. Modèle cible

### 2.1 Catalogue global

La table `competencies` devient le catalogue global (ou est remplacée par une table dédiée si les conventions de migration du projet le justifient).

Champs métier :
- `id` UUID PK ;
- `code` varchar(64), unique globalement ;
- `name` varchar(255), obligatoire ;
- `description` text nullable ;
- `category` obligatoire : `methodological`, `technical`, `functional` ou `behavioral` ;
- `active` boolean ;
- colonnes d'audit usuelles.

La définition globale ne contient ni `blockId` ni niveau attendu. Aucune étiquette secondaire ni famille multiple.

Le code est unique dans tout le catalogue. Le contrôle des intitulés similaires avertit l'utilisateur sans fusionner automatiquement les entrées.

### 2.2 Association compétence ↔ bloc de compétences projet

Le modèle `competency_blocks` reste distinct : il est utilisé par le périmètre des postes projet et les mappings BPMN existants.

Créer une association explicite, par exemple `competency_block_competencies` :
- `blockId` UUID FK vers `competency_blocks` ;
- `competencyId` UUID FK vers le catalogue global `competencies` ;
- ordre d'affichage éventuel ;
- unicité `(blockId, competencyId)`.

Une même compétence globale peut appartenir à plusieurs blocs projet. Cette association remplace l'appartenance actuellement portée par `competencies.blockId`.

### 2.3 Exigences de compétences des postes projet

Adapter `position_competency_requirements` pour référencer la compétence globale et vérifier son appartenance au bloc via `competency_block_competencies`.

Le niveau `requiredLevel` reste porté par l'exigence propre au poste projet. Il ne revient pas sur la définition globale.

Les lignes d'exigences de la base de test peuvent être supprimées lors de la migration de remise à zéro ; elles seront recréées depuis le nouveau référentiel lorsque les postes projet seront reconfigurés. Ne pas supprimer pour autant les blocs de postes projet ni les mappings BPMN qui n'ont pas de dépendance directe à l'identifiant de compétence.

### 2.4 Blocs de missions des fiches de poste

Créer des tables propres aux fiches de poste. Ne pas réutiliser `competency_blocks`, qui reste le conteneur projet historique :

- `job_position_mission_blocks` : fiche de référence, code stable, intitulé, description, ordre ;
- `job_position_mission_activities` : bloc, texte descriptif, ordre ;
- `job_position_mission_competencies` : bloc, `competencyId`, niveau attendu 1..5 ;
- `job_position_transversal_competencies` : fiche/poste, `competencyId`, niveau attendu 1..5.

Cardinalités métier :
- au maximum quatre blocs par fiche, sans obligation de remplir les quatre ;
- de 0 à 4 activités par bloc (un bloc peut être créé avant que ses activités soient renseignées) ;
- de 1 à 4 compétences par bloc ;
- compétences transversales associées directement à la fiche, sans cinquième bloc.

Les cardinalités entre lignes sont contrôlées dans le service métier et les transactions de sauvegarde. Le parent canonique des blocs reste à confirmer entre `JobFunction` et une éventuelle entité de fiche de poste dédiée ; ne pas créer une duplication par poste permanent si plusieurs postes partagent une même fiche.

## 3. Périmètre de remise à zéro

La migration peut supprimer les données de compétences de test et les associations d'exigences projet, mais doit distinguer les dépendances :

| Élément existant | Traitement retenu |
|---|---|
| `competencies` | Remplacement par le catalogue global ; identifiants régénérés |
| `competencies.blockId` | Supprimé ; remplacé par l'association explicite bloc ↔ compétence |
| `competencies.referenceLevel` | Supprimé ; niveaux portés par les associations |
| `position_competency_requirements` | Données de test supprimées puis modèle adapté au catalogue global |
| `competency_blocks` | Conservé pour le périmètre projet tant que ses usages le nécessitent |
| `position_competency_blocks` | Conservé |
| `position_activity_mappings` | Conservé ; ses liens BPMN vers les blocs ne doivent pas être altérés |
| `job_function_competency_blocks` | Conservé : le service le lit pour rattacher les blocs de compétences à une fonction et initialiser les blocs des postes projet |

L'inspection du service confirme que `listFunctions()` assemble les compétences par `competency_blocks` et que `createProjectPosition()` reprend les liens `job_function_competency_blocks` pour initialiser `position_competency_blocks`. Ces deux tables et leurs liens sont donc des éléments actifs du flux projet, pas des données à effacer avec les compétences. Avant toute suppression, vérifier les FK et usages applicatifs exacts, y compris les migrations, DTO, services, contrôleurs, tests et composants frontend. Une dépendance qui ne porte que sur `blockId` ne doit pas être cassée par la remise à zéro des compétences.

## 4. Ordre d'implémentation

1. **Audit final des consommateurs** : recherche exhaustive de `competencyId`, `competencies`, `blockId`, `referenceLevel`, `requiredLevel`, `jobFunctionCompetencyBlocks` et des relations ORM.
2. **Schéma SQL cible** : définir les nouvelles tables, clés, contraintes, index et règles de suppression.
3. **Migration de test destructive** : supprimer les anciennes définitions et exigences de compétences, créer le catalogue global et les associations explicites ; ne toucher aux données BPMN/mappings que si une dépendance démontrée l'impose.
4. **Backend** : CRUD global, filtres famille/statut, désactivation/réactivation, associations projet et associations fiche de poste.
5. **Frontend** : écran indépendant de gestion du catalogue, sélecteurs de compétences dans les fiches et usages projet.
6. **Tests** : migrations à blanc, contraintes, API, permissions, non-régression des postes projet, mappings BPMN et RACI.
7. **CI** : exécuter sur la branche de travail après les changements applicatifs ; ne pas annoncer de validation avant résultat observé.

## 5. Règles d'intégrité et de comportement

- Une compétence globale peut être associée à plusieurs blocs projet et plusieurs fiches.
- Une compétence utilisée ne peut pas être supprimée physiquement ; elle est désactivée.
- Une compétence inactive reste visible dans les contextes existants, mais n'est pas proposée par défaut pour une nouvelle association.
- Retirer une association ne supprime jamais la compétence globale.
- Les niveaux attendus sont stockés sur chaque association.
- Les familles sont exclusives : méthodologique, technique, fonctionnelle, savoir-être.
- Les tâches opérationnelles restent dans BPMN.
- Les blocs de missions des fiches de poste sont distincts des blocs de compétences projet.
- Aucun changement automatique des affectations, tâches BPMN, Lanes ou RACI n'est induit par la refonte du catalogue.

## 6. Conditions avant migration

La base de test doit être explicitement ciblée et sauvegardée avant exécution. La migration doit refuser de s'exécuter sur une base identifiée comme production. Le caractère « base de test » autorise la perte des anciennes données de compétences, pas une suppression aveugle des autres données métier.

Le résultat attendu après migration est un catalogue global vide ou alimenté avec un jeu de données de référence validé, sans reprise automatique des anciennes compétences. Les exigences projet seront reconfigurées ensuite.

## 7. État de réalisation

Ce document acte la stratégie de remplacement. À ce stade, aucune migration SQL, modification applicative, exécution de test ou CI n'a été effectuée par cette mise à jour documentaire.


## 8. Précision issue de l'inspection du code

L'inspection ciblée de `JobArchitectureService` et des entités ORM confirme les points suivants :

- `listFunctions()` charge `job_function_competency_blocks`, les `competency_blocks` et les compétences, puis construit les données de fonction utilisées par le frontend.
- `createProjectPosition()` reprend les `job_function_competency_blocks` pour créer les `position_competency_blocks` du poste projet.
- `position_activity_mappings` référence `position_competency_blocks` par `(positionId, blockId)`, et non une compétence individuelle.
- `position_competency_requirements` porte une exigence individuelle par compétence ; son `requiredLevel` est distinct du `requiredLevel` porté par `position_competency_blocks`.
- Les correspondances RACI sont stockées séparément dans `position_raci_actor_mappings`.

En conséquence, la migration ne doit pas supprimer `job_function_competency_blocks`, `competency_blocks`, `position_competency_blocks`, `position_activity_mappings` ni les mappings RACI. Elle remplace la définition des compétences et la relation compétence ↔ bloc, et remet à zéro uniquement les exigences individuelles de compétences de la base de test. Les deux niveaux d'exigence (niveau du bloc et niveau de la compétence) restent distincts.


## 9. Fichier de migration SQL

Le premier SQL gardé est disponible dans `backend/migrations/20261126_v0_10_competency_catalog_reset.sql`. Il n'est pas encore branché au Dockerfile ou au Compose de Coolify : le backend doit d'abord être adapté, car il dépend encore de `blockId` et `referenceLevel`. L'intégration et l'activation seront réalisées ensemble pour éviter un déploiement avec schéma et code incompatibles.


## Addendum de cohérence fonctionnelle — décisions du 27 novembre 2026

Les décisions consolidées dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md#10-décisions-de-cadrage-consolidées--27-novembre-2026) prévalent sur toute formulation antérieure de ce document qui leur serait contraire :

- un poste comporte **au maximum quatre responsabilités** (ou blocs de missions), sans obligation d'en remplir quatre ; chaque responsabilité comporte **au maximum quatre activités** ;
- le référentiel d'activités organisationnelles est unique et les activités sont reliées explicitement aux éléments BPMN ; une même activité de référence peut être utilisée par plusieurs éléments BPMN dans plusieurs processus ;
- la responsabilité organisationnelle est portée par le poste et reste distincte des rôles opérationnels RACI ; aucune entrée RACI n'est déduite automatiquement de la fiche de poste ;
- la structure permanente retenue pour le cadrage est **Directions → Postes → Titulaires** ; les services/unités intermédiaires ne sont pas requis à ce stade ;
- le titulaire structurel n'est pas nécessairement l'unique personne qui réalise le travail : une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes. Les affectations opérationnelles doivent être distinguées de la titularisation ;
- le lien entre fonction-type, poste et fiche de poste reste **non arbitré**. Aucune hypothèse de partage, d'héritage ou de personnalisation ne doit être présentée comme une décision acquise.

Les passages ci-dessus constituent un cadrage fonctionnel et ne décrivent pas des capacités techniques déjà livrées. Aucun audit technique V0.10, aucune modification de code et aucune migration ne sont inclus dans cette harmonisation documentaire.
