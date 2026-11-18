# Jeu de données de démonstration — organisation permanente

Ce jeu de données complète le catalogue BPMN/RACI déjà chargé par `seed-organization-demo.sql`.
Il est destiné exclusivement aux environnements de démonstration et de test dédiés.

## Activation au déploiement

Dans les variables d'environnement Coolify :

- `DEMO_SEED_ENABLED=true` : applique le jeu de données après les migrations, à chaque démarrage du service `schema-migrations`.
- `DEMO_SEED_ENABLED=false` (valeur par défaut) : n'insère aucune donnée d'organisation.

Le script est idempotent : les identifiants UUID sont stables et les lignes de démonstration sont mises à jour en cas de nouvelle exécution. Il ne supprime aucune donnée métier et ne réinitialise pas le volume PostgreSQL.

Le compte `DEMO_AUTH_USER` est utilisé comme titulaire de l'affectation active. Aucun nom ou compte réel n'est codé en dur. Pour voir le bloc « Mon organisation & mes responsabilités », se connecter avec ce compte.

## Contenu

| Élément | Quantité | Utilité de test |
|---|---:|---|
| Postes permanents | 8 | Consultation, recherche, filtres, édition et désactivation |
| Relations hiérarchiques | 7 | Organigramme multi-niveaux |
| Affectation active | 1 | Contexte organisationnel de l'utilisateur de démonstration |
| Affectation historique | 1 | Conservation et lecture de l'historique |
| Postes vacants | 7 | Affectations individuelles/groupées et désactivation |

Arborescence :

- Direction générale
  - Direction des opérations
    - Chef de projet
    - Responsable ressources humaines
  - Direction technique
    - Responsable développement
      - Développeur
    - Responsable qualité

## Parcours de vérification

1. Ouvrir **Administration > Postes** : vérifier les 8 lignes, les postes vacants et le titulaire du compte de démonstration.
2. Filtrer par code ou intitulé, trier les colonnes et modifier un intitulé.
3. Sélectionner plusieurs postes vacants et tester une affectation groupée.
4. Retirer un titulaire avec une date de fin ; vérifier que l'historique reste conservé.
5. Désactiver un poste vacant ; vérifier qu'un poste occupé ne peut pas être désactivé.
6. Ouvrir **Structure** et vérifier les 3 niveaux de rattachement.
7. Se connecter avec `DEMO_AUTH_USER` et vérifier le bloc personnel. Le jeu de données ne crée volontairement pas de faux comptes utilisateurs.

## Limites

Ce jeu de données initialise le référentiel des postes permanents, les affectations et la hiérarchie. Il ne crée pas de faux comptes supplémentaires et ne modifie pas les données RACI/BPMN existantes. Les liens entre postes projet et postes permanents restent à tester avec les associations créées depuis l'interface projet.
