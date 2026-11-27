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
- statut actif / inactif.

Le poste est l'unité centrale de l'organigramme. Il peut être vacant. Le poste permanent ne contient pas les responsabilités RACI détaillées d'un projet.

### 3.3 Affectation nominative

Concept `OrganizationAssignment` :

- `organizationPositionId` ;
- `userId` issu du username KHI-FLOWS existant ;
- date de début et date de fin (fin nullable) ;
- commentaire administratif limité.

Les affectations sont historisées. Un poste ne peut avoir qu'un titulaire à la fois ; les périodes ne peuvent pas se chevaucher. Une personne peut occuper plusieurs postes si ceux-ci sont distincts.

Ce modèle n'est pas une fiche RH complète. Objectifs individuels, évaluations, rémunération, données sensibles et documents RH restent hors périmètre.

### 3.4 Relations hiérarchiques

`OrganizationPositionRelation` relie un poste parent à un poste enfant. Le MVP autorise un seul parent hiérarchique par poste enfant et interdit les cycles. Les liens fonctionnels distincts sont une extension ultérieure.

### 3.5 Poste de projet existant

Le modèle `ProjectJobPosition` existant est conservé. Il représente un rôle dans le contexte d'un projet.

- `organizationPositionId` nullable relie le poste de projet à un poste permanent.
- Si absent, le poste reste spécifique au projet.
- Plusieurs postes de projet peuvent référencer le même poste permanent.
- Le titre et la description de projet précisent le contexte sans modifier le poste permanent.

### 3.6 RACI et BPMN

Réutiliser les mappings existants :

- `PositionRaciActorMapping` relie le poste de projet à un acteur RACI déjà existant du même projet.
- `PositionActivityMapping` relie le poste de projet à une activité BPMN et à un bloc de compétences applicable.
- Les diagnostics existants restent la source de contrôle des écarts de couverture.

Chaîne de lecture : `Utilisateur → affectation active → poste permanent → poste(s) de projet → acteur(s) RACI → entrées RACI → activités BPMN`.

Pour un rôle de projet spécifique sans poste permanent, la chaîne ne peut être nominative qu'après ajout d'une affectation explicite de projet ; cette affectation n'est pas incluse dans la première tranche.

Le RACI exprime les rôles R/A/C/I au niveau des activités. Le changement de titulaire ne modifie jamais les entrées RACI.

## 4. Architecture technique et frontières de modules

| Responsabilité | Propriétaire |
|---|---|
| Fonctions, compétences, fiches de fonction | JobArchitecture |
| Postes permanents, affectations et hiérarchie | Organization |
| Membres projet et contrôle d'accès projet | ProjectContext |
| Postes/rôles de projet et mappings | JobArchitecture |
| Acteurs et entrées RACI | ProjectContext / module RACI existant |
| Ressources et XML BPMN | modules Resource / Process existants |
| Agrégation personnelle | Organization, en lecture seule |

Le module Organization consulte les identités existantes et les sources de projet/RACI ; il ne crée pas de second annuaire et ne réécrit pas les tables sources.

## 5. API mise en place

- `GET /organization/overview` — postes actifs, titulaires et rattachements.
- `GET /organization/positions` et `GET /organization/positions/:positionId`.
- `POST /organization/positions` et `PATCH /organization/positions/:positionId`.
- `POST /organization/positions/:positionId/assignments` et `PATCH /organization/assignments/:assignmentId`.
- `POST /organization/positions/:positionId/relations` et suppression du rattachement.
- `GET /organization/me/workspace` — poste(s), responsable(s), projets accessibles et tâches RACI.
- `ProjectJobPosition` accepte `organizationPositionId` et expose une route dédiée pour modifier le lien.

Les écritures et la lecture de l'annuaire sont réservées aux administrateurs globaux. L'espace personnel ne retourne que les tâches des projets dont l'utilisateur est membre.

## 6. Interface utilisateur

### 6.1 Module Organisation

Vue graphique centrale avec postes, titulaire ou « Poste vacant », rattachements et panneau de détail. L'implémentation initiale réutilise la dépendance `react-d3-tree` déjà présente dans le frontend ; aucune nouvelle dépendance de diagramme n'est ajoutée dans cette tranche.

### 6.2 Fiche d'un poste permanent

Sections prévues : informations générales, titulaire et historique, rattachement hiérarchique, fonction de référence, projets associés.

### 6.3 Page d'accueil personnelle

La page d'accueil des projets présente désormais un bloc « Mon organisation & mes responsabilités » avec les postes actifs, responsables hiérarchiques et tâches RACI associées aux postes permanents. Les utilisateurs sans affectation conservent l'accès à leurs projets et voient un message explicite.

