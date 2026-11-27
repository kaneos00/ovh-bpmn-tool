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
| Postes permanents | 19 | Consultation, recherche, filtres, édition et désactivation |
| Relations hiérarchiques | 18 | Organigramme multi-niveaux |
| Affectation active | 1 | Contexte organisationnel de l'utilisateur de démonstration |
| Affectation historique | 1 | Conservation et lecture de l'historique |
| Postes vacants | 18 | Affectations individuelles/groupées et désactivation |
| Fiches de fonction | 17 | Missions, rattachement, activités et intitulés alternatifs |
| Blocs de compétences | 10 | Compétences techniques, méthodologiques et comportementales |
| Compétences de référence | 30 | Niveaux de référence par compétence |
| Sections d'activités | 17 | Activités et tâches structurées par fonction |

Arborescence de démonstration (les rattachements sont indicatifs et adaptables) :

- Direction générale
  - Direction des opérations
    - Chef de projet
      - Responsable produit et exigences
        - Designer UX/UI
      - Facilitateur agile
    - Rédacteur technique et documentaire
    - Responsable ressources humaines
  - Direction technique
    - Architecte logiciel et système
      - Ingénieur systèmes et intégration
      - Ingénieur données et bases de données
    - Responsable développement
      - Ingénieur développement
      - Ingénieur DevOps et mise en production
    - Responsable qualité
      - Ingénieur IVV
    - Ingénieur sécurité applicative


## Fiches de fonction — développement logiciel

Les fiches sont créées dans le référentiel **Fonctions** du module Job Architecture. Elles sont indépendantes des titulaires et peuvent être réutilisées dans plusieurs projets. Chaque fiche comprend une mission, un rattachement hiérarchique indicatif, des intitulés alternatifs, une section d'activités avec tâches et des blocs de compétences de référence.

| Code | Fonction |
|---|---|
| DO | Directeur des opérations |
| DT | Directeur technique |
| CDP | Chef de projet |
| POBA | Responsable produit et exigences (Product Owner / Business Analyst) |
| ARCH | Architecte logiciel et système |
| TL | Responsable développement / Tech Lead |
| DEV | Ingénieur développement logiciel |
| IVV | Ingénieur intégration, vérification et validation |
| QUAL | Responsable qualité logiciel |
| DEVOPS | Ingénieur DevOps et mise en production |
| SYS | Ingénieur systèmes et intégration |
| UX | Designer UX/UI |
| SEC | Ingénieur sécurité applicative |
| DATA | Ingénieur données et bases de données |
| SM | Facilitateur agile |
| DOC | Rédacteur technique et documentaire |
| SUPPORT | Ingénieur support et maintenance applicative |

Les postes permanents correspondants sont liés aux fiches de fonction. Le poste de direction générale et la fonction RH restent présents dans l'organigramme mais ne sont pas artificiellement transformés en rôles techniques de projet.

Les compétences sont regroupées en 10 blocs : pilotage et gouvernance, produit et exigences, architecture et conception, ingénierie logicielle, IVV, qualité, industrialisation et exploitation, cybersécurité, données et persistance, collaboration. Les niveaux indiqués sont des niveaux de référence initiaux, à adapter selon le contexte et la séniorité.

Les responsabilités peuvent être cumulées dans une petite équipe : par exemple Product Owner et Business Analyst, architecte et Tech Lead, ou DevOps et ingénieur systèmes. La séparation des fiches sert à clarifier les responsabilités, pas à imposer 15 personnes distinctes.

## Parcours de vérification

1. Ouvrir **Administration > Postes** : vérifier les 19 lignes, les postes vacants et le titulaire du compte de démonstration.
2. Ouvrir le référentiel **Fonctions** : vérifier les 17 fiches, leurs missions, activités et compétences.
3. Ouvrir une fiche (par exemple IVV ou Développement) et vérifier le rattachement, les tâches et les blocs de compétences.
4. Filtrer par code ou intitulé, trier les colonnes et modifier un intitulé.
5. Sélectionner plusieurs postes vacants et tester une affectation groupée.
6. Retirer un titulaire avec une date de fin ; vérifier que l'historique reste conservé.
7. Désactiver un poste vacant ; vérifier qu'un poste occupé ne peut pas être désactivé.
8. Ouvrir **Structure** et vérifier les rattachements sur plusieurs niveaux.
9. Se connecter avec `DEMO_AUTH_USER` et vérifier le bloc personnel. Le jeu de données ne crée volontairement pas de faux comptes utilisateurs.

## Limites

Ce jeu de données initialise le référentiel des fonctions et compétences, les fiches d'activités, les postes permanents, les affectations et la hiérarchie. Il ne crée pas de faux comptes supplémentaires et ne modifie pas les données RACI/BPMN existantes. Les liens entre postes projet et postes permanents restent à tester avec les associations créées depuis l'interface projet.
