# Architecture fonctionnelle : fonctions, postes, RACI et processus

## 1. Objet du document

Ce document fixe le vocabulaire et les règles de séparation entre :

- la **fonction**, qui décrit un rôle générique dans l'organisation ;
- le **poste organisationnel**, qui décline une fonction dans une organisation, une entité ou un projet ;
- la **fiche de poste individuelle**, qui décrit la situation d'une personne affectée à un poste.

Il précise également les relations avec l'organigramme, le RACI et les processus/procédures BPMN.

Cette distinction est une règle d'architecture métier. Elle doit guider l'évolution du module autonome Job Architecture et éviter de confondre référentiel métier, organisation opérationnelle et gestion RH individuelle.

## 2. Tableau de référence

| Document / objet | Question à laquelle il répond | Contenu et finalité |
|---|---|---|
| **Organigramme** | Qui dépend de qui ? | Représente la structure hiérarchique, les rattachements, les liens fonctionnels et les niveaux de responsabilité dans une organisation donnée. |
| **Fiche de fonction** | Quel est le périmètre et quelles sont les responsabilités de cette fonction ? | Définit les missions, le périmètre d'intervention, les responsabilités, les compétences requises et les niveaux de maîtrise attendus. C'est un référentiel commun, indépendant des personnes et des projets particuliers. |
| **Poste dans l'organisation** | Comment cette fonction est-elle exercée dans cette organisation ou ce projet ? | Décline une fiche de fonction dans un contexte précis : périmètre confié, missions retenues, blocs de compétences applicables, responsabilités opérationnelles et rattachement hiérarchique. Plusieurs postes organisationnels peuvent dériver d'une même fonction. |
| **RACI** | Qui est responsable de quoi entre les fonctions et les rôles ? | Répartit les responsabilités entre les fonctions ou rôles organisationnels pour chaque activité, décision ou livrable. Il ne dépend pas de l'identité des personnes titulaires des postes. |
| **Processus / procédures** | Comment réalise-t-on l'activité ? | Décrivent les activités, leur enchaînement, les décisions, les entrées/sorties, les règles et les modalités d'exécution. BPMN peut représenter graphiquement tout ou partie de ces processus. |
| **Fiche de poste individuelle** | Quelles sont les caractéristiques du poste occupé par une personne et ses conditions particulières d'exercice ? | Relie une personne à un poste organisationnel et précise les particularités individuelles : titulaire, objectifs individuels, conditions d'exercice, compétences détenues, délégations ou aménagements éventuels. |

## 3. Les trois niveaux à ne pas confondre

### 3.1 Fiche de fonction — le référentiel

Les compétences de référence sont classées explicitement selon trois familles :
- **Techniques** : savoirs et capacités liés aux outils, méthodes métier, technologies et domaines professionnels.
- **Méthodologiques** : capacité à organiser, analyser, planifier, piloter, résoudre un problème et appliquer une démarche.
- **Comportementales (savoir-être)** : comportements professionnels observables, par exemple communication, coopération, écoute, autonomie ou leadership.

Cette catégorie est portée par chaque compétence, et non déduite du seul titre du bloc. La fiche et son aperçu présentent les compétences regroupées par famille, tout en conservant les blocs de compétences comme structure de référence.

La fiche de fonction décrit une fonction-type, sans titulaire ni rattachement à un projet particulier.

Elle peut contenir :
- une finalité et un périmètre ;
- des missions et responsabilités ;
- des blocs de compétences ordonnés ;
- des compétences classées en trois familles — techniques, méthodologiques et comportementales (savoir-être) — avec leurs niveaux de référence ;
- des interfaces fonctionnelles avec d'autres fonctions.

Exemple : **Chef de projet**, avec des blocs de compétences CDP1, CDP2 et CDP3.

Une évolution du référentiel de fonction ne doit pas modifier silencieusement les affectations individuelles ni réécrire les RACI ou les processus existants. Les déclinaisons doivent pouvoir être analysées avant propagation d'une évolution.

