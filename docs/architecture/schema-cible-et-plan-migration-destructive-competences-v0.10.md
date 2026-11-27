# Schéma cible et plan de migration — compétences et fiches de poste V0.10

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** proposition de schéma détaillée, à valider avant écriture du SQL exécutable.  
**Nature :** cadrage technique ; aucune donnée n'est modifiée par ce document.

## 1. Décisions de modèle

### 1.1 Catalogue global

La table `competencies` devient le catalogue global. On conserve le nom de table et l'identité ORM pour limiter les changements de nom, mais on retire toute dépendance à un bloc :

- `id` UUID PK ;
- `code` varchar(64), unique globalement ;
- `name` varchar(255), obligatoire ;
- `description` text nullable ;
- `category` varchar(24), obligatoire et limitée à `methodological`, `technical`, `functional`, `behavioral` ;
- `active` boolean ;
- colonnes d'audit usuelles.

À retirer de `competencies` :
- `blockId` ;
- `referenceLevel` ;
- index composites historiques basés sur `blockId`.

Il ne reste aucun niveau de référence sur la définition globale.

### 1.2 Association globale ↔ bloc de compétences projet

Créer `competency_block_competencies` :

- `id` UUID PK et colonnes d'audit ;
- `blockId` UUID NOT NULL → `competency_blocks(id)` ON DELETE CASCADE ;
- `competencyId` UUID NOT NULL → `competencies(id)` ON DELETE RESTRICT ;
- `sortOrder` integer NOT NULL DEFAULT 0 ;
- UNIQUE (`blockId`, `competencyId`) ;
- index sur `competencyId`.

Une compétence peut être associée à plusieurs blocs projet. Retirer un lien ne supprime pas la compétence. Un bloc projet ne peut pas être supprimé si un poste projet ou un mapping BPMN en dépend (règles existantes à conserver).

### 1.3 Exigences de compétences des postes projet

Conserver `position_competency_requirements`, mais changer ses contraintes :

- `positionId` UUID ;
- `blockId` UUID ;
- `competencyId` UUID ;
- `requiredLevel` smallint nullable, CHECK 1..5 ;
- colonnes d'audit.

FK (`positionId`, `blockId`) → `position_competency_blocks(positionId, blockId)` ON DELETE CASCADE.

FK (`blockId`, `competencyId`) → `competency_block_competencies(blockId, competencyId)` ON DELETE RESTRICT.

Nouvelle unicité : UNIQUE (`positionId`, `blockId`, `competencyId`). Cela permet à une même compétence d'être exigée dans deux blocs différents du même poste, avec des niveaux distincts.

Le niveau de bloc `position_competency_blocks.requiredLevel` reste distinct du niveau de compétence `position_competency_requirements.requiredLevel`.

### 1.4 Fiche de poste de référence : JobFunction

L'inspection confirme que :
- `OrganizationPosition.functionId` pointe vers `JobFunction` ;
- `JobFunction` porte déjà la finalité (`mission`), le code, le nom et les métadonnées documentaires ;
- plusieurs postes permanents peuvent réutiliser une même fonction de référence.

Hypothèse technique historique, **non arbitrée fonctionnellement** : le rattachement des blocs à `JobFunction` et son assimilation à une fiche de poste ne doivent pas être considérés comme une décision métier. Le lien entre fonction-type, poste et fiche de poste reste à décider. Aucune conclusion de ce document ne doit préempter cet arbitrage.

Les adaptations propres à une organisation ou à un poste permanent ne sont pas introduites dans cette migration ; elles feront l'objet d'un besoin séparé si elles deviennent nécessaires.

Créer les tables suivantes :

#### `job_function_mission_blocks`

- `id` UUID PK ;
- `functionId` UUID NOT NULL → `job_functions(id)` ON DELETE CASCADE ;
- `code` varchar(64) NOT NULL ;
- `title` varchar(255) NOT NULL ;
- `description` text nullable ;
- `sortOrder` integer NOT NULL ;
- UNIQUE (`functionId`, `code`) ;
- UNIQUE (`functionId`, `sortOrder`).

La règle fonctionnelle est un maximum de quatre blocs par poste, sans obligation de remplir les quatre. Les éventuels codes et ordres ne concernent que les blocs effectivement créés et restent à définir après arbitrage du modèle fonction-type/poste/fiche. Une contrainte SQL différée/triggers pour exactement quatre blocs est à éviter à ce stade : la cardinalité sera validée par la transaction de sauvegarde globale.

#### `job_function_mission_activities`

- `id` UUID PK ;
- `missionBlockId` UUID NOT NULL → `job_function_mission_blocks(id)` ON DELETE CASCADE ;
- `description` text NOT NULL ;
- `sortOrder` integer NOT NULL ;
- UNIQUE (`missionBlockId`, `sortOrder`).

