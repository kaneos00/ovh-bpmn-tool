# Proposition technique détaillée — transition vers le référentiel global des compétences

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** proposition technique à valider après inventaire des données ; ce document ne constitue pas une migration exécutable.

## 1. Décision de prudence

Le modèle actuel ne peut pas devenir global par simple suppression de `competencies.blockId` : les exigences projet ont une FK composite vers `competencies(blockId,id)`, et les mappings BPMN dépendent des blocs projet.

La stratégie la plus sûre est une transition en deux identités :
- conserver temporairement les compétences historiques et leurs identifiants dans `competencies` ;
- introduire un catalogue global indépendant ;
- établir une correspondance explicite entre chaque compétence historique et une entrée du catalogue global ;
- migrer les lecteurs/écrivains projet après validation de cette correspondance ;
- ne retirer les anciennes contraintes qu'en toute dernière étape.

Cela évite de tenter une fusion implicite des compétences qui partagent actuellement un code ou un libellé.

## 2. Schéma cible proposé

### 2.1 Catalogue global

Nouvelle table conceptuelle `competency_catalog` :
- `id` UUID PK ;
- `code` varchar(64), unique après résolution des collisions ;
- `name` varchar(255) ;
- `description` text nullable ;
- `category` varchar(24), contrainte sur `technical`, `methodological`, `functional`, `behavioral` ;
- `active` boolean ;
- colonnes d'audit usuelles.

Le niveau de référence ne doit pas être porté ici. Le niveau attendu est défini par les associations.

### 2.2 Correspondance historique

Nouvelle table conceptuelle `legacy_competency_catalog_links` :
- `legacyCompetencyId` UUID PK/FK vers `competencies(id)` ;
- `catalogCompetencyId` UUID FK vers `competency_catalog(id)` ;
- colonnes d'audit.

Règle initiale : chaque compétence historique reçoit sa propre entrée catalogue, sans dédoublonnage automatique. Plusieurs compétences historiques pourront pointer vers une même entrée catalogue uniquement après décision métier explicite et documentée.

Cette table rend la reprise traçable et permet de conserver les identifiants utilisés dans les exigences projet pendant la transition.

### 2.3 Appartenance aux anciens blocs projet

Nouvelle table conceptuelle `competency_block_catalog_links` :
- `blockId` UUID FK vers `competency_blocks(id)` ;
- `catalogCompetencyId` UUID FK vers `competency_catalog(id)` ;
- contrainte unique `(blockId, catalogCompetencyId)`.

Elle remplace progressivement l'appartenance implicite portée par `competencies.blockId`. Pendant la coexistence, elle est alimentée à partir de `competencies.blockId` via la correspondance historique.

### 2.4 Exigences de compétences des postes projet

Pendant la première phase, conserver intégralement `position_competency_requirements` et ses FK actuelles. Ne pas supprimer ni modifier les FK composites dans la migration additive initiale.

Après bascule applicative et validation :
- ajouter une référence `catalogCompetencyId` à l'exigence (ou créer une table de remplacement dédiée) ;
- vérifier l'appartenance au bloc via `competency_block_catalog_links` ;
- conserver `requiredLevel` comme niveau spécifique au poste projet ;
- préserver la traçabilité vers l'identifiant historique.

Le choix entre ajout de colonne et table de remplacement dépendra du besoin de conserver plusieurs versions d'une exigence et des conventions de migration du dépôt. Ne pas trancher sans examiner les usages complets et les données.

### 2.5 Blocs de missions des fiches de poste

Créer des tables distinctes, sans réutiliser `competency_blocks` :
- `job_position_mission_blocks` : fiche de référence, code stable, intitulé, description, ordre ;
- `job_position_mission_activities` : bloc, texte descriptif, ordre ;
- `job_position_mission_competencies` : bloc, `catalogCompetencyId`, niveau attendu 1..5 ;
- `job_position_transversal_competencies` : fiche/poste, `catalogCompetencyId`, niveau attendu 1..5.

Les cardinalités (exactement quatre blocs, 1–4 activités et 1–4 compétences par bloc) doivent être validées dans le service métier et les transactions de sauvegarde. Les contraintes SQL simples ne suffisent pas à imposer proprement des cardinalités entre lignes ; un contrôle de service transactionnel est préférable.

Le parent exact des blocs de missions reste à confirmer : `JobFunction` est aujourd'hui la fiche/fonction de référence, tandis que `OrganizationPosition.functionId` la référence depuis le poste permanent. La conception doit éviter de dupliquer les quatre blocs pour chaque poste permanent si plusieurs postes partagent une même fiche.

