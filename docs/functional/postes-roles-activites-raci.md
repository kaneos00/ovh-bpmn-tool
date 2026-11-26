# Modèle fonctionnel — postes, fiches de poste, organisation et projets

**Statut :** décision de cadrage pour la V0.10  
**Périmètre :** référentiel organisationnel, organisation permanente, organisations projet et préparation du raccordement BPMN/RACI.  
**Principe :** privilégier la réutilisation de JobArchitecture, Organization, ProjectContext, ProjectJobPosition et du moteur RACI existants. Pas de second annuaire, de second référentiel de tâches ni de second moteur RACI.

## 1. Principe directeur

Le modèle repose sur cinq responsabilités distinctes :

1. **La fiche de poste décrit ce qu'un poste recouvre** : finalité, blocs de missions habituelles, activités descriptives, compétences et niveaux attendus, limites et interfaces.
2. **La personne occupe un poste** dans l'organisation générale, avec une affectation datée et historisée. Un poste existe indépendamment de son titulaire et peut être vacant.
3. **Le projet attribue une ou plusieurs missions à une personne** : il précise les blocs de missions ou contributions confiés dans ce contexte. Une personne peut recevoir plusieurs missions sur un même projet et sur plusieurs projets. Une mission projet peut être plus restreinte ou adaptée à la fiche de poste.
4. **Les tâches décrivent le travail à réaliser**. Les tâches opérationnelles des processus restent dans BPMN ; l'organisation ne crée pas un deuxième catalogue de tâches.
5. **Le RACI précise qui fait quoi** pour les activités/tâches du contexte concerné. Il reste la source de vérité des responsabilités opérationnelles ; le poste ou la mission ne déduit jamais automatiquement un R, un A, un C ou un I.

Le vocabulaire « mission projet » désigne la contribution confiée à une personne dans un projet. « Rôle » peut être utilisé comme intitulé ou qualification de cette mission, mais ne constitue pas un objet métier distinct à maintenir en doublon.

## 2. Les trois niveaux d'organisation

### Niveau 1 — Commun : référentiel organisationnel

Socle réutilisable dans toute l'organisation :
- fonctions et blocs de missions communs ;
- postes types ;
- fiches de poste de référence ;
- compétences et niveaux attendus.

Les blocs de missions décrivent les domaines de contribution habituels. Ils peuvent contenir des activités descriptives et référencer les compétences attendues. Les compétences et leurs niveaux cibles restent structurés séparément des descriptions d'activités.

Une fiche de poste assemble les blocs pertinents et précise leur portée pour le poste. Une adaptation locale ne doit pas modifier silencieusement le bloc commun : elle doit être identifiable comme une déclinaison ou une surcharge propre au poste.

### Niveau 2 — Organisation générale

Représentation de l'organisation habituelle :
- directions et services / unités organisationnelles ;
- postes occupés ou vacants ;
- personnes affectées aux postes ;
- responsables hiérarchiques.

La hiérarchie relie les postes, pas les personnes. Les affectations des personnes aux postes sont datées et historisées. Le changement de titulaire ne modifie pas l'organigramme.

### Niveau 3 — Projet : organisation propre au projet

Chaque projet peut composer sa propre organisation :
- postes et fonctions mobilisés depuis le référentiel commun ;
- postes ou rôles spécifiques au projet lorsque nécessaire ;
- personnes affectées aux postes/rôles du projet ;
- missions particulières confiées à ces personnes ;
- responsabilités spécifiques, définies dans le RACI.

**Présentation attendue : une vue graphique d'organigramme projet.** Elle affiche uniquement les postes/rôles utiles au projet, leurs liens hiérarchiques ou de coordination propres à ce projet, les titulaires et les éventuelles missions. Les postes communs sont visuellement identifiés comme issus du référentiel ; les postes spécifiques sont distingués. La hiérarchie projet ne modifie jamais l'organigramme général.

