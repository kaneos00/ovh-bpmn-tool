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

Les blocs de missions décrivent les domaines de contribution habituels. Ils peuvent contenir des activités descriptives et référencer les compétences attendues. Les compétences et leurs niveaux cibles restent structurés séparément des descriptions d'activités. Chaque compétence appartient à une seule famille, sans étiquette secondaire : **Méthodologique**, **Technique**, **Fonctionnelle** ou **Savoir-être**. Le référentiel des compétences est administré dans une rubrique dédiée, distincte de la liste des postes.

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

## 2.1. Règles de composition d'une fiche de poste — niveau 1

La page d'administration d'un poste permet de gérer directement, sans navigation obligatoire vers un autre écran, les quatre blocs de missions du poste, leurs activités et leurs compétences associées.

Règles de composition retenues pour la première version de l'interface :

- Chaque poste comporte **quatre blocs de missions**, ni plus ni moins dans le modèle de référence initial.
- Chaque bloc possède un code stable construit à partir du code court du poste et de son rang : par exemple `CDP-1`, `CDP-2`, `CDP-3`, `CDP-4` pour le poste Chef de projet. Le code court du poste est défini à la création ; le code complet ne dépend pas de l'intitulé libre du bloc.
- Chaque bloc possède un intitulé et une description courte.
- Chaque bloc contient de **1 à 4 activités** descriptives. Elles expriment les contributions habituelles attendues dans le poste. Elles ne constituent pas un second catalogue de tâches opérationnelles : les tâches exécutables et leurs enchaînements restent modélisés dans BPMN.
- Chaque bloc référence de **1 à 4 compétences** du référentiel commun.
- Une compétence appartient à une et une seule famille : Méthodologique, Technique, Fonctionnelle ou Savoir-être. Aucune étiquette secondaire ni famille multiple n'est prévue.
- Le poste peut également référencer directement des compétences transversales, indépendamment des quatre blocs. Ces associations poste ↔ compétence ont leur propre niveau attendu et ne constituent pas un cinquième bloc.
- Une même compétence peut être associée à plusieurs blocs d'un même poste et à plusieurs postes. Il s'agit d'une référence partagée, pas d'une copie de la compétence.
- Le niveau attendu (1 à 5) est porté par l'association entre une compétence et un bloc/poste, et non par la définition globale de la compétence. Une même compétence peut donc avoir un niveau attendu différent selon le bloc ou le poste.
- Le niveau attendu est affiché et modifié avec un slider cranté à cinq positions : **1 Notions, 2 Élémentaire, 3 Opérationnel, 4 Avancé, 5 Expert**. Le chiffre, le libellé et une courte aide contextuelle restent visibles.
- La création d'une compétence peut être déclenchée depuis la page du poste, mais crée un élément dans le référentiel commun après contrôle des doublons. La compétence nouvellement créée peut ensuite être réutilisée dans d'autres blocs et postes.
- Le référentiel commun des compétences dispose de sa propre liste d'administration : recherche, filtres par famille et statut, consultation, création et modification.
- Une compétence comporte un intitulé, une description courte, une famille unique et un statut actif/inactif. La famille est choisie selon la nature principale de la capacité ; si deux natures sont réellement distinctes, la compétence est reformulée ou décomposée.
- Avant création, le système signale les compétences proches pour éviter les doublons ; aucune fusion automatique n'est effectuée.
- Une compétence inactive reste conservée pour l'historique et les fiches qui l'utilisent, mais n'est plus proposée par défaut pour de nouvelles associations. Elle peut être réactivée.
- Une compétence référencée ne peut pas être supprimée physiquement ; elle doit être désactivée. Une compétence sans aucune référence peut être supprimée.
- La suppression d'une association compétence ↔ bloc ne supprime pas la compétence du référentiel. Une compétence déjà utilisée ne doit pas être supprimée physiquement ; elle peut être désactivée en conservant l'historique.

La page d'administration du poste regroupe les informations générales, les quatre blocs, leurs activités et leurs compétences. Les ajouts et modifications sont effectués en ligne dans cette page ; l'enregistrement du poste est global. La fiche de poste consultable est une vue de synthèse générée à partir de ces données.

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
4. Maintenir le référentiel commun des compétences et leurs quatre familles exclusives.
5. Composer une fiche de poste à partir des blocs, puis associer les compétences transversales.
6. Créer ou maintenir les postes types et leurs fiches de référence.

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


---

## 10. Décisions complémentaires et points à ne pas figer — 27 novembre 2026

Le modèle fonctionnel doit être lu avec la section 10 du [modèle organisationnel responsabilités/activités](./modele-organisation-responsabilites-activites.md), qui constitue la trace consolidée des arbitrages.

Les précisions suivantes s'appliquent à ce document :

1. Les quatre blocs de missions ne sont **pas obligatoires** : un poste comporte au maximum quatre responsabilités/blocs pertinents, et chaque responsabilité au maximum quatre activités. Toute formulation antérieure imposant exactement quatre blocs est remplacée par cette règle.
2. La structure permanente est cadrée autour des **directions, postes et titulaires**. Les services/unités intermédiaires ne sont pas requis à ce stade.
3. Le titulaire structurel ne doit pas être confondu avec les exécutants : une personne peut réaliser tout ou partie des responsabilités d'un poste, contribuer à plusieurs postes, et partager une activité avec d'autres personnes. Les affectations opérationnelles doivent donc être distinguées des titularisations.
4. La responsabilité portée par le poste est une responsabilité organisationnelle permanente ; le RACI décrit les rôles opérationnels dans un contexte de processus/projet. Le RACI ne se déduit pas automatiquement de la fiche de poste.
5. Le référentiel d'activités organisationnelles doit être unique et relié aux éléments BPMN. Une même activité de référence peut être représentée par plusieurs tâches/activités BPMN dans différents processus.
6. La distinction fonction-type / poste / fiche de poste demeure **non arbitrée**. Les règles actuelles de partage, d'héritage ou de personnalisation ne doivent pas être considérées comme définitives avant décision explicite.

Les passages de ce document qui décrivent les quatre blocs comme exactement obligatoires ou les activités comme uniquement descriptives sans lien de référence avec les activités BPMN devront être harmonisés lors de la prochaine révision fonctionnelle. Le présent complément évite de considérer ces formulations antérieures comme des décisions définitives.
