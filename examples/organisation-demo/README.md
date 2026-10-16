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

Les fichiers sont autonomes et importables dans l'application. Les bpmn:callActivity utilisent les identifiants calledElement ci-dessus pour exprimer les liens inter-processus. Comme l'application est un référentiel de modèles (et non un moteur d'exécution BPMN), ces appels représentent les liens de conception et ne déclenchent pas une exécution automatique.

## Installation des données de démonstration

Le seed est prévu pour une base de démonstration dédiée, lors de son initialisation. Il est idempotent par identifiant, mais n'est pas un mécanisme de migration des volumes déjà initialisés. Pour une base existante, exécuter explicitement le script SQL après sauvegarde et vérification de l'environnement.
