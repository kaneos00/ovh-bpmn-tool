# Étape suivante — inventaire SQL en lecture seule et contrat du référentiel des compétences

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** préparation à exécuter sur une base de test représentative.  
**Important :** les requêtes ci-dessous n'effectuent aucune écriture. Elles doivent être exécutées par un opérateur autorisé sur une base de test restaurée depuis une sauvegarde récente. Aucun accès à une base applicative n'a été effectué pendant cette préparation.

## 1. Objectif de l'inventaire

Établir les faits avant de concevoir la migration :
- volumes des compétences et blocs ;
- collisions de codes et intitulés identiques ;
- familles présentes ou inattendues ;
- valeurs de niveau historiques ;
- dépendances des exigences de postes projet ;
- compétences inactives et associations projet.

Exporter les résultats avec les identifiants pour permettre une revue métier. Ne pas fusionner les lignes automatiquement.

## 2. Requêtes SQL de diagnostic (PostgreSQL)

### 2.1 Volumes globaux

```sql
SELECT
  (SELECT count(*) FROM competency_blocks) AS competency_blocks,
  (SELECT count(*) FROM competencies) AS competencies,
  (SELECT count(*) FROM position_competency_blocks) AS project_position_blocks,
  (SELECT count(*) FROM position_competency_requirements) AS project_competency_requirements,
  (SELECT count(*) FROM job_function_competency_blocks) AS function_block_links;
```

### 2.2 Répartition par famille et statut

```sql
SELECT category, active, count(*) AS competency_count
FROM competencies
GROUP BY category, active
ORDER BY category, active;
```

### 2.3 Inventaire complet avec usages et niveaux historiques

```sql
SELECT
  c.id AS competency_id,
  c.code,
  c.name,
  c.description,
  c.category,
  c.active,
  c."referenceLevel",
  b.id AS legacy_block_id,
  b.code AS legacy_block_code,
  b.name AS legacy_block_name,
  count(DISTINCT r.id) AS project_requirement_count,
  count(DISTINCT r."positionId") AS project_position_count,
  min(r."requiredLevel") AS min_project_required_level,
  max(r."requiredLevel") AS max_project_required_level
FROM competencies c
JOIN competency_blocks b ON b.id = c."blockId"
LEFT JOIN position_competency_requirements r ON r."competencyId" = c.id
GROUP BY c.id, b.id
ORDER BY lower(c.name), c.code, b.code;
```

### 2.4 Codes répétés entre blocs (candidats à revue, pas des doublons certains)

```sql
SELECT
  lower(trim(c.code)) AS normalized_code,
  count(*) AS row_count,
  count(DISTINCT c."blockId") AS block_count,
  array_agg(c.id::text ORDER BY c.id) AS competency_ids,
  array_agg(b.code ORDER BY b.code) AS legacy_block_codes,
  array_agg(c.name ORDER BY c.name) AS names
FROM competencies c
JOIN competency_blocks b ON b.id = c."blockId"
GROUP BY lower(trim(c.code))
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_code;
```

### 2.5 Intitulés identiques après normalisation (candidats à revue)

```sql
SELECT
  lower(regexp_replace(trim(c.name), '\\s+', ' ', 'g')) AS normalized_name,
  count(*) AS row_count,
  array_agg(c.id::text ORDER BY c.id) AS competency_ids,
  array_agg(c.code ORDER BY c.code) AS codes,
  array_agg(b.code ORDER BY b.code) AS legacy_block_codes,
  array_agg(c.category ORDER BY c.category) AS categories
FROM competencies c
JOIN competency_blocks b ON b.id = c."blockId"
GROUP BY lower(regexp_replace(trim(c.name), '\\s+', ' ', 'g'))
HAVING count(*) > 1
ORDER BY row_count DESC, normalized_name;
```

### 2.6 Familles et niveaux inattendus

```sql
SELECT id, code, name, category
FROM competencies
WHERE category NOT IN ('technical', 'methodological', 'behavioral')
ORDER BY category, code;

SELECT id, code, name, "referenceLevel"
FROM competencies
WHERE "referenceLevel" IS NOT NULL
  AND "referenceLevel" NOT BETWEEN 1 AND 5
ORDER BY code;

SELECT id, "positionId", "blockId", "competencyId", "requiredLevel"
FROM position_competency_requirements
WHERE "requiredLevel" IS NOT NULL
  AND "requiredLevel" NOT BETWEEN 1 AND 5
ORDER BY "positionId", "blockId", "competencyId";
```

### 2.7 Références orphelines et intégrité des relations

Les contraintes FK sont normalement censées empêcher les orphelins. Ces requêtes servent de contrôle préalable :

```sql
SELECT r.*
FROM position_competency_requirements r
LEFT JOIN competencies c ON c.id = r."competencyId"
LEFT JOIN position_competency_blocks pb
  ON pb."positionId" = r."positionId" AND pb."blockId" = r."blockId"
WHERE c.id IS NULL OR pb.id IS NULL;

SELECT c.id, c.code, c.name, c."blockId"
FROM competencies c
LEFT JOIN competency_blocks b ON b.id = c."blockId"
WHERE b.id IS NULL;
```

