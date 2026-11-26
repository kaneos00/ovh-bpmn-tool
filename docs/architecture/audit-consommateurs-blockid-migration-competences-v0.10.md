# Audit des consommateurs de blockId — référentiel des compétences V0.10

**Branche examinée :** planning/admin-ux-v0.10  
**Périmètre vérifié :** entités et service du module JobArchitecture, contrôleur, migration SQL V3 et documentation du module Organization.  
**Limite :** cet audit statique ciblé ne remplace pas une recherche exhaustive dans tous les packages frontend/backend ni les résultats d'une base réelle. Il ne valide pas le comportement runtime.

## 1. Conclusion

Le champ historique competencies.blockId n'est pas un simple classement d'affichage. Il porte actuellement une partie de l'intégrité métier des compétences projet.

Il ne faut donc ni le rendre nullable, ni le supprimer, ni modifier sa sémantique avant d'avoir migré les consommateurs ci-dessous et les données associées.

## 2. Consommateurs backend confirmés

### 2.1 JobArchitectureService.listFunctions()

- Charge les compétences depuis le repository.
- Regroupe les compétences par competency.blockId.
- Les renvoie imbriquées dans les blocs liés aux fonctions via JobFunctionCompetencyBlock.

**Conséquence :** la lecture historique des fonctions doit être conservée pendant la transition. Après migration, elle devra grouper via l'association explicite compétence ↔ bloc, sans dupliquer la définition globale.

### 2.2 createCompetency(blockId, input)

- Vérifie que le bloc existe et est actif.
- Crée la compétence avec blockId.
- Gère actuellement l'unicité du code dans le bloc.

**Conséquence :** conserver la route historique et la faire évoluer pour créer/réutiliser une définition globale puis créer son association au bloc. Ne pas laisser cette route créer une deuxième définition si la compétence existe déjà globalement.

### 2.3 getPositionCompetencyRequirements()

- Charge les blocs applicables à un poste projet.
- Charge les compétences en filtrant par blockId et active=true.
- Retrouve le bloc de chaque compétence via competency.blockId.
- Produit les exigences projet et les niveaux hérités/écrasés.

**Conséquence :** après migration, la liste doit être calculée à partir des associations compétence ↔ bloc autorisées pour le poste. Une compétence globale n'est proposée que si elle est associée au bloc applicable.

### 2.4 updatePositionCompetencyRequirements()

- Vérifie que chaque compétence existe et est active.
- Retrouve le bloc via competency.blockId.
- Vérifie que ce bloc est applicable au poste projet.
- Enregistre blockId et competencyId dans l'exigence.
- La contrainte SQL confirme que le couple (blockId, competencyId) doit correspondre à la compétence appartenant à ce bloc.

**Conséquence :** le contrôle d'appartenance doit être remplacé par une validation explicite de l'association compétence ↔ bloc. Ne pas se contenter de vérifier l'existence de competencyId.

### 2.5 PositionActivityMapping

L'entité contient également blockId. La migration SQL rattache son couple (positionId, blockId) à position_competency_blocks.

**Conséquence :** ce mapping est un lien entre un poste projet, une tâche BPMN et un bloc historique applicable. Il ne doit pas être redirigé vers le nouveau bloc de mission des fiches de poste. Son sens doit rester stable pendant la migration du référentiel de compétences.

## 3. Contraintes SQL confirmées

La migration backend/migrations/20261110_v3_job_architecture.sql établit :

- competencies.blockId NOT NULL avec FK vers competency_blocks(id) ON DELETE CASCADE ;
- unicité actuelle de (blockId, code) ;
- clé unique composite (blockId, id) utilisée par la FK projet ;
- job_function_competency_blocks.blockId vers competency_blocks avec ON DELETE RESTRICT ;
- position_competency_blocks.blockId vers competency_blocks avec ON DELETE RESTRICT ;
- position_competency_requirements référence (positionId, blockId) vers position_competency_blocks avec ON DELETE CASCADE ;
- position_competency_requirements référence (blockId, competencyId) vers competencies avec ON DELETE CASCADE ;
- position_activity_mappings référence (positionId, blockId) vers position_competency_blocks avec ON DELETE CASCADE.

