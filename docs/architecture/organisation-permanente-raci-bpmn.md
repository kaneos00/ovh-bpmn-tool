# Organisation permanente — architecture et plan de réalisation

## 1. Objectif

Ajouter à KHI-FLOWS une représentation de l'organisation permanente de l'entreprise, complétée par les responsabilités propres à chaque projet. L'organisation permanente constitue la structure de référence ; les projets peuvent la mobiliser, la décliner ou créer des rôles spécifiques sans modifier cette structure.

Le module doit alimenter la page d'accueil personnelle et relier de manière traçable les personnes, les postes, les rôles RACI et les activités BPMN.

Cette évolution est additive : elle ne remplace ni le module Job Architecture, ni ProjectContext, ni les données RACI/BPMN existantes.

## 2. Principes non négociables

1. **Un seul référentiel d'organisation permanente** pour l'entreprise dans KHI-FLOWS.
2. **Un poste existe indépendamment de son titulaire.** Le poste vacant est un état normal.
3. **Les affectations sont datées et historisées.** Une personne peut occuper plusieurs postes dans le temps ; une même fonction peut être déclinée dans plusieurs postes.
4. **La hiérarchie relie des postes, pas des personnes.** Le changement de titulaire ne change pas l'organigramme.
5. **Les projets ne modifient pas l'organisation permanente.** Ils référencent un poste permanent ou créent un rôle de projet spécifique.
6. **RACI et BPMN restent propriétaires de leurs données.** Les nouveaux liens sont des références explicites ; aucune duplication ni réécriture des lignes RACI ou des XML BPMN.
7. **Les membres et identités restent gérés par les mécanismes d'authentification et ProjectContext.** Le module Organisation ne crée pas un second annuaire utilisateur.
8. **La page d'accueil est une vue agrégée**, pas une nouvelle source de vérité.

## 3. Modèle métier cible

### 3.1 Référentiel de fonctions

Le modèle `JobFunction` existant reste le référentiel générique des missions et compétences. Il n'est pas lié à une personne, à un projet ou à une position hiérarchique.

### 3.2 Poste permanent

Nouveau concept `OrganizationPosition` :

- identifiant ;
- code et intitulé ;
- description / finalité ;
- fonction de référence facultative vers `JobFunction` ;
- unité organisationnelle éventuelle ;
- statut actif / inactif ;
- métadonnées de création et de mise à jour.

Le poste est l'unité centrale de l'organigramme. Il peut être vacant. Le poste permanent ne contient pas les responsabilités RACI détaillées d'un projet.

### 3.3 Unité organisationnelle

Concept `OrganizationUnit` facultatif pour structurer les équipes, directions et services :

- nom, code, description ;
- unité parente éventuelle ;
- ordre d'affichage ;
- statut.

Le rattachement à une unité ne remplace pas la relation hiérarchique entre postes. Le MVP peut démarrer sans imposer une unité à chaque poste.

### 3.4 Affectation nominative

Concept `OrganizationAssignment` :

- `organizationPositionId` ;
- `userId` issu de l'identité KHI-FLOWS existante ;
- date de début et date de fin (fin nullable) ;
- statut / motif éventuel ;
- commentaire administratif limité.

Les affectations sont historisées. Une contrainte applicative et/ou base empêche deux titulaires simultanés d'un même poste sur des périodes qui se chevauchent, sauf décision métier ultérieure explicite. La première version autorise un titulaire principal unique par poste à une date donnée.

Le modèle d'affectation n'est pas une fiche RH complète. Les objectifs individuels, évaluations, rémunération, données sensibles et documents RH restent hors périmètre de cette évolution.

### 3.5 Relations hiérarchiques

Concept `OrganizationPositionRelation` :

- poste parent ;
- poste enfant ;
- type de relation : hiérarchique (MVP), fonctionnelle (extension) ;
- validité temporelle facultative ;
- ordre d'affichage.

Le MVP interdit les cycles hiérarchiques et un poste ne peut avoir qu'un seul parent hiérarchique actif à une date donnée. Les liens fonctionnels ne sont pas dessinés comme une hiérarchie et seront ajoutés dans une tranche ultérieure si nécessaire.

### 3.6 Poste de projet existant

Le modèle `ProjectJobPosition` existant est conservé. Il représente un rôle/poste dans le contexte d'un projet, pas le poste RH permanent.

Évolution additive proposée :

- ajouter `organizationPositionId` nullable ;
- si renseigné, le poste de projet est une déclinaison du poste permanent ;
- si absent, il s'agit d'un rôle spécifique au projet ;
- plusieurs postes de projet peuvent référencer le même poste permanent ;
- le titre et la description de projet peuvent préciser le contexte sans modifier le poste permanent.

