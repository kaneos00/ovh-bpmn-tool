# Démonstration intermédiaire BPMN V2 sur Coolify

Cette stack est destinée à une **démonstration isolée**, pas à la production ni à une base BPMN existante. Elle construit le frontend, le backend et une base PostgreSQL dédiée.

## Fonctionnalités préchargées

Au premier démarrage :
- deux projets de démonstration ;
- un processus commun partagé par les deux projets ;
- un processus spécifique au premier projet ;
- une variante indépendante dans le second projet ;
- trois diagrammes BPMN publiés ;
- des membres administrateurs et une matrice RACI avec les quatre rôles.

Le compte de démonstration défini par `DEMO_AUTH_USER` est aussi créé comme membre des deux projets.

## Déploiement

1. Dans Coolify, créer une **nouvelle ressource Compose**, distincte de toute application existante.
2. Relier le dépôt `kaneos00/ovh-bpmn-tool` et choisir explicitement la branche candidate à tester. Pour la navigation et l'espace personnel décrits dans cette version, utiliser `feature/v2-workspace-views` après vérification de la CI. Ne pas utiliser cette branche pour la production.
3. Chemin du fichier Compose : `deploy/coolify/compose.yaml`.
4. Définir les variables ci-dessous dans Coolify.
5. Définir `AUTH_SESSION_SECRET` avec une valeur aléatoire d’au moins 32 octets (par exemple générée avec `openssl rand -base64 48`). Ne pas la versionner.
6. Configurer le domaine HTTPS sur le service `frontend`, port `80`.
7. Déployer, puis ouvrir l'URL : la page de connexion BPMN Tool permet de saisir `DEMO_AUTH_USER` et `DEMO_AUTH_PASSWORD`.

### Variables obligatoires

- `DATABASE_NAME` : par exemple `bpmn_v2_demo`.
- `DATABASE_USER` : par exemple `bpmn_demo`.
- `DATABASE_PASSWORD` : mot de passe PostgreSQL dédié et robuste.
- `DEMO_AUTH_USER` : identifiant du premier administrateur et identifiant membre des projets de démonstration, par exemple `demo-v2`.
- `DEMO_AUTH_PASSWORD` : mot de passe initial du premier administrateur. Après la création du premier compte, les identifiants sont vérifiés dans PostgreSQL et non plus contre ces variables.
- `AUTH_SESSION_SECRET` : secret aléatoire d’au moins 32 octets, utilisé pour signer les cookies de session.
- Les mots de passe sont hachés avec scrypt. La gestion des comptes est réservée aux administrateurs ; le dernier administrateur actif ne peut pas être désactivé ni rétrogradé.

Ne pas réutiliser de mot de passe de production. Ne pas exposer directement le backend ou PostgreSQL sur Internet : seul le service frontend doit être routé par Coolify. Le backend vérifie les identifiants et émet un cookie de session signé, `HttpOnly` et `SameSite=Lax` (également `Secure` derrière HTTPS). Nginx valide ce cookie par `auth_request`, puis injecte les en-têtes d'identité de confiance et écrase les valeurs envoyées par le navigateur.

## Base et migrations

La base neuve est initialisée dans cet ordre : `backend/migrations/init.sql`, `20261011_v2_project_context.sql`, `20261011_v2_project_raci.sql`, `20261012_v2_project_raci_actors.sql`, puis les données de démonstration.

Les scripts PostgreSQL d'initialisation ne s'exécutent que lorsque le volume est vide. Une mise à jour ultérieure ne réappliquera pas les migrations sur un volume existant. Ne pas pointer cette stack vers une base existante.

## Réinitialisation et limites

La suppression du volume PostgreSQL efface les données de démonstration. Ne supprimer le volume que si cette perte est intentionnelle. Pour mettre à jour le schéma après le premier démarrage, ajouter une migration dédiée.

La stack fournit des comptes locaux multi-utilisateurs avec connexion par identifiant ou e-mail, mots de passe hachés, rôles globaux Administrateur/Modélisateur/Lecteur et rôles par projet. Le premier compte est initialisé comme administrateur à partir des secrets Coolify lorsque la table des comptes est vide. La stack reste une démonstration isolée : avant une exposition en production, faire auditer la configuration de sécurité, les sauvegardes et les politiques d’accès.
