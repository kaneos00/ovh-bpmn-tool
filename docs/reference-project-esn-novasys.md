# Projet de référence KHI-FLOWS — ESN NovaSys

## Finalité

NovaSys est une entreprise fictive de services numériques (ESN). Ce projet constitue le jeu de données métier de référence pour les démonstrations, essais fonctionnels et validations de non-régression : démonstrations, essais fonctionnels et non-régression des processus, de la navigation, du RACI et des informations documentées.

- Projet : **Référence métier — ESN NovaSys**
- Identifiant stable : `8a000000-0000-4000-8000-000000000001`
- Entreprise : **ESN NovaSys**
- Données : entièrement fictives
- Base applicative : commit de référence `889adf2` (registre documentaire central du projet conservé)\n- Ce jeu de données n’ajoute aucune migration applicative ; il utilise les migrations déjà présentes dans cette base
- Isolation : projet, ressources, acteurs RACI et informations documentées propres au jeu de données
- Exécution : explicite après les migrations, jamais au démarrage automatique d'une base de démonstration

## Présentation de l'entreprise

NovaSys conçoit, réalise, déploie et maintient des solutions logicielles pour des clients professionnels. Elle assure également son fonctionnement interne : ressources humaines, gestion financière, achats, support informatique, gestion des équipements, sécurité et pilotage de la capacité.

Son organisation fonctionnelle de référence est la suivante :

- **Direction générale** — stratégie, budget, arbitrages, validation des engagements majeurs.
- **Direction commerciale** — prospection, qualification des opportunités, offres et contractualisation.
- **Ressources humaines** — recrutement, contrat de travail, intégration, équipements, absences, entretiens, formation et compétences.
- **Direction des opérations** — allocation des ressources, capacité, affectations, suivi de la réalisation et coordination des projets.
- **Finance et administration** — achats, commandes, facturation, notes de frais, paie et rentabilité.
- **Systèmes d'information internes** — support, parc, habilitations, sécurité, sauvegardes et restauration.
- **Pôle réalisation logicielle** — analyse métier, gestion de projet, architecture, développement, qualité et déploiement.
- **Pôle services et maintenance** — prise en charge des logiciels livrés, support client, incidents, correctifs, évolutions, mises en production, revues de service et réversibilité.

Cette organisation est une **description métier du jeu de données**, pas une nouvelle structure organisationnelle persistée dans le schéma V0.8.

## Rôles métier utilisés dans les processus

Le registre des acteurs RACI du projet représente des **rôles fonctionnels ou collectifs**, et non des comptes utilisateurs ni des fiches de poste individuelles.

| Domaine | Acteurs RACI |
|---|---|
| Direction et commerce | Direction générale, Direction commerciale |
| Ressources humaines | Responsable RH |
| Opérations et projets | Manager opérationnel, Direction des opérations, Chef de projet |
| Finance et achats | Responsable financier, Gestionnaire paie, Acheteur |
| SI et sécurité | Responsable IT, Responsable sécurité, Support N1 |
| Réalisation logicielle | Support N2 / développeur, Tech lead / architecte, Équipe de développement, Responsable qualité / test, Business analyst, Responsable DevOps |
| Services client | Service manager, Représentant client |

Les acteurs RACI sont enregistrés dans `project_raci_actors` et leurs responsabilités par activité dans `project_raci_entries`. Les libellés d'acteurs présents dans les BPMN sont alignés sur ce registre. Les rôles de projet `viewer`, `modeler` et `admin` restent des droits d'accès techniques ; ils ne sont pas des fonctions métier.

## Périmètre des processus