**Risque confirmé :** la suppression physique d'une compétence peut supprimer en cascade des exigences de compétences projet. La suppression physique d'un bloc peut supprimer ses compétences, sous réserve des autres FK RESTRICT. La règle métier doit donc être désactivation/archivage, pas DELETE.

## 4. Séquence de migration additive recommandée

### Phase A — Préparer sans rupture
1. Ajouter la famille functional à la contrainte SQL et au type TypeScript, sans reclassement automatique.
2. Ajouter la table d'association explicite entre compétence globale et bloc historique.
3. Ajouter les associations à partir de chaque competency.blockId existant.
4. Ajouter les contraintes d'unicité sur le couple compétence/bloc.
5. Conserver competency.blockId et toutes les contraintes composites historiques.

### Phase B — Double lecture contrôlée
1. Ajouter une lecture via la table d'association.
2. Comparer les résultats anciens et nouveaux pour les fonctions et les exigences projet.
3. Ajouter des tests de parité : mêmes compétences, mêmes blocs, mêmes exigences et mêmes niveaux.
4. Basculer les lectures projet une par une vers la relation explicite.
5. Conserver la route historique de création et vérifier qu'elle maintient les deux représentations cohérentes.

### Phase C — Retrait différé
1. Rechercher à nouveau tous les usages backend et frontend de blockId.
2. Vérifier qu'aucune route, écran, export ou mapping ne dépend encore de competencies.blockId.
3. Remplacer les FK composites sur les exigences projet par des contraintes adaptées au nouveau modèle, tout en garantissant l'appartenance compétence ↔ bloc.
4. Retirer la colonne historique dans une migration séparée, seulement après validation des tests et d'une restauration/rollback.

La phase C n'est pas autorisée par le présent audit.

## 5. Règles à préserver

- L'identifiant de compétence reste stable.
- Les associations à plusieurs blocs n'entraînent pas de duplication de la compétence.
- Les niveaux projet existants restent attachés aux exigences projet.
- referenceLevel historique ne devient pas automatiquement un niveau cible global.
- Une compétence inactive reste lisible dans l'historique et ses associations existantes.
- Une compétence inactive est exclue des nouveaux choix par défaut.
- Retirer un lien compétence ↔ bloc ne supprime ni la compétence ni les exigences projet sans procédure explicite de traitement.
- Les anciens blocs de compétences projet restent distincts des futurs blocs de mission des fiches de poste.

## 6. Tests de non-régression obligatoires

- Parité listFunctions avant/après migration.
- Liste des compétences proposées pour un poste projet identique avant/après migration.
- Refus d'une compétence non associée au bloc applicable.
- Conservation des exigences et niveaux après migration.
- Conservation des mappings d'activités BPMN.
- Désactivation d'une compétence utilisée sans perte des exigences.
- Suppression du lien compétence/bloc refusée ou contrôlée si des exigences/mappings l'utilisent.
- Suppression physique d'une compétence référencée impossible.
- Tests ACL Admin/RW/Viewer inchangés.

## 7. Ce qui reste à confirmer avant migration

- Inventaire SQL exécuté sur une base de test représentative.
- Recherche exhaustive dans tout le dépôt des accès à blockId, block_id, competencyId et des anciennes routes.
- Vérification des exports/imports et éventuels consommateurs externes.
- Plan de rollback testé sur une copie de base.
- Validation de la stratégie de conservation des associations historiques inactives.

**Décision :** poursuivre le CRUD global uniquement avec le modèle additif. Ne pas supprimer competency.blockId dans cette tranche. L'inventaire réel et la revue complète des consommateurs restent des prérequis à la bascule définitive.