La règle fonctionnelle est au maximum quatre activités par responsabilité/bloc, sans obligation d'en définir quatre. Elles ne constituent pas un catalogue de tâches opérationnelles.

#### `job_function_mission_competencies`

- `id` UUID PK ;
- `missionBlockId` UUID NOT NULL → `job_function_mission_blocks(id)` ON DELETE CASCADE ;
- `competencyId` UUID NOT NULL → `competencies(id)` ON DELETE RESTRICT ;
- `requiredLevel` smallint NOT NULL CHECK 1..5 ;
- `sortOrder` integer NOT NULL DEFAULT 0 ;
- UNIQUE (`missionBlockId`, `competencyId`).

Le service impose 1 à 4 compétences par bloc.

#### `job_function_transversal_competencies`

- `id` UUID PK ;
- `functionId` UUID NOT NULL → `job_functions(id)` ON DELETE CASCADE ;
- `competencyId` UUID NOT NULL → `competencies(id)` ON DELETE RESTRICT ;
- `requiredLevel` smallint NOT NULL CHECK 1..5 ;
- `sortOrder` integer NOT NULL DEFAULT 0 ;
- UNIQUE (`functionId`, `competencyId`).

Les compétences transversales sont directement rattachées à la fiche, hors des quatre blocs.

### 1.5 Sections descriptives existantes

`job_function_activity_sections` et `job_function_custom_sections` ne sont pas supprimées dans cette migration. Leur usage actuel doit rester lisible tant que l'écran existant les consomme. Les nouvelles tables de responsabilités/blocs de missions constituent la structure métier cible, dans la limite de quatre responsabilités par poste ; aucune conversion automatique de `tasks: string[]` vers des tâches BPMN n'est faite.

La suppression ou la dépréciation des anciennes sections sera traitée dans une étape UI/API ultérieure, après migration des écrans et validation fonctionnelle.

## 2. Dépendances à préserver

La migration ne doit pas supprimer ni recréer :
- `competency_blocks` ;
- `job_function_competency_blocks` ;
- `position_competency_blocks` ;
- `position_activity_mappings` ;
- `position_raci_actor_mappings` ;
- `project_job_positions` ;
- `project_processes`, ressources, contenus BPMN et tâches ;
- `job_functions`, `organization_positions`, affectations et relations hiérarchiques.

La table `job_function_competency_blocks` reste utilisée par `listFunctions()` et `createProjectPosition()` pour présenter et initialiser les blocs de compétences projet. Elle ne représente pas les blocs de missions de fiche de poste.

## 3. Migration de remplacement — séquence SQL

Le SQL exécutable devra être préparé en une transaction, sous réserve de compatibilité des opérations DDL avec le moteur de migration utilisé :

1. Vérifier la base ciblée, la garde destructive et les préconditions.
2. Prendre/faire confirmer une sauvegarde externe de la base de test.
3. Supprimer les anciennes lignes de `position_competency_requirements` (données de test).
4. Retirer les FK de cette table vers `competencies` et les index uniques historiques.
5. Supprimer les anciennes lignes de `competencies`.
6. Retirer `blockId`, `referenceLevel` et les contraintes/index associés.
7. Ajouter l'unicité globale de `competencies.code` et la contrainte des quatre familles.
8. Créer `competency_block_competencies`.
9. Recréer les FK et index de `position_competency_requirements` selon le modèle cible.
10. Créer les quatre tables de fiche de poste.
11. Vérifier que les tables projet/BPMN/RACI préservées existent toujours et que leurs volumes n'ont pas changé.
12. Commit de la transaction.

Aucun seed automatique des anciennes compétences. Le catalogue reste vide jusqu'à création contrôlée des compétences de référence.

## 4. Garde destructive obligatoire

Ne pas se contenter de vérifier que le nom de la base contient `test` : cette convention n'est pas établie dans le dépôt.

Avant de rendre la migration exécutable, choisir un mécanisme explicite et vérifiable :
- variable d'environnement dédiée au déploiement de test, par exemple `ALLOW_DESTRUCTIVE_COMPETENCY_RESET=true` ;
- validation côté runner avant d'appeler le SQL ;
- et garde SQL par paramètre de session obligatoire, par exemple `app.allow_test_competency_reset = 'true'`.

La migration doit échouer par défaut si le marqueur n'est pas défini. Il faut également documenter le nom/identifiant réel de la base de test et exclure explicitement la base de production dans la configuration de déploiement. Ces valeurs ne sont pas connues à ce stade : ne pas les inventer.

La sauvegarde doit être réalisée hors transaction et confirmée avant lancement ; elle ne doit pas être simulée par un simple dump dans un conteneur éphémère.

## 5. Conséquences backend à traiter en même temps que le schéma

