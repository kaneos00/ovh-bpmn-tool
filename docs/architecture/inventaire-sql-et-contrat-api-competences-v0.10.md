# Inventaire des dépendances et contrat API — référentiel global des compétences

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** cadrage technique à exécuter avant migration destructive de la base de test.

## 1. Décision de reprise

La base est une base de test. Les anciennes compétences, leurs identifiants et leurs exigences de test ne doivent pas être conservés. Le modèle cible remplace directement l'ancien : aucune table de correspondance historique, aucun dédoublonnage ni double écriture.

La migration pourra supprimer les lignes de compétences et d'exigences projet, mais elle ne doit pas supprimer les blocs de postes projet, les mappings d'activités BPMN, les processus, les tâches, les Lanes ou le RACI sans dépendance directe démontrée.

## 2. Dépendances à vérifier dans le code et le schéma

L'ancien modèle comprend notamment :
- `competencies.blockId` vers `competency_blocks` ;
- `competencies.referenceLevel` ;
- `position_competency_requirements`, avec références à `positionId`, `blockId` et `competencyId` ;
- `position_competency_blocks` ;
- `position_activity_mappings`, qui référence un bloc projet et une tâche BPMN ;
- `job_function_competency_blocks`.

La nouvelle architecture doit :
1. retirer `blockId` et `referenceLevel` de la définition globale ;
2. créer une liaison explicite `competency_block_competencies` ;
3. faire référencer les exigences projet à la compétence globale et au bloc via cette liaison ;
4. créer les tables indépendantes des blocs de missions et des associations de compétences de fiche de poste ;
5. conserver `job_function_competency_blocks` : le service l'utilise pour construire les fonctions et initialiser les blocs des postes projet ; ne pas assimiler ses anciens blocs à des blocs de missions.

L'audit doit couvrir ORM/entities, migrations SQL, services, DTO, contrôleurs, tests, composants frontend, appels API et scripts de seed.

## 3. Inventaire SQL en lecture seule

Ces requêtes servent à confirmer les noms de contraintes, tables et règles de suppression sur la base cible. Elles ne préservent pas les anciennes données : elles permettent seulement de vérifier ce qui sera affecté.

### 3.1 Tables et volumes

```sql
SELECT
  (SELECT count(*) FROM competency_blocks) AS competency_blocks,
  (SELECT count(*) FROM competencies) AS competencies,
  (SELECT count(*) FROM position_competency_blocks) AS project_position_blocks,
  (SELECT count(*) FROM position_competency_requirements) AS project_competency_requirements,
  (SELECT count(*) FROM job_function_competency_blocks) AS function_block_links,\n  (SELECT count(*) FROM position_activity_mappings) AS bpmn_activity_mappings;
```

### 3.2 Dépendances de clés étrangères

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.constraint_schema = tc.constraint_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN (
    'competencies',
    'position_competency_requirements',
    'position_competency_blocks',
    'position_activity_mappings',
    'job_function_competency_blocks'
  ) OR ccu.table_name IN ('competencies', 'competency_blocks'))
ORDER BY tc.table_name, tc.constraint_name;
```

### 3.3 Vérifier les associations BPMN à préserver

```sql
SELECT
  count(*) AS mapping_count,
  count(DISTINCT "positionId") AS project_position_count,
  count(DISTINCT "blockId") AS referenced_project_block_count
FROM position_activity_mappings;
```

### 3.4 Vérifier les exigences projet à remettre à zéro

```sql
SELECT
  count(*) AS requirement_count,
  count(DISTINCT "positionId") AS project_position_count,
  count(DISTINCT "blockId") AS project_block_count
FROM position_competency_requirements;
```

## 4. Schéma API cible

Routes proposées, à aligner sur les conventions NestJS et les ACL du dépôt :

| Méthode | Route | Usage |
|---|---|---|
| GET | `/job-architecture/competencies` | Liste paginée, recherche, filtre famille/statut |
| GET | `/job-architecture/competencies/:id` | Détail et usages |
| POST | `/job-architecture/competencies` | Création |
| PATCH | `/job-architecture/competencies/:id` | Modification |
| PATCH | `/job-architecture/competencies/:id/status` | Activation/désactivation |

Champs de création :
- `code` unique global ;
- `name` obligatoire ;
- `description` facultative ;
- `category` obligatoire : `methodological`, `technical`, `functional` ou `behavioral`.

Le DTO global ne contient ni `blockId`, ni niveau attendu.

Filtres de liste : `search`, `category`, `active`, `page`, `pageSize`, tri selon les conventions de l'application.

## 5. Règles API

- Code unique global, vérifié côté serveur.
- Intitulé similaire : avertissement anti-doublon, sans fusion.
- Famille obligatoire et strictement limitée aux quatre valeurs.
- Une compétence utilisée ne peut pas être supprimée physiquement.
- Désactivation sans suppression des associations.
- Les compétences inactives restent consultables et visibles dans les contextes existants, mais sont exclues par défaut des sélecteurs de nouvelles associations.
- Les niveaux sont définis sur les associations projet ou fiche de poste.
- Écriture réservée aux utilisateurs ayant le droit de gérer le référentiel commun.

## 6. Tests d'acceptation

- CRUD et validation des quatre familles.
- Unicité globale du code.
- Avertissement de doublon sur intitulé similaire, sans fusion.
- Recherche, filtres combinés, pagination et tri.
- Désactivation/réactivation sans perte d'associations.
- Refus de suppression physique d'une compétence référencée.
- Association d'une compétence à plusieurs blocs projet.
- Niveau indépendant par association.
- Exigences projet fonctionnelles après remise à zéro et recréation.
- Non-régression des mappings BPMN, tâches, processus, Lanes et RACI.
- Autorisations d'administration vérifiées côté API.

## 7. Étapes avant implémentation

1. Effectuer une recherche exhaustive dans le dépôt des consommateurs des entités et champs cités.
2. Vérifier les contraintes et dépendances sur la base de test.
3. Préparer une sauvegarde et une migration destructive explicitement gardée contre une exécution en production.
4. Implémenter le schéma cible, le backend et les écrans.
5. Exécuter migrations et tests sur la base de test.
6. Relancer le CI et vérifier le résultat.

Aucune requête ci-dessus n'a été exécutée sur la base. Cette mise à jour documentaire n'a modifié ni code applicatif, ni schéma, ni données, ni CI.


## 8. Précision issue de l'inspection du code

`JobArchitectureService.listFunctions()` consomme `job_function_competency_blocks` pour afficher les blocs rattachés à une fonction et les compétences qu'ils contiennent. `createProjectPosition()` consomme ces mêmes liens pour initialiser `position_competency_blocks`. Ils doivent donc être conservés.

`position_activity_mappings` référence un bloc applicable d'un poste projet, pas une compétence. La remise à zéro des compétences ne justifie donc pas la suppression de ces mappings.

Enfin, deux niveaux distincts sont présents : le niveau éventuel du bloc (`position_competency_blocks.requiredLevel`) et le niveau d'une compétence dans ce bloc (`position_competency_requirements.requiredLevel`). La migration ne doit effacer que le second avec les exigences individuelles de test.