## 3. Plan de transition par migrations

### Migration 1 — extension additive et non destructive
- créer le catalogue global ;
- créer les liens entre compétences historiques et catalogue ;
- créer les liens entre blocs projet et catalogue ;
- créer les tables des blocs de missions et associations de fiche ;
- ajouter les index et FK sans supprimer les anciens ;
- initialiser les correspondances historiques en conservant une entrée catalogue par compétence historique.

### Migration 2 — bascule du référentiel global
- exposer le CRUD du catalogue global ;
- adapter les sélecteurs des fiches de poste au catalogue ;
- adapter la lecture des blocs projet via les liens explicites ;
- écrire les liens historiques et globaux de manière cohérente pendant la période de coexistence ;
- ajouter les tests de non-régression sur exigences projet et mappings BPMN.

### Migration 3 — bascule des exigences projet
- migrer les exigences vers l'identifiant catalogue ;
- contrôler le nombre de lignes, les niveaux et les associations bloc/compétence avant et après ;
- activer les nouvelles FK/contraintes ;
- garder les colonnes et tables historiques en lecture seule pendant une période de vérification.

### Migration 4 — retrait différé
Uniquement après recherche exhaustive du code, validation des données et preuve qu'aucun consommateur n'utilise encore les anciens liens :
- retirer les anciennes FK composites ;
- retirer `competencies.blockId` et éventuellement la table historique si la politique de conservation le permet ;
- retirer `referenceLevel` après migration de tous ses consommateurs ;
- conserver une table de correspondance/audit si elle est nécessaire à la traçabilité.

## 4. Invariants et contrôles obligatoires

Avant/après chaque migration, comparer :
- nombre de compétences historiques ;
- nombre d'entrées catalogue ;
- nombre de liens historiques et liens bloc/catalogue ;
- nombre d'exigences projet ;
- nombre de mappings BPMN ;
- distribution des niveaux attendus ;
- distribution des familles et statuts ;
- nombre d'orphelins dans chaque relation.

Contrôles fonctionnels :
- une compétence globale peut être utilisée par plusieurs blocs projet et plusieurs fiches de poste ;
- désactiver une compétence ne supprime aucune association ni exigence historique ;
- une compétence inactive reste visible dans les contextes historiques ;
- aucune compétence inactive n'est proposée pour une nouvelle association par défaut ;
- un changement de famille ou de libellé ne change pas l'identité de la compétence ;
- les niveaux restent attachés à chaque association ;
- les quatre blocs de mission ne sont jamais confondus avec les blocs de compétences projet ;
- les mappings BPMN et le RACI ne sont ni recalculés ni déduits par cette migration.

## 5. Risques à traiter avant de coder

1. **Doublons métier :** plusieurs lignes historiques peuvent décrire la même compétence ; ne pas fusionner automatiquement.
2. **Codes répétés :** l'unicité actuelle est par bloc, alors que le catalogue demande une unicité globale. Il faut une règle de recodification ou de fusion validée.
3. **Familles historiques :** les valeurs actuelles ne couvrent pas Fonctionnelle ; le reclassement doit être humainement validé.
4. **Cascades SQL :** les FK existantes peuvent supprimer les exigences projet lorsqu'une compétence est supprimée. Le futur catalogue et ses liens doivent privilégier `RESTRICT`/désactivation plutôt que cascade destructive.
5. **Concurrence d'écriture :** pendant la coexistence, définir une seule source de vérité et une stratégie de double-écriture transactionnelle ; éviter les doubles écritures indépendantes depuis le frontend.
6. **Réversibilité :** documenter le rollback avant chaque bascule. Une fusion de compétences n'est pas réversible sans table de correspondance et historique des décisions.

## 6. Décisions restant ouvertes

- Validation du nom et de la structure physique des tables.
- Politique d'unicité du code global : obligatoire ou code interne généré, avec libellé comme donnée de recherche.
- Choix d'un parent canonique pour les blocs de missions : `JobFunction` ou nouvelle entité explicite `JobPositionReference`.
- Stratégie de migration des exigences projet : ajout de colonne ou table de remplacement.
- Règles d'archivage des anciennes compétences et conservation de la correspondance.
- Résultat de la recherche exhaustive locale `rg` et inventaire réel d'une base représentative.

## 7. Hors périmètre de cette proposition

Aucune migration SQL exécutable n'est fournie ici. Aucun code applicatif, aucune base réelle et aucun pipeline CI n'ont été modifiés ou exécutés. Cette proposition sert à cadrer le modèle avant le schéma définitif.
