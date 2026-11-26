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
- exactement quatre blocs par fiche ;
- de 1 à 4 activités descriptives par bloc ;
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
| `job_function_competency_blocks` | À supprimer ou remplacer après audit des consommateurs ; ne pas le convertir automatiquement en bloc de mission |

Avant toute suppression, vérifier les FK et usages applicatifs exacts, y compris les migrations, DTO, services, contrôleurs, tests et composants frontend. Une dépendance qui ne porte que sur `blockId` ne doit pas être cassée par la remise à zéro des compétences.

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
