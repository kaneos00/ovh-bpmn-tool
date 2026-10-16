# Jeu d'exemples BPMN — Organisation et développement logiciel

Ce jeu de données sert à tester la gestion des dossiers, des processus, des projets, des liens entre processus et de la matrice RACI de KHI Flows.

## Structure métier

- **Projet chapeau : Organisation — démonstration transverse**
  - **RH — processus communs**
    - Recrutement (Process_Recrutement)
    - Évaluation des compétences (Process_EvaluationCompetences)
    - Formation (Process_Formation)
  - **Gouvernance et capacité**
    - Gouvernance — prévision de CA et planification des capacités (Process_GouvernanceCapacites)
    - Les activités d'appel BPMN invoquent Process_Recrutement et Process_Formation.
  - **Développement logiciel**
    - Développement d'un logiciel (Process_DeveloppementLogiciel)
    - Appelle le processus de gouvernance et l'évaluation des compétences avant le cycle de réalisation.

## Acteurs RACI de démonstration

- **DG** — Direction générale : projections de chiffre d'affaires et arbitrages.
- **DT** — Direction technique : compétences, architecture et qualité technique.
- **DO** — Direction des opérations : charge, recrutement, organisation des livraisons.
- **CDP** — Chef de projet : expression du besoin, planification et suivi.
- Équipe de développement : réalisation technique.

Les tâches préfixées par un rôle indiquent l'acteur métier principal. Le seed associe ces acteurs à des entrées RACI pour les processus de gouvernance et de développement.

## Fichiers BPMN

- `00-organisation-complete.bpmn` est le modèle intégré de référence : il contient les cinq processus dans un même fichier BPMN et les quatre `bpmn:callActivity` pointent vers des processus définis dans ce même fichier. C'est le fichier à importer pour vérifier les liens inter-processus.
- `01-recrutement.bpmn`, `02-evaluation-competences.bpmn`, `03-formation.bpmn`, `04-gouvernance-et-capacites.bpmn` et `05-developpement-logiciel.bpmn` sont des exemples individuels pour consulter ou importer chaque diagramme séparément. Les appels inter-processus y restent des références vers les identifiants du modèle intégré ; pour conserver leur résolution, utiliser le fichier complet. Comme l'application est un référentiel de modèles (et non un moteur d'exécution BPMN), ces appels représentent les liens de conception et ne déclenchent pas une exécution automatique.

## Installation des données de démonstration

Le seed est prévu pour une base de démonstration dédiée, lors de son initialisation. Il est idempotent par identifiant, mais n'est pas un mécanisme de migration des volumes déjà initialisés. Pour une base existante, exécuter explicitement le script SQL après sauvegarde et vérification de l'environnement.
