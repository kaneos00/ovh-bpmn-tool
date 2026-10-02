# Multi-utilisateur — BPMN Tool

## Référence de développement

L'implémentation multi-utilisateur est développée sur la branche :

`feature/plugin-multiuser`

Elle part strictement de la référence :

`d6fb8f64a9072c4b7e7d9f66274d477778108a04`

Cette référence reste inchangée.

Au moment de cette documentation, la branche multi-utilisateur est en avance de 26 commits sur cette référence et ne présente aucun commit en retard.

## Profils utilisateurs

| Profil | Consultation | Modification | Administration utilisateurs |
|---|---:|---:|---:|
| **consultation** | Oui | Non | Non |
| **editor** | Oui | Oui | Non |
| **admin** | Oui | Oui | Oui |

### Consultation

Le profil `consultation` permet de consulter les processus et leurs contenus.

Il ne permet pas de créer, modifier, supprimer ou publier des processus et ne permet pas d'accéder à l'administration des utilisateurs.

### Editor

Le profil `editor` correspond à :

**consultation + modification**

Il peut consulter et modifier les processus, créer/supprimer des ressources et publier les modifications.

Il ne peut pas administrer les comptes utilisateurs.

### Admin

Le profil `admin` possède les droits du profil `editor` et peut en plus gérer les utilisateurs.

## Authentification