- `CompetencyTypeOrmEntity` : retirer `blockId` et `referenceLevel`, ajouter l'unicité globale du code et les quatre valeurs de catégorie.
- Ajouter `CompetencyBlockCompetencyTypeOrmEntity`.
- Adapter `PositionCompetencyRequirementTypeOrmEntity` et le repository/service pour joindre les compétences via la table de liaison.
- `listFunctions()` : ne plus regrouper les compétences via `competency.blockId`; charger les associations bloc ↔ compétence.
- `createCompetency(blockId, ...)` : remplacer par création globale puis association explicite, ou séparer les deux opérations.
- Contrôleur : exposer le CRUD global `/job-architecture/competencies` et les opérations d'association bloc/compétence.
- Les API des exigences projet doivent valider qu'une compétence est liée au bloc du poste.
- La désactivation d'une compétence ne supprime ni association ni exigence existante.
- Les nouvelles entités de fiche de poste doivent être déclarées dans les modules TypeORM et les tests.

## 6. Tests de migration et de non-régression

Avant de considérer le chantier validé :
- migration sur une copie de la base de test ;
- migration refusée sans marqueur de sécurité ;
- migration refusée sur la configuration de production ;
- absence de données historiques de compétences après remise à zéro ;
- intégrité de `job_function_competency_blocks` ;
- intégrité des `position_competency_blocks` et de leurs niveaux ;
- intégrité des `position_activity_mappings` et de leurs clés BPMN ;
- intégrité des mappings RACI ;
- association d'une compétence globale à plusieurs blocs ;
- même compétence associée à plusieurs blocs d'un poste avec niveaux indépendants ;
- désactivation sans perte des usages ;
- cardinalités : au maximum quatre responsabilités et quatre activités par responsabilité ; cardinalités de compétences à conserver selon le référentiel de compétences ;
- tests API/ACL et CI complet.

## 7. Points non réalisés

Ce document ne crée pas encore le fichier SQL exécutable, les entités TypeORM ou les API. Le nom exact de la base de test et le mécanisme de sauvegarde ne sont pas établis. La migration destructive ne doit pas être lancée avant ces prérequis.


## 8. Fichier SQL préparé et statut d'intégration

Un premier fichier SQL gardé a été créé :
`backend/migrations/20261126_v0_10_competency_catalog_reset.sql`.

Il :
- exige les paramètres psql `allow_destructive_competency_reset=true` et `expected_database=<nom exact>` ;
- vérifie que le nom de base courant correspond au nom explicitement attendu ;
- refuse les bases système ;
- vérifie la présence des tables source attendues ;
- échoue si une table non examinée référence directement `competencies` ;
- supprime les anciennes compétences et exigences individuelles ;
- crée le catalogue global, les associations bloc/compétence et les tables de missions ;
- laisse les blocs projet, leur applicabilité, les mappings BPMN et RACI intacts.

**Le fichier n'est pas encore intégré au conteneur de migrations ni à `compose.yaml`.** C'est intentionnel : le backend actuel lit encore `competency.blockId` et `competency.referenceLevel`. Brancher ou exécuter le SQL avant la mise à jour des entités et services rendrait l'application incompatible avec le schéma. L'intégration Coolify sera faite dans la même tranche que le backend cible, avec une activation explicite et un nom de base de test confirmé.


## Addendum de cohérence fonctionnelle — décisions du 27 novembre 2026

Les décisions consolidées dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md#10-décisions-de-cadrage-consolidées--27-novembre-2026) prévalent sur toute formulation antérieure de ce document qui leur serait contraire :

- un poste comporte **au maximum quatre responsabilités** (ou blocs de missions), sans obligation d'en remplir quatre ; chaque responsabilité comporte **au maximum quatre activités** ;
- le référentiel d'activités organisationnelles est unique et les activités sont reliées explicitement aux éléments BPMN ; une même activité de référence peut être utilisée par plusieurs éléments BPMN dans plusieurs processus ;
- la responsabilité organisationnelle est portée par le poste et reste distincte des rôles opérationnels RACI ; aucune entrée RACI n'est déduite automatiquement de la fiche de poste ;
- la structure permanente retenue pour le cadrage est **Directions → Postes → Titulaires** ; les services/unités intermédiaires ne sont pas requis à ce stade ;
- le titulaire structurel n'est pas nécessairement l'unique personne qui réalise le travail : une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes. Les affectations opérationnelles doivent être distinguées de la titularisation ;
- le lien entre fonction-type, poste et fiche de poste reste **non arbitré**. Aucune hypothèse de partage, d'héritage ou de personnalisation ne doit être présentée comme une décision acquise.

Les passages ci-dessus constituent un cadrage fonctionnel et ne décrivent pas des capacités techniques déjà livrées. Aucun audit technique V0.10, aucune modification de code et aucune migration ne sont inclus dans cette harmonisation documentaire.