Un projet réutilise les postes communs sans les recopier. Il peut adapter le contexte, les missions confiées et les relations projet. Il peut également créer un poste spécifique, sans polluer le référentiel commun.

## 3. Définitions métier

### Poste
Position relativement stable dans l'organisation, indépendante de la personne qui l'occupe et des projets auxquels elle participe.

### Fiche de poste
Description formalisée du contenu attendu d'un poste : finalité, blocs de missions, activités habituelles, compétences et niveaux cibles, autonomie, limites, interfaces et rattachements.

### Bloc de missions
Ensemble cohérent de contributions relevant d'un domaine du poste (ex. CDP-1 Cadrage, CDP-2 Pilotage, CDP-3 Clôture). Il peut décrire des activités habituelles et les compétences requises. Il n'est pas un processus BPMN et ne constitue pas un catalogue parallèle de tâches opérationnelles.

### Mission projet
Contribution confiée à une personne dans un projet, généralement par référence à un ou plusieurs blocs de missions de sa fiche de poste. Elle peut être partielle, adaptée ou spécifique au projet. Il n'est pas obligatoire qu'une mission projet corresponde à un bloc de la fiche de poste.

### Activité et tâche
Dans le référentiel de poste, les activités peuvent être décrites à titre indicatif. Dans l'exécution opérationnelle, les processus BPMN portent les activités/tâches modélisées. Pour éviter les doublons, les tâches opérationnelles restent dans BPMN. Le niveau exact de granularité est celui du modèle BPMN existant ; aucun second référentiel ne doit être créé.

### RACI
Répartition explicite des rôles R (réalise), A (redevable), C (consulté) et I (informé) sur les éléments de travail pertinents. Le RACI est contextuel au projet/processus et ne se déduit pas de l'intitulé du poste, de la Lane ou de la mission.

## 4. Articulation avec BPMN et les processus propres aux projets

Les processus BPMN peuvent être communs ou spécifiques à un projet. Les deux catégories doivent pouvoir contribuer au même référentiel de missions.

- Une Lane peut être associée à un poste ou à un type d'acteur. Cette association qualifie le rôle organisationnel représenté par la Lane ; elle ne désigne pas nécessairement la personne qui exécute la tâche.
- Les tâches contenues dans une Lane sont candidates au rattachement à un ou plusieurs blocs de missions compatibles avec le poste.
- Le rattachement tâche BPMN ↔ bloc de mission est explicite et révisable. La Lane peut proposer les blocs compatibles, mais ne suffit pas toujours à déterminer le bloc : une Lane peut contenir des tâches de plusieurs missions.
- Pour un processus spécifique à un projet, les rattachements peuvent reprendre ceux d'un processus commun lorsqu'une correspondance d'origine fiable existe ; ils peuvent aussi être adaptés ou définis spécifiquement.
- Les identifiants de processus, de ressource BPMN, d'élément BPMN et de bloc de mission doivent être conservés. Ne pas s'appuyer uniquement sur les libellés des Lanes ou des tâches.
- Les acteurs externes (client, fournisseur, partenaire) restent possibles dans les Lanes et ne doivent pas être forcés dans un poste interne.

Le RACI reste propre au contexte projet/processus. Le rapprochement vérifie ensuite si la personne désignée dans le RACI possède une mission projet couvrant la tâche. C'est un contrôle de cohérence, pas une affectation automatique.

## 5. Règles de cohérence

KHI-FLOWS pourra signaler notamment :
- une tâche d'une Lane associée à un poste sans bloc de mission correspondant ;
- une tâche rattachée à plusieurs blocs, lorsque cette multiplicité mérite validation ;
- une mission projet sans tâche/processus associé, si un rattachement est attendu ;
- une tâche couverte par un bloc mais sans responsabilité RACI ;
- une personne RACI qui n'a pas de mission projet correspondante ;
- une personne qui porte une responsabilité hors des missions qui lui ont été confiées ;
- un niveau de compétence inférieur au niveau cible du bloc.