La relation doit être contrôlée pour éviter de lier un poste permanent inactif. La suppression physique d'un poste permanent référencé est interdite ; on le désactive.

### 3.7 RACI et BPMN

Réutiliser les mappings existants :

- `PositionRaciActorMapping` relie le poste de projet à un acteur RACI déjà existant du même projet ;
- `PositionActivityMapping` relie le poste de projet à une activité BPMN et à un bloc de compétences applicable ;
- les diagnostics existants restent la source de contrôle des écarts de couverture.

La chaîne de lecture devient :

`Utilisateur → affectation active → poste permanent → poste(s) de projet → acteur(s) RACI → entrées RACI → activités / tâches BPMN`.

Pour un rôle de projet spécifique sans poste permanent, la chaîne démarre au poste de projet. L'accueil doit afficher cette situation sans fabriquer une affectation permanente.

**Important :** le RACI exprime les rôles R/A/C/I au niveau des activités. L'affectation nominative permet de retrouver la personne qui occupe le poste ; elle ne change jamais les entrées RACI.

## 4. Architecture technique et frontières de modules

| Responsabilité | Propriétaire |
|---|---|
| Fonctions, compétences, fiches de fonction | JobArchitecture |
| Postes permanents, unités, relations hiérarchiques, affectations | Nouveau module Organization |
| Membres projet et contrôle d'accès projet | ProjectContext |
| Postes/rôles de projet et mappings de compétences | JobArchitecture |
| Acteurs et entrées RACI | ProjectContext / module RACI existant |
| Ressources et XML BPMN | modules Resource / Process existants |
| Agrégation des tâches et projets personnels | endpoint dédié de dashboard, en lecture seule |

Le module Organization peut consulter le service d'identité et les services existants, mais ne doit pas écrire dans leurs tables propriétaires.

## 5. API cible indicative

Les routes exactes seront alignées sur les conventions du backend après inspection du contrôleur et du routage existants.

### Organisation

- `GET /organization/overview` — structure, postes et titulaires actifs ;
- `GET /organization/positions` ;
- `POST /organization/positions` ;
- `PATCH /organization/positions/:positionId` ;
- `GET /organization/positions/:positionId` ;
- `POST /organization/positions/:positionId/assignments` ;
- `PATCH /organization/assignments/:assignmentId` — clôture / correction contrôlée ;
- `POST /organization/positions/:positionId/relations` ;
- `DELETE /organization/positions/:positionId/relations/:relationId`.

Toutes les écritures sont soumises à une autorisation d'administration de l'organisation. Les lectures suivent les règles de visibilité organisationnelle définies par l'application.

### Pont vers les projets

- ajouter `organizationPositionId` nullable à la création / mise à jour des `ProjectJobPosition` ;
- exposer le poste permanent associé dans la lecture du poste de projet ;
- conserver les routes de mapping RACI/BPMN existantes.

### Accueil personnel

Créer un endpoint d'agrégation en lecture seule, par exemple `GET /me/workspace`, qui retourne :

- identité et poste(s) permanent(s) actif(s) ;
- responsable hiérarchique et équipe immédiate ;
- projets auxquels l'utilisateur a accès ;
- tâches issues des entrées RACI où le rôle associé au poste de projet est R, A, C ou I ;
- liens de navigation vers le projet, le processus et la tâche concernés ;
- signalement explicite des rôles projet sans correspondance nominative.

L'endpoint doit réutiliser les services de droits existants. Il ne doit jamais exposer les tâches d'un projet auquel l'utilisateur n'a pas accès.

## 6. Interface utilisateur

### 6.1 Module Organisation

Vue principale graphique, simple et lisible :

- organigramme occupant l'espace central ;
- nœuds de poste affichant intitulé, titulaire ou badge « Poste vacant », et unité éventuelle ;
- panneau latéral de détail au clic : missions, fonction de référence, titulaire, rattachement, projets associés ;
- actions visibles selon les droits : créer un poste, affecter/remplacer un titulaire, rattacher un poste ;
- recherche et filtres par unité / titulaire.

Technologie proposée : React Flow pour le rendu interactif et ELK.js pour le calcul de disposition hiérarchique automatique. Vérifier d'abord les dépendances et composants graphiques déjà présents avant d'ajouter une bibliothèque.

### 6.2 Fiche d'un poste permanent

Onglets ou sections sobres :

1. Informations générales ;
2. Titulaire et historique ;
3. Rattachement hiérarchique ;
4. Fonction et compétences de référence ;
5. Projets associés — avec accès aux postes projet et aux mappings RACI/BPMN.

