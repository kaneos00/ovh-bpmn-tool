# Projet de démonstration — cycle complet de développement logiciel

Ce paquet est volontairement isolé du reste du code applicatif. Il ne contient aucune migration et ne modifie pas les processus métier existants.

## Contenu

- 1 projet de démonstration, avec son explorateur de processus.
- 22 processus BPMN publiés, chacun doté de son BPMN DI pour une ouverture graphique.
- Cycle logiciel : gouvernance projet, exigences, architecture, UX/UI, développement, revue de code, CI, intégration, IVV, qualité, sécurité, release, exploitation.
- Soutien : documentation, suivi des activités, gestion des données, support informatique.
- RH : recrutement, onboarding, évaluation périodique et outboarding. Chaque processus RH contient un gateway exclusif et quatre parcours conditionnels : CDI, CDD, stage et alternance.
- Matrice RACI pour les activités BPMN.
- Postes projet reliés aux fiches de fonction et aux acteurs RACI ; activités BPMN reliées aux postes et blocs de compétences.
- Identifiants stables et opérations UPSERT ; aucune suppression de données.

## Compatibilité

Le paquet cible le schéma projet/RACI et le module Job Architecture présents sur la branche de référence `feat/documented-source-personal-data` :
- migrations projet, processus et RACI ;
- `20261110_v3_job_architecture.sql` ;
- `20261110_v3_job_function_documents.sql`.

Il n'a pas de dépendance au module Organisation permanente introduit dans une autre branche. Cela permet de le reprendre dans la branche de référence sans embarquer les évolutions d'organigramme.

## Injection

Depuis la racine du dépôt, après application des migrations du schéma :

```bash
psql -v ON_ERROR_STOP=1 -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  --set=demo_user="$DEMO_AUTH_USER" -f deploy/coolify/db/demo-software-project/00-job-functions.sql

psql -v ON_ERROR_STOP=1 -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" \
  --set=demo_user="$DEMO_AUTH_USER" -f deploy/coolify/db/demo-software-project/10-project-processes.sql

psql -v ON_ERROR_STOP=1 -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" \\
  -f deploy/coolify/db/demo-software-project/90-verify.sql
```

Dans un environnement Coolify de démonstration, copier le dossier tel quel et ajouter ces deux appels au service `schema-migrations`, après les migrations. Ne pas les ajouter au chemin de production par défaut. L'activation doit rester explicite via `DEMO_SEED_ENABLED=true`.

## Comptages attendus

- Processus BPMN : 22
- Postes projet : 17
- Acteurs RACI : 24
- Entrées RACI : 383
- Associations poste/activité : 153

## Vérifications après injection

1. Ouvrir le projet « Développement logiciel — Projet de démonstration ».
2. Vérifier les dossiers Cycle de développement logiciel, Ressources humaines et Processus de soutien.
3. Ouvrir les processus BPMN et contrôler les passerelles RH à quatre branches.
4. Vérifier la matrice RACI d'un processus métier et d'un processus RH.
5. Vérifier les postes projet, les correspondances acteurs RACI et les associations activité/compétence.
6. Relancer les deux scripts puis `90-verify.sql` : les comptages doivent rester stables et aucune donnée utilisateur ne doit être supprimée.

Les processus sont des modèles de référence de démonstration, non des procédures RH juridiquement validées. Les règles contractuelles et obligations doivent être adaptées et validées par les RH/juristes avant usage réel.
