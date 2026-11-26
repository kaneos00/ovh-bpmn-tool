# Décision d’architecture proposée — modèle cible des compétences et reprise V0.10

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** proposition d’architecture préparatoire à valider avant migration.  
**Périmètre :** référentiel global des compétences, blocs de missions des fiches de poste et compatibilité des exigences de compétences projet.

## 1. Décision structurante

Il faut distinguer deux notions qui portent aujourd’hui des noms proches :

- Les `CompetencyBlock` existants sont des conteneurs de compétences utilisés par le modèle projet (`PositionCompetencyBlock`, `PositionCompetencyRequirement`, mappings d’activités).
- Les quatre blocs de missions décidés pour une fiche de poste sont des regroupements de contributions habituelles, avec activités descriptives et compétences attendues.

**Ces deux objets ne doivent pas être fusionnés ni renommés l’un en l’autre.** Les blocs existants sont conservés pour la compatibilité du périmètre projet pendant la transition. Les blocs de missions des fiches de poste auront leur propre modèle.

## 2. Modèle cible recommandé

### 2.1 Compétence globale

Conserver l’identité de l’entité `Competency`, mais faire évoluer sa sémantique vers une définition globale et indépendante de tout bloc.

Champs métier :
- identifiant stable ;
- code de référence (à rendre globalement unique après résolution des collisions existantes) ;
- intitulé ;
- description courte ;
- famille obligatoire et exclusive : `methodological`, `technical`, `functional`, `behavioral` ;
- statut actif/inactif.

Le niveau attendu ne figure pas sur cette définition globale. Il est porté uniquement par les associations.

Aucune étiquette secondaire, famille multiple ou suppression physique d’une compétence utilisée.

### 2.2 Association historique aux blocs de compétences projet

Pour préserver les usages actuels, introduire une association explicite entre un ancien `CompetencyBlock` et une compétence globale (conceptuellement `CompetencyBlockCompetency`).

Cette association reprend l’appartenance actuellement implicite dans `competencies.blockId`. Elle permet à une même compétence globale d’être référencée depuis plusieurs blocs projet, sans dupliquer sa définition.

Les contraintes d’intégrité des exigences projet doivent désormais vérifier :
- que le bloc projet sélectionné est bien celui de l’exigence ;
- que la compétence est autorisée dans ce bloc via l’association ;
- que l’identifiant de compétence existe globalement.

Les tables et contrats projet existants ne doivent pas être supprimés avant migration et tests de compatibilité.

### 2.3 Blocs de missions des fiches de poste

Créer un modèle distinct de bloc de missions, rattaché à la fiche de poste de référence (la relation exacte entre `JobFunction` et `OrganizationPosition` reste à confirmer dans le cadrage métier).

Chaque fiche comporte exactement quatre blocs, avec :
- code stable (ex. `CDP-1` à `CDP-4`) ;
- intitulé ;
- description courte ;
- ordre d’affichage ;
- 1 à 4 activités descriptives.

Les activités sont du texte descriptif de la contribution habituelle. Elles ne créent pas un catalogue de tâches opérationnelles : les tâches exécutables restent dans BPMN.

### 2.4 Associations de compétences de fiche de poste

Deux associations distinctes sont nécessaires :

1. Bloc de missions ↔ compétence globale, avec niveau attendu 1 à 5.
2. Fiche/poste ↔ compétence transversale globale, avec niveau attendu 1 à 5.

Le niveau attendu est enregistré sur chaque association. La même compétence peut avoir un niveau différent selon le bloc ou selon le poste.

Règles :
- 1 à 4 compétences par bloc ;
- une compétence peut être réutilisée dans plusieurs blocs et plusieurs fiches ;
- une compétence transversale est directement associée à la fiche/poste et n’est pas transformée en cinquième bloc ;
- une même compétence ne doit pas être dupliquée dans un même bloc ou dans la même liste transversale ;
- les familles restent exclusives et uniques.

## 3. Stratégie de migration sûre

### Phase A — inventaire préalable obligatoire

Avant toute migration, exécuter sur une base représentative des requêtes d’inventaire qui recensent :
- nombre de compétences par bloc ;
- codes présents dans plusieurs blocs ;
- intitulés identiques ou proches ;
- familles actuellement utilisées et valeurs inattendues ;
- compétences inactives ;
- références depuis `position_competency_requirements` ;
- exigences projet et blocs projet concernés ;
- niveaux `referenceLevel` et `requiredLevel` déjà renseignés.

Produire un export de correspondance avec identifiants source, code, intitulé, bloc source, famille, statut, niveau historique et nombre de références.

**Ne pas dédupliquer automatiquement sur le seul code ou intitulé.** Deux compétences de même nom peuvent avoir un sens différent ; deux noms proches peuvent désigner le même savoir-faire. Toute fusion doit être une décision métier explicite avec table de correspondance traçable.

### Phase B — migration additive