### 6.3 Page d'accueil personnelle

Conserver le principe graphique déjà travaillé : peu de grandes zones, informations immédiatement utiles, pas de tableau de bord surchargé.

Blocs recommandés :

- **Mes tâches** : tâches R/A/C/I, regroupées par priorité ou projet ;
- **Mes projets** : cartes compactes des projets accessibles ;
- **Mon organisation** : poste, responsable, équipe ;
- **Ma fiche de poste** : missions et compétences de référence, avec lien vers le poste.

La page doit fonctionner même si l'utilisateur n'a pas encore de poste permanent : afficher les projets et tâches disponibles et signaler sobrement que son rattachement organisationnel n'est pas renseigné.

## 7. Sécurité, intégrité et audit

- Toutes les écritures d'organisation sont réservées aux administrateurs autorisés.
- L'accès aux informations personnelles est limité au besoin fonctionnel ; pas de données RH sensibles dans cette tranche.
- Une affectation passée n'est pas supprimée : elle est clôturée et conservée.
- Un poste référencé par un poste projet ou une affectation historique est désactivé plutôt que supprimé.
- Empêcher les cycles hiérarchiques et les chevauchements de titularisation.
- Les lectures de l'accueil filtrent les projets selon les droits ProjectContext.
- Journaliser les changements de titulaire et de structure selon les conventions d'audit existantes.

## 8. Plan de réalisation incrémental

### Tranche 0 — fondations et contrats

- confirmer les conventions d'identité utilisateur et les droits d'administration organisationnelle ;
- valider les migrations SQL et la stratégie de tests ;
- créer le module Organization et ses contrats ;
- corriger les incohérences documentaires de JobArchitecture, notamment la règle de validation des IDs BPMN ;
- aucun changement du viewer BPMN.

### Tranche 1 — organisation permanente

- entités, migration et services pour postes permanents ;
- affectations nominatives historisées ;
- relations hiérarchiques ;
- endpoints et tests d'intégrité / autorisation ;
- première vue d'organigramme.

### Tranche 2 — pont vers les projets

- champ nullable `organizationPositionId` sur `ProjectJobPosition` ;
- interface d'association poste permanent ↔ poste de projet ;
- réutilisation des mappings RACI/BPMN et diagnostics ;
- cas des rôles spécifiques de projet conservé.

### Tranche 3 — accueil personnel

- endpoint `/me/workspace` ;
- agrégation poste, responsable, équipe, projets et tâches RACI ;
- navigation vers les activités BPMN ;
- tests d'isolation des projets et cas sans poste permanent.

### Tranche 4 — enrichissements ultérieurs

- fiche de poste individuelle RH plus complète, uniquement après cadrage des données et droits ;
- relations fonctionnelles et vues par unité ;
- export / historique éditorial des fiches ;
- synchronisation éventuelle avec un SIRH, hors périmètre actuel.

## 9. Critères d'acceptation

1. Un administrateur peut créer, modifier et désactiver un poste permanent.
2. Un poste vacant apparaît clairement dans l'organigramme.
3. Une personne peut être affectée à un poste avec dates ; le remplacement clôture l'affectation précédente et conserve l'historique.
4. Un poste ne peut pas être son propre parent et aucun cycle hiérarchique ne peut être créé.
5. Un poste de projet peut référencer un poste permanent ou rester spécifique au projet.
6. L'association d'un poste permanent à un poste de projet ne crée ni ne modifie d'acteur RACI.
7. Les mappings RACI et BPMN existants continuent de fonctionner sans migration destructive.
8. Le changement de titulaire ne modifie aucune entrée RACI ni aucun XML BPMN.
9. La page d'accueil retrouve les tâches selon les rôles R/A/C/I du poste de projet associé, dans la limite des droits d'accès.
10. Un utilisateur sans poste permanent conserve un accueil fonctionnel.
11. Le viewer BPMN et ses comportements ne sont pas modifiés.
12. Les tests backend, frontend, migrations et CI passent avant toute proposition de déploiement.

## 10. Décisions de périmètre

- Un seul organigramme permanent d'entreprise dans la première approche.
- Un seul titulaire principal par poste à un instant donné.
- Un utilisateur peut avoir plusieurs affectations actives si des postes distincts le justifient.
- Les rôles spécifiques à un projet restent possibles.
- Pas de gestion RH complète, paie, rémunération, évaluations ou données sensibles.
- Pas de synchronisation SIRH dans cette tranche.
- Pas de modification du viewer BPMN, des XML BPMN ou des tables sources RACI.
