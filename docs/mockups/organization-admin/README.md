# Maquette — administration de l’organisation V2

## Objectif

Valider l’organisation de l’IHM avant d’implémenter les pages définitives et de déployer la nouvelle interface.

## Ouvrir la maquette

Ouvrir `index.html` directement dans un navigateur. La page est autonome : aucun paquet npm, serveur, backend ou accès réseau n’est nécessaire.

Le prototype est volontairement isolé du frontend de production. Il n’appelle aucune API, ne lit ni n’écrit dans la base de données, et n’utilise que des données fictives.

## Parcours disponibles

- **Vue d’ensemble** : indicateurs et raccourcis.
- **Utilisateurs** : recherche, filtres, rôles et projets accessibles, fiche utilisateur.
- **Projets** : recherche, filtres, membres, processus associés et fiche projet.
- **Processus** : catalogue transversal, filtres par type et projet, fiche avec projets utilisateurs et source.
- **Acteurs et RACI** : synthèse de gouvernance.
- **Organisation** : paramètres et séparation des responsabilités globales.

Les actions de création, modification et export sont explicitement simulées et ne changent aucune donnée.

## Audit initial du code existant

Branche de référence examinée : `fix/v2-resource-tree-deletion-guards`.

- Le frontend dispose déjà de `/projects` et `/projects/:projectId`.
- La page projet existante combine actuellement la gestion des membres, l’association des processus, les variantes et le RACI.
- La liste des projets exposée par `GET /projects` est limitée aux projets dont l’utilisateur courant est membre ; ce n’est pas une liste organisationnelle complète.
- Les API de membres sont actuellement centrées sur un projet (`GET /projects/:projectId/members`, `PUT/DELETE /projects/:projectId/members/:userId`). Elles ne fournissent pas une vue globale des utilisateurs avec tous leurs projets.
- Il reste donc à concevoir et sécuriser une API de synthèse pour les utilisateurs et leurs adhésions, et à confirmer la source d’identité utilisée pour découvrir les utilisateurs de l’organisation.
- Le catalogue de processus doit être raccordé à la navigation transversale, en respectant les restrictions de visibilité et les distinctions commun / spécifique / variante.
- Les rôles projet `viewer`, `modeler`, `admin` ne doivent pas être confondus avec un éventuel rôle d’administration de l’organisation.

## Décisions d’architecture déjà retenues

1. Un référentiel organisationnel central de processus communs.
2. Des projets indépendants qui référencent les processus communs.
3. Des processus spécifiques à chaque projet.
4. Des variantes indépendantes dérivées d’un processus source, sans synchronisation automatique.
5. Une navigation transversale entre utilisateurs, projets et processus.
6. Les règles d’autorisation et d’intégrité restent appliquées côté backend ; masquer un bouton dans l’IHM ne constitue pas un contrôle d’accès.

## Étape après validation

Recueillir les retours sur la navigation, les colonnes des listes, les filtres et les fiches détaillées. Après validation, intégrer progressivement l’IHM réelle, créer uniquement les endpoints manquants, puis exécuter les tests de build, d’autorisation et de non-régression. La maquette ne doit pas être incluse dans l’image de production ni déployée comme interface active.

## Première intégration réelle (branche de travail)

Une première page frontend est maintenant développée sur la branche `feature/v2-admin-interface` :

- route `/admin`, accessible depuis la liste des projets ;
- onglets Utilisateurs, Projets et Processus ;
- recherche transversale et navigation vers les fiches projet ou processus ;
- données chargées à partir des endpoints V2 existants, sans modification du schéma.

**Périmètre de sécurité :** la page ne montre que les projets accessibles à l’identité courante, puis agrège les membres et les processus de ces projets. Elle ne constitue pas encore l’annuaire exhaustif de l’organisation. Avant de fournir une vue globale de tous les comptes, il faut disposer d’un rôle organisationnel explicite et d’un endpoint backend qui applique ce contrôle d’accès. Cette restriction évite de transformer un rôle d’administrateur de projet en privilège global.

Le CI de cette branche doit réussir avant de considérer cette intégration comme prête. Elle n’est ni fusionnée ni déployée.