1. Créer la table d’association explicite ancien bloc ↔ compétence globale.
2. Alimenter cette table avec les couples actuellement présents dans `competencies.blockId` et `competencies.id`.
3. Ajouter les quatre valeurs de famille et contrôler les anciennes valeurs.
4. Préparer les contraintes d’intégrité projet basées sur l’association explicite.
5. Créer les tables dédiées aux blocs de missions, activités descriptives, compétences par bloc et compétences transversales.
6. Conserver les identifiants des compétences existantes. Chaque ligne existante devient initialement une définition globale ; aucune fusion de doublons n’est faite à cette étape.

### Phase C — bascule applicative contrôlée

1. Faire lire les compétences globales par le nouveau référentiel.
2. Faire lire les associations bloc projet via la table explicite.
3. Faire écrire les exigences projet avec les contraintes d’intégrité révisées.
4. Migrer les fonctions et leurs blocs de compétences actuels seulement après une table de correspondance validée vers les quatre blocs de missions. Ne pas assimiler automatiquement un ancien bloc de compétences à un bloc de missions.
5. Vérifier les écrans et API projet, les mappings d’activités et les diagnostics.
6. Retirer `competencies.blockId` et les anciennes contraintes composites uniquement dans une migration ultérieure, après preuve que plus aucun code ne les utilise.

Cette transition en plusieurs étapes permet de revenir en arrière avant la suppression des anciennes colonnes et contraintes.

## 4. Familles et reprise des valeurs existantes

Correspondance initiale :
- `technical` → Technique ;
- `methodological` → Méthodologique ;
- `behavioral` → Savoir-être ;
- `functional` → nouvelle famille Fonctionnelle.

Les compétences existantes ne doivent pas être automatiquement reclassées en Fonctionnelle sur la base de leur nom. La famille Fonctionnelle est disponible pour les nouvelles créations et pour le reclassement contrôlé des compétences existantes après revue.

## 5. Traitement des niveaux

- `referenceLevel` est aujourd’hui porté par la définition globale : ce champ ne doit plus être la source de vérité.
- Les `requiredLevel` existants sur les exigences projet restent des exigences propres au poste projet et doivent être préservés.
- Les niveaux attendus des fiches de poste sont créés sur les associations bloc ↔ compétence et poste ↔ compétence transversale.
- Ne pas recopier mécaniquement un `referenceLevel` historique vers toutes les nouvelles associations. Il peut servir de valeur de reprise proposée, avec validation, mais ne doit pas être considéré comme vérité universelle.
- Les valeurs nulles existantes doivent rester nulles jusqu’à décision explicite ; ne pas inventer un niveau.

## 6. Suppression, désactivation et historique

- Une compétence référencée ne peut pas être supprimée physiquement.
- La désactivation conserve la définition, les associations et les historiques.
- Une compétence inactive reste affichable sur les fiches et exigences existantes, mais est exclue par défaut des sélecteurs de nouvelles associations.
- La réactivation rétablit sa disponibilité sans recréer ses associations.
- Les associations retirées d’une fiche ne doivent pas supprimer la compétence globale.
- Les anciennes contraintes `ON DELETE CASCADE` touchant les compétences et exigences projet doivent être révisées pour empêcher une suppression accidentelle de l’historique.

## 7. Points à confirmer avant migration

Les points suivants restent à décider après inventaire, sans bloquer la préparation des écrans :

1. Relation canonique entre `JobFunction` (fiche de référence) et `OrganizationPosition` (poste permanent) : une fiche réutilisable par plusieurs postes est l’hypothèse recommandée.
2. Politique de code global des compétences et résolution des codes actuellement répétés dans plusieurs blocs.
3. Liste des doublons potentiels à fusionner, conserver séparément ou renommer, avec validation humaine.
4. Correspondance éventuelle des anciens blocs de compétences avec les nouveaux blocs de missions : aucune correspondance automatique.
5. Sort final de `referenceLevel` après reprise : retrait différé une fois les consommateurs migrés.

## 8. Critères de validation de l’architecture

- Une compétence globale a une identité stable et une seule famille parmi les quatre.
- Une compétence peut être référencée dans plusieurs blocs sans duplication de définition.
- Les anciens usages projet conservent leurs identifiants, leurs exigences et leurs niveaux.
- Les blocs de missions de fiche de poste sont distincts des anciens blocs de compétences projet.
- Les niveaux des fiches de poste sont stockés sur les associations, jamais uniquement sur la compétence globale.
- Aucun doublon n’est fusionné sans décision tracée.
- Une compétence utilisée est désactivable, mais pas supprimable physiquement.
- BPMN, RACI et les tables sources de processus restent hors de cette migration.

## 9. Limites de cette décision préparatoire

L’analyse est fondée sur le code et les migrations versionnés dans la branche. Aucun accès à une base de données de test ou de production n’a été utilisé ici : les volumes, doublons réels, valeurs atypiques et références effectives restent à inventorier sur une base représentative. Aucune migration n’a été créée ou exécutée et aucun code applicatif n’a été modifié.
