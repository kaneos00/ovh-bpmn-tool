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

Le test unitaire `project-administration-overview.spec.ts` vérifie l'agrégation des adhésions, la réutilisation d'un processus commun et la conservation de la source d'une variante.

La maquette HTML de conception reste dans la PR #5 et demeure indépendante de cette implémentation. Cette PR apporte la première intégration réelle, mais elle doit passer la CI avant toute fusion ou déploiement.