### 3.2 Poste organisationnel — la déclinaison contextualisée

Le poste organisationnel représente la manière dont une fonction est effectivement utilisée dans une organisation, une entité ou un projet.

Il référence une fiche de fonction et précise notamment :
- le contexte et le périmètre confié ;
- les blocs applicables (requis, optionnels ou non applicables) ;
- les niveaux attendus propres au contexte, lorsqu'ils diffèrent du référentiel ;
- les responsabilités opérationnelles ;
- le rattachement hiérarchique et les interfaces fonctionnelles ;
- les liens explicites avec les rôles RACI et les activités de processus.

Exemple : dans le projet A, le poste « Chef de projet A » utilise CDP1 et CDP2, mais pas CDP3 (avant-vente). Dans le projet B, un autre poste dérivé de la même fonction peut mobiliser les trois blocs.

Le poste organisationnel n'est pas encore une fiche RH individuelle : il peut exister avant que son titulaire soit désigné et il peut être réattribué sans changer le référentiel de fonction, le RACI ou le processus.

### 3.3 Fiche de poste individuelle — la personne et ses conditions d'exercice

La fiche de poste individuelle rattache une personne à un poste organisationnel, pour une période donnée si nécessaire.

Elle peut préciser :
- l'identité du titulaire ;
- la date de prise de poste et, le cas échéant, la date de fin ;
- les objectifs individuels ;
- les compétences détenues ou évaluées ;
- les conditions particulières d'exercice ;
- les délégations, adaptations ou aménagements individuels.

Elle ne doit pas devenir la source du RACI générique. Le remplacement d'un titulaire ne doit pas obliger à modifier les responsabilités des fonctions dans les processus.

## 4. Relations entre les objets

La logique cible est la suivante :

```text
Fiche de fonction (référentiel)
          |
          | déclinée dans un contexte
          v
Poste organisationnel
     |          |           |
     |          |           +---- rattachement dans l'organigramme
     |          |
     |          +---------------- correspondance avec les rôles RACI
     |                             et les activités/processus
     |
     +--------------------------- affectation d'une personne
                                  |
                                  v
                         Fiche de poste individuelle
```

Compléments importants :

- **Organigramme** : structure les postes organisationnels et leurs relations hiérarchiques. Il ne définit pas à lui seul les responsabilités RACI.
- **RACI** : relie les fonctions ou rôles organisationnels aux activités, décisions ou livrables. Il exprime les responsabilités, pas les personnes titulaires.
- **Processus / BPMN** : décrit le déroulement des activités. Les tâches peuvent être associées explicitement à des rôles ou fonctions ; cette association ne doit pas être déduite uniquement d'un nom de personne.
- **Personnes** : sont affectées aux postes organisationnels dans le cadre de la gestion RH. Elles ne deviennent pas la clé structurelle des processus.

## 5. Règles de gestion structurantes

1. Une fiche de fonction est indépendante d'un projet et d'une personne.
2. Un poste organisationnel référence une fiche de fonction ; il peut en sélectionner ou adapter certains éléments dans les limites prévues.
3. Plusieurs postes organisationnels peuvent dériver de la même fiche de fonction.
4. Une fiche de poste individuelle référence un poste organisationnel et une personne ; elle ne remplace pas la fiche de fonction.
5. Le RACI est défini au niveau des fonctions ou rôles organisationnels, jamais au niveau des titulaires nominatifs.
6. Les liens entre RACI, postes organisationnels et activités BPMN doivent être explicites, traçables et contrôlables.
7. Une modification de titulaire ne doit pas modifier le RACI ni le contenu des processus.
8. Une modification du référentiel de fonction ne doit pas écraser les adaptations propres aux postes organisationnels.
9. Les données BPMN/XML et les tables RACI existantes restent la propriété de leurs modules respectifs. Job Architecture les référence ; il ne les duplique pas et ne les réécrit pas.
10. Les diagnostics de couverture (rôle RACI non relié, tâche BPMN non mappée, bloc requis sans activité associée) signalent des écarts à examiner ; ils ne constituent pas automatiquement une preuve de non-conformité.