Endpoints ajoutés :

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/setup`

La connexion utilise un nom utilisateur, un mot de passe et un token de session Bearer.

Les tokens sont générés aléatoirement puis stockés sous forme de hash SHA-256 côté serveur.

La durée d'une session est actuellement de **8 heures**.

### Mots de passe

Les mots de passe ne sont pas stockés en clair.

Le service utilise `scrypt` avec un sel aléatoire et une comparaison en temps constant.

Aucun mot de passe administrateur par défaut n'est codé dans le projet.

## Première installation

L'endpoint :

`POST /auth/setup`

permet de créer le premier compte administrateur.

Cette opération est uniquement autorisée lorsque la table `users` est vide.

Le mot de passe doit contenir au minimum **12 caractères**.

Une fois le premier utilisateur créé, l'endpoint de configuration initiale ne peut plus être utilisé.

Le frontend fournit également une page :

`/setup`

accessible depuis l'écran de connexion.

Cette page permet de créer le premier administrateur sans utiliser directement l'API.

## Gestion des utilisateurs

Les endpoints suivants sont réservés au profil `admin` :

- `GET /auth/users`
- `POST /auth/users`
- `PUT /auth/users/:id`
- `DELETE /auth/users/:id`

La création d'un utilisateur permet de choisir :

- `consultation`
- `editor`
- `admin`

Un administrateur peut également modifier le nom affiché, changer le mot de passe, changer le profil et activer/désactiver un compte.

Une protection empêche de supprimer ou désactiver le **dernier administrateur actif**.

## Autorisation backend

L'authentification est séparée de l'autorisation.

Le backend contient :

- `MultiUserAuthGuard` pour vérifier le token Bearer ;
- `Roles` pour déclarer les profils autorisés ;
- `RolesGuard` pour appliquer les profils ;
- `UserRole` pour définir les rôles.

Les droits sont définis par :

- `consultation` : lecture ;
- `editor` : lecture + modification ;
- `admin` : lecture + modification + administration.

Les contrôles sont effectués côté serveur. Le masquage des actions dans le frontend ne constitue donc pas la seule protection.

## Frontend

Les éléments suivants ont été ajoutés :

- écran de connexion ;
- écran de première installation ;
- fournisseur d'authentification `AuthProvider` ;
- protection globale des routes avec `AuthGate` ;
- protection des routes de modification avec `ModifyGate` ;
- protection de l'administration avec `AdminGate` ;
- écran d'administration des utilisateurs ;
- ajout automatique du token Bearer aux appels API.

Les utilisateurs `consultation` peuvent donc accéder aux fonctions de consultation sans accéder aux écrans de modification.

## Base PostgreSQL

Une migration dédiée a été ajoutée :

`backend/migrations/002-multiuser.sql`

Elle crée :

### Table `users`

- `id`
- `username`
- `displayName`
- `passwordHash`
- `role`
- `enabled`
- `createdAt`
- `updatedAt`

### Table `user_sessions`

- `id`
- `userId`
- `tokenHash`
- `createdAt`
- `expiresAt`

La migration est conçue pour être idempotente.

Le schéma multi-utilisateur a également été intégré à :

`backend/migrations/init.sql`

afin que les nouvelles installations créent directement les tables nécessaires.

## Mise à jour d'une installation existante

Pour une base PostgreSQL existante, il faut exécuter une fois :

```bash
psql "$DATABASE_URL" -f backend/migrations/002-multiuser.sql
```

ou l'équivalent depuis le conteneur PostgreSQL utilisé par Coolify.

Pour une nouvelle base, `init.sql` contient directement le schéma multi-utilisateur.

## Sécurité

Principes actuellement appliqués :

- aucun mot de passe par défaut ;
- mots de passe hashés avec `scrypt` ;
- tokens de session aléatoires ;
- stockage serveur des tokens sous forme de hash ;
- expiration des sessions après 8 h ;
- contrôle des rôles côté backend ;
- impossibilité de supprimer le dernier administrateur actif ;
- contrôle frontend complémentaire.

Pour une utilisation en production, l'utilisation d'un cookie de session `HttpOnly + Secure + SameSite` pourra être envisagée à la place du stockage du token côté navigateur.

## Validation

La branche a été comparée à la référence :

`d6fb8f64a9072c4b7e7d9f66274d477778108a04`

Résultat constaté :

- statut : **ahead**
- commits supplémentaires : **35**
- commits manquants par rapport à la référence : **0**

Le build complet n'a pas encore été exécuté dans l'environnement de travail utilisé pour cette implémentation.

La prochaine étape recommandée est donc un déploiement/test sur Coolify avec :

1. application de la migration PostgreSQL ;
2. création du premier administrateur via `/setup` ;
3. création d'un utilisateur `consultation` ;
4. création d'un utilisateur `editor` ;
5. vérification des droits de lecture ;
6. vérification que `consultation` ne peut pas modifier ;
7. vérification que `editor` peut modifier ;
8. vérification de l'administration réservée à `admin`.

## Conservation des anciennes versions de code

Conformément à la règle de développement du projet, les portions de code modifiées lors de l'intégration ont été conservées sous forme de commentaires lorsque cela était pertinent, afin de faciliter la comparaison et le retour arrière.

## Fichiers principaux ajoutés ou modifiés

### Backend

- `backend/migrations/002-multiuser.sql`
- `backend/migrations/init.sql`
- `backend/src/modules/MultiUser/domain/userRole.ts`
- `backend/src/modules/MultiUser/infrastructure/user.ormEntity.ts`
- `backend/src/modules/MultiUser/infrastructure/userSession.ormEntity.ts`
- `backend/src/modules/MultiUser/infrastructure/multiUserAuth.guard.ts`
- `backend/src/modules/MultiUser/infrastructure/roles.decorator.ts`
- `backend/src/modules/MultiUser/infrastructure/roles.guard.ts`
- `backend/src/modules/MultiUser/multiUser.module.ts`
- `backend/src/modules/MultiUser/multiUser.service.ts`
- `backend/src/modules/MultiUser/multiUser.controller.ts`

### Frontend

- `frontend/src/Containers/Login/index.tsx`
- `frontend/src/Containers/Setup/index.tsx`
- `frontend/src/Containers/UserAdministration/index.tsx`
- `frontend/src/Providers/Auth/Auth.provider.tsx`
- `frontend/src/Providers/Auth/AuthGate.tsx`
- `frontend/src/Providers/Auth/ModifyGate.tsx`
- `frontend/src/Providers/Auth/AdminGate.tsx`
- `frontend/src/shared/api/apiClient.ts`
- `frontend/src/routes.tsx`
- `frontend/src/MainContainer.tsx`

## État actuel

La fonctionnalité multi-utilisateur est implémentée sur sa branche dédiée :

`feature/plugin-multiuser`

Elle n'est pas fusionnée dans `main`.

La référence commune :

`d6fb8f64a9072c4b7e7d9f66274d477778108a04`

reste donc disponible comme base stable pour les autres plugins.