| Famille | Nombre | Couverture |
|---|---:|---|
| GOV — Gouvernance et pilotage | 4 | Pilotage, opportunités, projets clients, commandes et facturation |
| HR — Ressources humaines | 8 | Recrutement, contrat, onboarding, matériel, affectations, absences, évaluations et formation |
| FIN — Finance et administration | 4 | Notes de frais, paie, achats, temps et rentabilité |
| IT — SI interne | 4 | Support interne, parc, accès et sauvegardes |
| DEL — Réalisation logicielle | 5 | Exigences, conception/développement, tests, recette client et livraison |
| MNT — Maintenance client | 8 | Processus parent MNT00 et sept sous-processus de maintenance |

Le processus parent **MNT00 — Gérer le service et la maintenance du logiciel** regroupe les processus enfants de prise en charge, support client, maintenance corrective, demande d'évolution, mise en production, revue de service et réversibilité.

## Informations documentées et applications

Le jeu de données comprend des documents métier et des systèmes fictifs utilisés dans les diagrammes :

- ITSM : gestion des tickets internes et clients ;
- ERP : achats, commandes, facturation et comptabilité ;
- SIRH : dossiers collaborateurs, absences et paie ;
- CMDB : actifs, configurations et affectations ;
- dépôt Git : code source, revues et versions ;
- CI/CD : intégration, tests et déploiements ;
- supervision : disponibilité, alertes et métriques ;
- base documentaire : procédures, dossiers projet et connaissances.

Les références BPMN `DataObjectReference` et `DataStoreReference` sont reliées au registre `project_documented_sources` par `project_documented_source_references`. Le seed renseigne également le champ `containsPersonalData` : il est activé pour les documents RH et paie concernés (contrat de travail, calendrier des absences, compte rendu d’entretien, variables et bulletin de paie). Les autres informations sont explicitement marquées à `false`. La colonne `validUntil` reste facultative et est laissée à sa valeur par défaut.

## Préparation de la suite — hors périmètre V0.8

Les éléments suivants sont volontairement **non développés et non persistés** dans cette livraison :

- référentiel des postes et des fiches de poste ;
- missions, activités détaillées et compétences associées ;
- rattachement nominatif des collaborateurs à des postes ;
- correspondances entre postes, rôles RACI et activités BPMN.

La description fonctionnelle ci-dessus fournit une base métier cohérente pour réaliser ces correspondances plus tard. Il ne faut pas confondre les acteurs RACI actuels avec des postes, des collaborateurs ou des rôles d'accès.

## Installation

1. Appliquer les migrations applicatives déjà présentes dans la base de référence, notamment le contexte projet, le RACI et les informations documentées.
2. Choisir explicitement la base de démonstration cible.
3. Exécuter `seed.sql` avec la variable psql `demo_user` définie sur l'identifiant de `DEMO_AUTH_USER`.
4. Ouvrir le projet **Référence métier — ESN NovaSys** et vérifier les processus, les acteurs RACI et les informations documentées.

Le seed est idempotent par identifiant et met à jour le marqueur `containsPersonalData` lors d’une réexécution. Il ne modifie pas les graines historiques et n'est pas appelé automatiquement au démarrage.

## Réinitialisation

Pour supprimer uniquement le jeu de données NovaSys, exécuter `reset.sh` avec `CONFIRM_REFERENCE_PROJECT_RESET=YES`, après avoir vérifié la base ciblée. Le script supprime les associations du projet et les ressources non partagées, en conservant toute ressource encore référencée par un autre projet. Réexécuter ensuite `seed.sql`.

## Contrat de non-régression V0.8

- Le projet est visible et accessible au compte de démonstration.
- L'arborescence comporte les six familles de processus.
- Les 33 processus BPMN sont publiés et ouvrables.
- Les appels parent/enfant de maintenance restent cohérents.
- Les acteurs RACI utilisés dans les matrices existent dans le registre du projet.
- Les affectations RACI pointent vers des activités BPMN existantes.
- Les informations documentées et les références de données sont affichées.
- Le reset suivi d'un nouveau seed recrée le jeu de données sans altérer les autres projets.

Les validations SQL en base réelle et l'essai visuel restent à effectuer avant de déclarer le jeu de données prêt pour déploiement.