## 6. Conséquences pour le module Job Architecture existant

La première tranche de développement de la PR #167 fournit une base utile, mais son vocabulaire et certaines relations doivent être alignés sur le modèle ci-dessus.

| Élément technique actuel | Interprétation cible / évolution |
|---|---|
| `JobFunction` | À conserver comme référentiel de **fiche de fonction**. |
| `ProjectJobPosition` | À comprendre et, si nécessaire, renommer conceptuellement en **poste organisationnel de projet**. Ce n'est pas une fiche de poste RH individuelle. |
| `PositionCompetencyBlocks` et exigences de compétences | À conserver pour la déclinaison contextualisée des blocs et niveaux attendus. |
| `PositionRaciActorMapping` | Point à revoir : le RACI doit être rattaché sémantiquement aux fonctions ou rôles organisationnels. Le lien actuel avec les acteurs RACI existants peut servir de correspondance de transition, mais ne doit pas faire du poste individuel ou du titulaire la source des responsabilités. |
| `PositionActivityMapping` | À conserver comme association explicite entre un poste/rôle organisationnel, un bloc applicable et une activité BPMN. Vérifier la cohérence avec le RACI sans modifier les XML sources. |
| Affectation nominative | À ajouter dans un modèle distinct de gestion des affectations et fiches de poste individuelles. |
| Organigramme | À ajouter comme capacité distincte représentant les relations hiérarchiques entre postes organisationnels. |

### Point d'attention sur le RACI existant

Le modèle actuel de la PR #167 relie une déclinaison de poste projet à un acteur RACI du projet. Ce mécanisme est une correspondance technique avec l'existant, mais il ne suffit pas à définir la bonne sémantique cible.

Il faudra vérifier comment les acteurs RACI existants représentent aujourd'hui les fonctions ou rôles, puis faire évoluer le mapping pour que :
- la responsabilité RACI reste portée par une fonction ou un rôle organisationnel ;
- un poste organisationnel contextualise ce rôle dans un projet si nécessaire ;
- une personne puisse être affectée ou remplacée sans réécriture du RACI.

Aucune modification des tables RACI existantes ni des XML BPMN ne doit être introduite implicitement dans ce travail.

## 7. Exemple complet

Une organisation dispose d'une fiche de fonction **Chef de projet** comprenant :
- CDP1 — pilotage ;
- CDP2 — coordination ;
- CDP3 — avant-vente.

Le projet A crée un poste organisationnel **Chef de projet A** :
- CDP1 requis ;
- CDP2 requis ;
- CDP3 non applicable.

Le RACI du projet associe le rôle « Chef de projet » aux activités pertinentes. Le processus BPMN décrit les tâches de pilotage et de coordination et peut référencer explicitement ce rôle.

Une personne est ensuite affectée au poste « Chef de projet A ». Sa fiche de poste individuelle précise ses objectifs, ses compétences détenues et ses conditions particulières d'exercice.

Si cette personne quitte le projet, son affectation prend fin et une autre personne peut être désignée. La fiche de fonction, le poste organisationnel, le RACI et le processus restent inchangés, sauf décision métier distincte.

## 8. Décisions à respecter pour la suite

- Conserver le module dans un bounded context autonome.
- Ne pas fusionner fiche de fonction, poste organisationnel et fiche de poste individuelle.
- Ne pas faire dépendre le RACI des personnes.
- Clarifier le mapping des acteurs RACI dans la PR #167 avant d'étendre les fonctionnalités.
- Traiter l'organigramme et l'affectation nominative comme des capacités séparées.
- Préserver les sources RACI et BPMN existantes ; les relations doivent être explicites et auditables.
- Faire valider les évolutions de modèle et leurs migrations par les tests/CI avant toute fusion ou tout déploiement.