Ces diagnostics ne doivent pas transformer automatiquement une situation atypique en erreur : une responsabilité ponctuelle hors mission ou une mission non matérialisée dans BPMN peut être légitime et doit pouvoir être justifiée.

## 6. Réutilisation de l'architecture V0.10

| Besoin métier | Élément existant à privilégier | Évolution à instruire |
|---|---|---|
| Fonctions / blocs communs et compétences | JobArchitecture : JobFunction, sections d'activités, CompetencyBlock, Competency | Clarifier les blocs de missions et distinguer contenu descriptif / compétences |
| Poste permanent | OrganizationPosition | Réutiliser |
| Fiche et titulaire | JobFunction / OrganizationAssignment | Clarifier le lien poste ↔ fiche de référence si nécessaire |
| Organigramme général | OrganizationPositionRelation | Réutiliser et compléter les unités si nécessaire |
| Déclinaison d'un poste dans un projet | ProjectJobPosition.organizationPositionId | Réutiliser |
| Poste spécifique projet | ProjectJobPosition sans poste permanent lié | Réutiliser |
| Affectation nominative au poste projet / mission projet | Pas de lien complet identifié dans l'audit | Ajouter une affectation projet datée, sans créer un annuaire |
| Organigramme projet | ProjectJobPosition | Ajouter des relations hiérarchiques projet et une vue graphique |
| Lien tâche BPMN ↔ bloc | PositionActivityMapping | Faire évoluer/clarifier le rattachement au bloc de mission |
| Lien poste projet ↔ acteur RACI | PositionRaciActorMapping | Réutiliser, puis relier les acteurs aux personnes affectées |
| Entrées RACI et tâches BPMN | Modules RACI / Resource / Process existants | Ne pas dupliquer ni réécrire leurs données |

Cette table est un cadrage basé sur l'inspection du code et des migrations de la branche planning/admin-ux-v0.10. Les migrations et tests doivent être exécutés pour confirmer le comportement en environnement.

## 7. Parcours utilisateur cible

### Administration du référentiel commun
1. Créer ou sélectionner un bloc de missions commun.
2. Décrire sa finalité et ses activités habituelles.
3. Associer les compétences et niveaux cibles.
4. Composer une fiche de poste à partir des blocs.
5. Créer ou maintenir les postes types et leurs fiches de référence.

### Administration de l'organisation générale
1. Créer les unités et postes.
2. Construire l'organigramme graphique.
3. Affecter les personnes aux postes avec dates.
4. Conserver l'historique des affectations et les postes vacants.

### Administration d'un projet
1. Sélectionner les postes communs mobilisés ou créer un poste spécifique.
2. Construire l'organigramme graphique du projet sans modifier l'organisation générale.
3. Affecter les personnes aux postes/rôles du projet.
4. Attribuer une ou plusieurs missions à chaque personne, en réutilisant les blocs communs lorsque pertinent.
5. Dans une tranche ultérieure, associer les Lanes et tâches BPMN aux postes et blocs.
6. Renseigner et contrôler le RACI existant.

## 8. Hors périmètre de la première tranche

- Refonte du viewer BPMN.
- Création d'un second moteur RACI.
- Création d'un second catalogue de tâches opérationnelles.
- Gestion RH complète (paie, rémunération, évaluation, données sensibles).
- Déduction automatique des responsabilités RACI depuis un poste ou une Lane.
- Modification de l'organisation générale par une action effectuée dans un projet.

## 9. Décision de cadrage

Le modèle cible est organisé autour de trois niveaux : **référentiel commun → organisation générale → organisation projet**.

La fiche de poste décrit ce qu'un poste recouvre ; la personne occupe un poste ; le projet attribue une ou plusieurs missions à une personne ; les tâches décrivent le travail à réaliser ; le RACI précise qui fait quoi.

L'implémentation doit d'abord stabiliser le module Organisation et les fiches de poste de manière autonome. Les correspondances BPMN/RACI seront raccordées ensuite, en réutilisant les objets et moteurs existants.