## 7. Sécurité, intégrité et audit

- Les écritures d'organisation et la lecture de l'annuaire sont réservées aux administrateurs.
- Les affectations passées sont conservées et clôturées, pas supprimées.
- Les périodes de titularisation qui se chevauchent sont refusées au niveau PostgreSQL, y compris en cas d'écritures concurrentes.
- Les cycles hiérarchiques sont refusés par le service et par un trigger PostgreSQL.
- Un poste référencé est désactivé plutôt que supprimé.
- Les tâches personnelles sont filtrées par adhésion ProjectContext.
- Les changements de titulaire n'écrivent jamais dans les tables RACI ou les XML BPMN.

## 8. Plan de réalisation incrémental

| Tranche | Contenu | État |
|---|---|---|
| 0 | Conventions d'identité, droits et frontières | Réalisée pour la première version |
| 1 | Postes, affectations, hiérarchie, API et organigramme | Implémentation initiale réalisée, CI à valider |
| 2 | Pont poste permanent ↔ poste de projet et réutilisation RACI/BPMN | Implémentation initiale réalisée, CI à valider |
| 3 | Accueil personnel et tâches RACI | Implémentation initiale réalisée, CI à valider |
| 4 | Unités, liens fonctionnels, fiche RH complète, SIRH | Hors première tranche |

## 9. Critères d'acceptation

1. Un administrateur peut créer, modifier et désactiver un poste permanent.
2. Un poste vacant apparaît clairement dans l'organigramme.
3. Une personne peut être affectée à un poste avec dates ; le remplacement conserve l'historique.
4. Un poste ne peut pas être son propre parent et aucun cycle hiérarchique ne peut être créé.
5. Un poste de projet peut référencer un poste permanent ou rester spécifique au projet.
6. L'association ne crée ni ne modifie d'acteur RACI.
7. Les mappings RACI/BPMN existants continuent de fonctionner sans migration destructive.
8. Le changement de titulaire ne modifie aucune entrée RACI ni aucun XML BPMN.
9. La page d'accueil retrouve les tâches R/A/C/I associées au poste permanent dans les projets accessibles.
10. Un utilisateur sans poste permanent conserve un accueil fonctionnel.
11. Le viewer BPMN et ses comportements ne sont pas modifiés.
12. Les tests backend, frontend, migrations et CI passent avant toute proposition de déploiement.

## 10. Décisions de périmètre

- Un seul organigramme permanent d'entreprise.
- Un seul titulaire principal par poste à un instant donné.
- Un utilisateur peut avoir plusieurs affectations actives sur des postes distincts.
- Les rôles spécifiques à un projet restent possibles, mais leur affectation nominative est une tranche ultérieure.
- Pas de gestion RH complète, paie, rémunération, évaluations ou données sensibles.
- Pas de synchronisation SIRH.
- Pas de modification du viewer BPMN, des XML BPMN ou des tables sources RACI.


## 11. Complément de cadrage métier — décisions du 27 novembre 2026

Les règles fonctionnelles consolidées sont décrites dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md), section 10. Elles prévalent sur les hypothèses techniques de ce document lorsqu'une divergence est identifiée.

Points à prendre en compte lors de la prochaine évolution du modèle :

- La structure permanente à représenter est, à ce stade, **Directions → Postes → Titulaires**. Les services/unités intermédiaires ne sont pas imposés dans le cadrage actuel.
- Le titulaire structurel d'un poste doit être distingué des personnes qui réalisent opérationnellement ses responsabilités. Une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes ; le modèle ne doit donc pas assimiler titulaire et unique exécutant.
- Il faut distinguer l'affectation structurelle à un poste de l'affectation opérationnelle à tout ou partie de ses responsabilités/activités. Le modèle actuel OrganizationAssignment ne suffit pas, à lui seul, à décrire cette seconde relation.
- La responsabilité organisationnelle du poste reste distincte des rôles RACI contextuels. Aucun RACI ne doit être généré automatiquement depuis le poste.
- La correspondance activité organisationnelle ↔ élément BPMN doit permettre la réutilisation d'une même activité de référence dans plusieurs processus ; plusieurs éléments BPMN peuvent donc référencer la même activité.
- Le nombre de responsabilités par poste et d'activités par responsabilité est un maximum de quatre, non une obligation de remplir quatre emplacements.
- La relation entre fonction-type, poste et fiche de poste reste explicitement **à arbitrer** ; ne pas la figer par anticipation dans les écrans ou migrations.

Ce complément est un cadrage fonctionnel. Il ne prétend pas décrire des capacités déjà implémentées : les écarts avec le schéma et les API existants doivent être audités avant développement.
