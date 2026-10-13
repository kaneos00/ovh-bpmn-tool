# Administration transversale V2

Cette fonctionnalité ajoute une première vue organisationnelle de lecture pour les utilisateurs, projets et processus.

## API

`GET /projects/administration/overview`

- Protégée par le groupe ACL organisationnel explicite `bpmn-tool-admin` (l'en-tête de groupes doit contenir une valeur correspondant au format `bpmn-tool-admin-<suffixe>` attendu par le garde ACL).
- Retourne les projets, les adhésions et rôles projet, ainsi que les processus et les projets qui les référencent.
- Ne modifie aucune donnée et ne remplace pas les contrôles d'accès déjà appliqués aux opérations projet/processus.
- Distingue les usages `common`, `project-specific` et `variant`, et conserve la référence `sourceResourceId` des variantes.

Les routes d’administration suivantes sont également réservées au groupe ACL `bpmn-tool-admin` :

- `POST /projects` : créer un projet et attribuer le rôle `admin` au créateur.
- `PUT /projects/administration/projects/:projectId` : modifier le nom et la description.
- `DELETE /projects/administration/projects/:projectId` : supprimer un projet uniquement lorsqu’il ne possède plus de processus associés.
- `PUT /projects/administration/projects/:projectId/members/:userId` : attribuer ou modifier un rôle de projet.
- `DELETE /projects/administration/projects/:projectId/members/:userId` : retirer une adhésion, en conservant la protection du dernier administrateur.

Les modifications d’adhésion verrouillent la ligne du projet dans une transaction afin de sérialiser les retraits/rétrogradations concurrents et éviter de supprimer simultanément tous les administrateurs.

Ces routes dédiées évitent d’exiger que l’administrateur organisationnel soit membre de chaque projet. Les opérations BPMN de modélisation restent soumises aux droits projet habituels.

## IHM

- `/organization/users` : identifiants connus par les adhésions et tous leurs projets/rôles enregistrés.
- `/organization/projects` : nombre de membres et répartition des processus par type d'usage.
- `/organization/processes` : projets utilisateurs et usages du processus, avec un panneau de détail.
- Un lien depuis les pages projets permet d'ouvrir cette administration.

## Limite connue — annuaire d'identité

Le backend BPMN V2 ne possède pas de table d'identité globale : les identifiants viennent du proxy d'authentification et les informations persistées concernent les adhésions aux projets. Cette première version liste donc les utilisateurs présents dans au moins une adhésion. Elle ne peut pas inventer ou afficher les comptes de l'organisation qui n'ont jamais été ajoutés à un projet. Pour couvrir ces comptes, il faudra connecter une source d'identité/annuaire approuvée ou introduire un référentiel utilisateur explicite.

Les rôles affichés dans l'IHM sont des rôles de projet (`viewer`, `modeler`, `admin`), pas des rôles globaux de l'organisation. L'accès à la vue transversale est protégé par un groupe ACL d'administration organisationnelle distinct. Il ne réutilise pas le groupe de lecture-écriture, afin de ne pas exposer les métadonnées de tous les projets à tous les utilisateurs qui peuvent simplement modifier des ressources.

## Validation

Le test unitaire `project-administration-overview.spec.ts` vérifie l'agrégation des adhésions, la réutilisation d'un processus commun, la conservation de la source d'une variante, la mise à jour/suppression de projet et les protections d’administration.

La maquette HTML de conception reste dans la PR #5 et demeure indépendante de cette implémentation. Cette PR apporte la première intégration réelle, mais elle doit passer la CI avant toute fusion ou déploiement.


## Architecture de connexion et évolution SSO (à préserver)

La page et les identifiants configurés par variables d’environnement correspondent actuellement à une **stratégie de connexion locale réservée à la démonstration**. Ils ne constituent pas un annuaire utilisateur de production.

Le code doit rester prêt à accueillir ultérieurement un SSO d’entreprise, idéalement **OpenID Connect (OIDC) Authorization Code Flow avec PKCE**, sans réécrire l’application :

- **Contrat de session applicatif stable** : l’application consomme le cookie signé `bpmn_session` et les en-têtes d’identité injectés côté serveur après validation de session. Le mécanisme qui établit cette session doit rester découplé de l’interface BPMN et des contrôles ACL.
- **Stratégies distinctes** : conserver la connexion locale de démonstration isolée ; ajouter plus tard des routes backend dédiées de démarrage/callback OIDC et un service de validation des réponses du fournisseur d’identité. Ne pas placer la logique OIDC dans le contrôleur de démonstration.
- **Frontière de confiance serveur** : valider côté serveur la signature, l’émetteur (`iss`), l’audience (`aud`), l’expiration, l’état/nonce et le flux de redirection. Ne jamais accepter de groupes ou rôles envoyés par le navigateur ; mapper explicitement les claims fiables de l’IdP vers l’identité et les groupes applicatifs.
- **Autorisation séparée de l’authentification** : une authentification SSO réussie ne donne pas automatiquement les droits d’administration. Les groupes organisationnels et les rôles de projet doivent rester vérifiés par les gardes et services d’autorisation existants.
- **Configuration future** : réserver un espace de configuration dédié à l’IdP (issuer, client ID, redirect URI, scopes, audiences autorisées et secret fourni par un gestionnaire de secrets). Ne pas réutiliser `DEMO_AUTH_USER`, `DEMO_AUTH_PASSWORD` ou `DEMO_AUTH_GROUPS` pour OIDC.
- **Expérience utilisateur** : conserver cette page comme shell de connexion ; ajouter ultérieurement un bouton « Se connecter avec l’organisation » qui redirige vers un endpoint backend. La connexion locale peut rester activée uniquement pour les environnements de démonstration/développement.
- **Audit** : rechercher les marqueurs `FUTURE SSO/OIDC` et `AUTHENTICATION ARCHITECTURE / FUTURE SSO` dans `backend/src/auth/auth.controller.ts`, `backend/src/config.ts` et `frontend/src/Containers/Login/Login.container.tsx` avant d’implémenter l’intégration.

Aucun fournisseur SSO n’est installé ni activé dans cette modification. Ces notes documentent les frontières d’architecture à conserver pour éviter un remplacement ultérieur de la session applicative et des contrôles ACL.