### 2.8 Dépendances FK et règles ON DELETE actuelles

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
    'job_function_competency_blocks'
  ) OR ccu.table_name IN ('competencies', 'competency_blocks'))
ORDER BY tc.table_name, tc.constraint_name;
```

## 3. Livrables attendus de l'inventaire

L'exécution doit produire :
1. un CSV complet des compétences, blocs sources et usages projet ;
2. un CSV des collisions de codes ;
3. un CSV des intitulés identiques normalisés ;
4. un relevé des familles/niveaux atypiques ;
5. un relevé des contraintes FK et règles de suppression ;
6. une synthèse des volumes.

La revue métier classe chaque collision dans une des catégories : même compétence à fusionner, compétences différentes à conserver, intitulé/code à corriger, ou cas à investiguer. Toute fusion doit produire une table de correspondance ancienne identité → identité cible et un accord explicite.

## 4. Contrat API cible — référentiel global

Les routes ci-dessous sont une proposition de contrat, à aligner sur les conventions NestJS/DTO/authentification déjà utilisées dans le backend avant implémentation.

| Méthode | Route proposée | Usage |
|---|---|---|
| GET | `/job-architecture/competencies` | Liste paginée, recherche, filtre famille/statut |
| GET | `/job-architecture/competencies/:id` | Détail et usages |
| POST | `/job-architecture/competencies` | Création |
| PATCH | `/job-architecture/competencies/:id` | Modification des champs descriptifs et famille |
| PATCH | `/job-architecture/competencies/:id/status` | Activation/désactivation explicite |

Paramètres de liste proposés :
- `search` : recherche sur code, intitulé et description ;
- `category` : une des quatre familles ;
- `active` : true/false ;
- `page`, `pageSize` ;
- tri selon les conventions communes de l'application.

Champs de création :
- `code` ;
- `name` ;
- `description` ;
- `category` obligatoire : `methodological`, `technical`, `functional` ou `behavioral`.

Le niveau attendu et le bloc ne font pas partie du DTO de création global.

## 5. Règles de validation API

- Code global unique après traitement explicite des collisions historiques.
- Intitulé obligatoire ; description facultative.
- Famille obligatoire et strictement limitée aux quatre valeurs.
- Refuser une création dont le code est déjà utilisé ; signaler les intitulés identiques/proches comme avertissement de doublon potentiel, sans fusion.
- Une compétence utilisée ne peut pas être supprimée physiquement.
- La désactivation conserve toutes les associations et références projet.
- Une compétence inactive reste consultable et modifiable ; elle est exclue par défaut des recherches de sélection pour une nouvelle association.
- Une association historique existante reste valide même si sa compétence est inactive.
- Les changements de famille ou d'intitulé n'altèrent pas les identifiants ni les associations.
- Toute opération d'écriture exige l'autorisation de gestion du référentiel commun, à distinguer du simple accès Viewer aux projets.

## 6. Contrat de réponse liste proposé

Chaque ligne de liste doit exposer :
- `id`, `code`, `name`, `description`, `category`, `active` ;
- `usageCount` (nombre d'associations, tous contextes confondus) ;
- éventuellement `projectUsageCount` et `jobProfileUsageCount` si ces compteurs sont calculables efficacement.

Le nombre d'utilisations est informatif ; les suppressions et désactivations doivent rester contrôlées côté serveur, pas seulement par l'interface.

## 7. Critères de tests API

- CRUD complet avec les quatre familles et validation des valeurs inconnues.
- Code en doublon refusé de manière déterministe.
- Intitulé similaire signalé mais non fusionné.
- Recherche et filtres combinés, pagination et tri stables.
- Désactivation d'une compétence utilisée sans perte d'associations.
- Réactivation sans recréation d'associations.
- Refus de suppression physique d'une compétence référencée.
- Maintien de la lecture des exigences projet existantes.
- Refus d'écriture pour un utilisateur sans droit d'administration du référentiel.
- Contrôle de non-régression des routes et écrans existants de fonctions/postes projet.

## 8. Limites et prochaine action

Les requêtes sont préparées mais **n'ont pas été exécutées** : aucune connexion DB ni copie de données n'est disponible dans cette tâche. Il faut faire exécuter ces SELECT sur une base de test représentative, puis verser les résultats (CSV ou synthèse) dans la revue d'architecture.

Après cette revue, l'ordre recommandé est :
1. confirmer le modèle de reprise à partir des données réelles ;
2. figer les DTO et permissions selon les conventions backend ;
3. implémenter le CRUD et ses tests ;
4. réaliser les migrations additives uniquement lorsque les données et dépendances sont connues.

Aucun code applicatif, schéma SQL ou donnée n'est modifié par ce document.
