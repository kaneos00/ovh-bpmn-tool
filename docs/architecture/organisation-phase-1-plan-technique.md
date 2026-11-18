# Organisation permanente — plan technique de la phase 1

Ce document décline la phase 1 de l'évolution Organisation à partir de l'état réel du dépôt au 18 novembre 2026. Il ne modifie pas le viewer BPMN, les données RACI, ni les associations des postes projet.

## 1. Constat du dépôt

- Le backend utilise NestJS, TypeORM et PostgreSQL.
- `synchronize: false` est configuré : toute évolution de schéma doit être livrée par une migration SQL versionnée dans `backend/migrations`.
- Les entités TypeORM sont chargées par glob `modules/**/*.ormEntity.{ts,js}`.
- Les routes administratives globales sont protégées par `UseAcl([UserGroup.Admin])`.
- `JobFunctionTypeOrmEntity` est déjà le référentiel des fiches de fonction.
- `ProjectJobPositionTypeOrmEntity` et les mappings RACI/BPMN sont déjà en place dans JobArchitecture.
- La table `app_users` a un identifiant UUID stable et un username ; le sujet de session et les adhésions projet utilisent actuellement le username.
- Le frontend possède déjà un espace `OrganizationAdmin`, AG Grid et `react-d3-tree`.

Conséquence : pas de nouvelle dépendance graphique pour la phase 1. Réutiliser `react-d3-tree` et le design system actuel. L'affectation des personnes utilisera ultérieurement la clé UUID de `app_users`, sans créer un annuaire parallèle.

## 2. Périmètre livré en phase 1

Créer uniquement les postes permanents et leur hiérarchie. Les postes restent indépendants des personnes : aucun titulaire n'est stocké sur le poste lui-même.

### 2.1 Table `organization_positions`

Champs proposés :
- `id uuid primary key`
- `created_by varchar(64) not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `title varchar(255) not null`
- `description text null`
- `function_id uuid null references job_functions(id) on delete set null`
- `parent_position_id uuid null references organization_positions(id) on delete restrict`
- `active boolean not null default true`
- `sort_order integer not null default 0`

Index :
- index sur `parent_position_id`
- index sur `function_id`
- index sur `active`
- contrainte d'interdiction de parent égal à soi-même.

La hiérarchie initiale est un arbre : zéro ou un parent direct par poste. Les liens fonctionnels transverses sont hors phase 1.

### 2.2 Règle anti-cycle

Le service doit vérifier, dans une transaction :
1. que le poste et le parent existent et sont actifs ;
2. que le parent n'est pas le poste lui-même ;
3. que le parent n'est pas un descendant du poste déplacé.

La vérification des descendants se fait par requête récursive PostgreSQL (`WITH RECURSIVE`). La mise à jour du parent ne doit être enregistrée qu'après validation. Les tests couvrent auto-parent, cycle direct, cycle indirect et déplacement valide.

### 2.3 Référence fiche de fonction

`function_id` est facultatif. Il référence directement `job_functions.id` ; aucune copie du nom, de la mission ou des compétences n'est enregistrée dans le poste. L'API renvoie les informations de fiche nécessaires à l'affichage par jointure.

## 3. Contrat API proposé

Toutes les routes sont global-admin, via `UseAcl([UserGroup.Admin])`.

- `GET /organization/positions` : liste ordonnée des postes avec parent et résumé de la fiche de fonction.
- `POST /organization/positions` : création d'un poste.
- `PATCH /organization/positions/:positionId` : modification du libellé, description, fonction, parent, ordre et statut.
- `POST /organization/positions/reorder` : mise à jour groupée des parents et ordres après validation globale, si l'interface nécessite un déplacement groupé.
- `GET /organization/positions/tree` : arborescence dédiée au composant graphique.

Les opérations de suppression physique ne sont pas exposées en première version. Un poste utilisé doit être désactivé, pas supprimé. La désactivation d'un poste parent avec des enfants actifs doit être refusée ou nécessiter la réaffectation préalable de ses enfants.

Les entrées sont validées côté serveur : titre non vide et limité à 255 caractères, description bornée, UUID valides, ordre entier. Les erreurs métier renvoient des messages explicites.

## 4. Interface

Ajouter une section « Organigramme » dans la navigation de l'administration globale, distincte de « Fiches de fonction ».

Vue principale :
- organigramme graphique en premier, occupant l'espace utile ;
- cartes compactes par poste : intitulé, fonction liée, état « Poste à pourvoir » (phase 2 affichera le titulaire) ;
- zoom, recentrage et ajustement à l'écran ;
- clic sur un nœud : ouverture d'un panneau latéral avec détails et actions ;
- légende : poste actif / inactif / poste à pourvoir ;
- état vide avec appel à créer le premier poste.

Administration :
- une grille AG Grid pour les postes, avec recherche, filtres actifs/inactifs, tri, sélection multiple ;
- création/édition dans un panneau latéral, pas de formulaire sous la grille ;
- actions groupées limitées aux opérations sûres (activer/désactiver, changer l'ordre) ;
- le rattachement hiérarchique est modifiable depuis le détail et l'organigramme, avec validation serveur.

Le composant graphique et la grille consomment le même endpoint et la même source de vérité. Pas de données de démonstration ajoutées au démarrage.

## 5. Tests nécessaires

Backend :
- création d'un poste sans fiche de fonction ;
- création avec fiche de fonction existante ;
- refus d'une fiche de fonction inconnue ;
- modification du titre et de la description ;
- refus d'un parent inexistant ;
- refus auto-parent, cycle direct et cycle indirect ;
- déplacement valide entre branches ;
- refus de désactivation d'un parent ayant des enfants actifs, si cette règle est retenue ;
- refus d'accès sans groupe admin.

Frontend :
- route et navigation organigramme ;
- affichage d'une racine, de plusieurs niveaux et d'un poste sans enfant ;
- poste vacant clairement identifié ;
- recherche et filtre ;
- ouverture/fermeture du panneau latéral ;
- état vide et erreurs API ;
- aucun impact sur les routes et composants du viewer BPMN.

## 6. Séquencement de réalisation

1. Migration SQL et entité TypeORM.
2. Service métier avec validations hiérarchiques et tests.
3. Contrôleur et module NestJS.
4. Client API et page Organigramme dans OrganizationAdmin.
5. Tests frontend, lint et build.
6. CI complète sur la branche de fonctionnalité.

Pas de fusion ni de déploiement sans validation explicite.

## 7. Points volontairement reportés

- Affectations nominatives : la clé UUID de `app_users` existe, mais les règles de multi-affectation et d'historisation doivent être traitées dans une phase dédiée.
- Fiches de poste individuelles.
- Lien poste permanent ↔ `ProjectJobPosition`.
- Agrégateur de la page d'accueil personnelle.
- Import initial d'un organigramme depuis un fichier.
- Relations fonctionnelles transverses.
