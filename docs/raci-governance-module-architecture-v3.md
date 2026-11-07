# Architecture du module autonome RACI Governance — V3

- **Statut :** contrat d'architecture issu de l'audit initial du code V3
- **Branche d'audit :** `feat/raci-actor-rationalization-v3`
- **Branche de référence auditée :** `feat/issue-125-v3-integration`
- **Commit audité :** `e9c3eef48d413324f0c14afd722a2f2c69e541ee`
- **Objectif :** développer un module autonome, testable et intégrable à la V3 sans couplage au Viewer, au Modeleur ni au workflow #125.

## 1. Décision d'architecture

Le composant sera un module NestJS dédié, nommé `RaciGovernanceModule`, placé dans :

```
backend/src/modules/RaciGovernance/
  domain/
  application/
  infrastructure/
    entities/
    controllers/
    persistence/
    adapters/
  raciGovernance.module.ts
  README.md
```

Le module encapsule ses règles métier, ses services applicatifs, ses contrôleurs, ses entités propres et ses migrations. Il expose des contrats applicatifs stables ; les autres modules ne doivent pas accéder directement à ses tables.

Le module ne remplace pas le RACI projet actuel. Il ajoute une couche de gouvernance et de correspondance au-dessus des acteurs locaux déjà enregistrés.

### Frontières

- **Domaine :** acteurs de référence, correspondances, candidats, décisions, opérations de remplacement, audit.
- **Application :** cas d'usage, transactions, règles de rapprochement, prévisualisation et exécution des remplacements.
- **Infrastructure :** PostgreSQL/TypeORM, API NestJS, adaptateurs de lecture des acteurs RACI et des contenus BPMN.
- **Intégration :** import du module dans `BpmnToolAppModule` et branchement de son entrée Administration uniquement lorsque les contrats sont testés.

Le module ne doit pas importer de composants React du Viewer/Modeleur, ni modifier les contrôleurs RACI existants pour fonctionner. Les intégrations au RACI projet et aux ressources BPMN passent par des adaptateurs dédiés et des ports explicitement documentés.

## 2. Constat vérifié dans la V3 auditée

### Acteurs et affectations RACI

- `project_raci_actors` est le registre local, avec `projectId`, `name`, `normalizedName`, `active` et `origin`.
- L'unicité actuelle est `(projectId, normalizedName)`.
- `project_raci_entries` stocke `projectId`, `resourceId`, `taskId`, `taskName`, `actorName` et le code R/A/C/I.
- L'affectation utilise encore le texte `actorName`, et non une FK vers l'acteur local.
- Le contrôleur existant valide les acteurs enregistrés et réécrit `actorName` lors du renommage local, dans une transaction. Il protège les collisions de cellules RACI.
- `taskId` est l'identifiant BPMN stable de l'élément ; `taskName` est un libellé conservé dans la matrice.

Sources :
- [projectRaciActor.ormEntity.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/entities/projectRaciActor.ormEntity.ts)
- [projectRaciEntry.ormEntity.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/entities/projectRaciEntry.ormEntity.ts)
- [project-raci.controller.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/controllers/project-raci.controller.ts)
- [20261012_v2_project_raci_actors.sql](../blob/feat/issue-125-v3-integration/backend/migrations/20261012_v2_project_raci_actors.sql)

### Périmètre organisationnel et ACL

- Aucun `organizationId` ni entité tenant n'a été observé dans les entités projet auditées.
- Le périmètre transversal actuel est l'ensemble des projets de cette instance/base, protégé par le groupe organisationnel `bpmn-tool-admin-*`.
- Le garde ACL applique le groupe requis ; le service `ProjectResourceAccessService` expose notamment `hasOrganizationAdminRole`, `getAuthenticatedUserId` et `assertProjectRole`.
- Les rôles projet réellement présents sont `viewer`, `modeler` et `admin`.
- Les rôles projet ne sont pas des rôles globaux. Le groupe `bpmn-tool-admin-*` est distinct des rôles projet.
- L'API d'administration transversale existante est protégée par `@UseAcl([UserGroup.Admin])`.

Sources :
- [UserGroup.ts](../blob/feat/issue-125-v3-integration/backend/src/shared-kernel/utils/UserGroup.ts)
- [acl.guard.ts](../blob/feat/issue-125-v3-integration/backend/src/shared-kernel/modules/acl/infrastructure/acl.guard.ts)
- [projectResourceAccess.service.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/projectResourceAccess.service.ts)
- [projectMember.ormEntity.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/entities/projectMember.ormEntity.ts)
- [project.controller.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/controllers/project.controller.ts)

**Conséquence :** ne pas ajouter de colonne `organizationId` dans le MVP. Le schéma initial sera explicitement mono-organisation par base. Une future multi-organisation nécessitera un vrai modèle de tenant et une migration dédiée, pas une hypothèse implicite.

### BPMN, versions et publication

- Les diagrammes BPMN sont des ressources `resources` de type `process`.
- Le XML est stocké dans `contents.content`, avec `resourceId`, `status`, `version`, `updatedBy` et les dates d'audit.
- Les états de contenu présents sont `draft`, `published` et `obsolete`.
- Le workflow de propositions #125 possède ses propres tables et référence explicitement les contenus source publiés, soumis et les ressources clones.
- Les processus communs sont en lecture seule via les endpoints génériques ; l'administration organisationnelle possède des chemins d'accès spécifiques.
- Le module devra traiter le XML comme un document BPMN : parsing XML, sélection de champs métier autorisés, conservation des IDs/références/DI et génération d'une nouvelle version brouillon. Il ne doit jamais faire un remplacement textuel global dans le XML brut.

Sources :
- [content.ormEntity.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ResourceContext/infrastructure/entities/content.ormEntity.ts)
- [Content.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ResourceContext/shared/types/Content.ts)
- [content.controller.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ResourceContext/infrastructure/controllers/content.controller.ts)
- [processChangeProposal.ormEntity.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/entities/processChangeProposal.ormEntity.ts)
- [process-change-proposal.controller.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts)

### Migrations et tests

- Les migrations existantes sont des scripts SQL versionnés dans `backend/migrations`.
- Le README de ProjectContext précise que la synchronisation TypeORM est désactivée et que les migrations sont appliquées explicitement dans l'ordre.
- Les tests backend utilisent Jest avec les spécifications `*.spec.ts`.
- L'application est assemblée dans `backend/src/app.module.ts`, qui importe les modules fonctionnels.

Sources :
- [ProjectContext README](../blob/feat/issue-125-v3-integration/backend/src/modules/ProjectContext/README.md)
- [backend/package.json](../blob/feat/issue-125-v3-integration/backend/package.json)
- [app.module.ts](../blob/feat/issue-125-v3-integration/backend/src/app.module.ts)

## 3. Contrat d'intégration proposé

### Module autonome et dépendances explicites

Le module doit pouvoir être ajouté à l'application par une seule intégration de module dans `BpmnToolAppModule`. Il pourra importer `ProjectContextModule` pour réutiliser les entités et le service d'autorisation exporté, sans que `ProjectContextModule` importe en retour `RaciGovernanceModule`. Cette direction évite une dépendance circulaire.

Les entités existantes nécessaires seront enregistrées via `TypeOrmModule.forFeature` dans le module autonome. Les tables propres à la gouvernance restent la propriété de `RaciGovernanceModule`.

### Schéma additif de départ

Tables candidates, à figer après le lot 0 complet :

- `raci_reference_actors` : identité canonique et type d'acteur.
- `raci_actor_mappings` : lien actif entre un acteur local `project_raci_actors.id` et une référence.
- `raci_actor_match_candidates` : paires candidates, scores détaillés, version d'algorithme et état.
- `raci_actor_decisions` : décisions humaines et justifications.
- `raci_actor_events` : journal append-only des opérations.
- `raci_label_replacement_jobs` et `raci_label_replacement_items` : prévisualisation, sélection, exécution, erreurs et annulation des remplacements en masse.

Contraintes de sécurité et d'intégrité :
- aucune FK ou colonne tenant fictive ;
- aucune suppression en cascade des historiques ;
- une seule correspondance active par acteur local ;
- références et correspondances archivées plutôt que supprimées ;
- aucune réécriture des affectations RACI lors d'une simple mise en correspondance ;
- toutes les mutations transversales vérifient le groupe organisationnel côté serveur ;
- transactions et verrouillage optimiste/contrôle de version pour les contenus BPMN ;
- aucun traitement des propositions #125 sans adapter explicitement leur cycle de vie.

## 4. Matrice d'autorisation cible

| Profil existant | Portée autorisée proposée |
|---|---|
| Groupe organisationnel `bpmn-tool-admin-*` | Référentiel global, analyse interprojets, validation des correspondances globales, remplacements transversaux et audit |
| Projet `admin` | Administration des acteurs locaux de son projet ; consultation/proposition locale, sans décision globale ni visibilité interprojets |
| Projet `modeler` | Gestion des acteurs locaux selon les droits RACI actuels ; aucune mutation du référentiel global |
| Projet `viewer` | Lecture des données de son projet uniquement |
| Utilisateur sans adhésion | Aucun accès aux données projet ; aucune donnée transversale sans groupe organisationnel autorisé |

Le contrôle global est ajouté à l'ACL existante et n'est jamais déduit du rôle `ProjectMemberRole.Admin`. Les filtres d'accès sont exécutés côté serveur, avant agrégation et pagination.

## 5. Découpage de développement du module

1. **Audit final / contrat** : compléter les vérifications sur les chemins de publication, le parsing XML, les routes, le shell d'administration et les tests d'accès.
2. **Socle autonome** : créer le module NestJS, ses ports/adaptateurs, les entités et la migration additive ; aucun changement de comportement dans ProjectContext.
3. **Référentiel** : API de consultation/création/modification des identités de référence et correspondances validées.
4. **Détection** : normalisation déterministe, dictionnaire contrôlé, scoring explicable et candidats idempotents.
5. **Administration** : écrans sous le shell Administration existant, sans seconde matrice RACI.
6. **Consolidation** : lecture multi-projets avec provenance et codes R/A/C/I conservés.
7. **Remplacements transversaux** : inventaire, aperçu, exclusions, collisions, confirmation, exécution contrôlée, journal et annulation.
8. **Intégration de référence** : import du module dans l'application, tests de contrat/non-régression, CI et recette sur instance isolée.

Chaque étape doit rester activable et testable indépendamment. Aucun déploiement de production ni merge automatique.

## 6. Points restant à vérifier avant la première migration

- Inventaire exhaustif des routes et services qui créent, modifient, publient ou obsolétisent les contenus BPMN.
- Formats réels des XML BPMN stockés et bibliothèque de parsing déjà utilisée dans le dépôt.
- Emplacements exacts des libellés RACI dans les matrices et éventuelles copies embarquées dans les `extensionElements`.
- Politique de versionnement pour un remplacement portant sur une ressource commune référencée par plusieurs projets.
- Protection contre les modifications concurrentes et stratégie d'annulation sans écraser une version ultérieure.
- Tests d'intégration des groupes ACL et de la portée multi-projets.
- Parcours et conventions exacts du shell Administration pour ajouter une section Acteurs RACI.

Aucune migration ni modification du comportement applicatif n'est incluse dans cet audit documentaire.


## 7. Compléments d'audit — cycle de publication et interface V3

### Publication et concurrence

Le chemin de publication existant passe par `ContentController`, `PublishContentCommandHandler` et `publishDraftContentWithinTransaction`. Ce dernier verrouille pessimiste la ressource cible, le brouillon et la dernière version publiée ; il peut aussi vérifier `expectedPublishedContentId` et rejeter la publication si la version source a changé depuis la préparation.

**Règle pour les remplacements BPMN :** ne jamais modifier un contenu publié en place. Le module doit préparer une nouvelle version brouillon, conserver l'identifiant de la version publiée attendue, puis utiliser le chemin de publication transactionnel existant ou un adaptateur équivalent. Si la version attendue a changé, l'opération devient conflictuelle et doit être recalculée ; elle ne doit jamais écraser silencieusement la modification concurrente.

La stratégie d'annulation devra créer une nouvelle version compensatoire ou restaurer un brouillon contrôlé. Elle ne pourra pas réécrire une ancienne version publiée ni supprimer les événements d'audit.

Source :
- [content-publication-transaction.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ResourceContext/infrastructure/repositories/typeorm/content-publication-transaction.ts)
- [publishContent.commandHandler.ts](../blob/feat/issue-125-v3-integration/backend/src/modules/ResourceContext/application/commands/Content/publishContent/publishContent.commandHandler.ts)

### Interface Administration

Le composant `OrganizationAdmin.container.tsx` existe et contient déjà une section conceptuelle « Acteurs et RACI ». Toutefois, `frontend/src/routes.tsx` précise explicitement que les routes d'administration organisationnelle ne sont pas exposées dans le shell V3 audité.

**Conséquence :** ne pas considérer la page Administration comme déjà intégrée ou accessible. Le module frontend devra fournir une page/section indépendante et son contrat de navigation ; le raccordement à la navigation et au shell Administration V3 sera un adaptateur d'intégration distinct, activé lorsque les routes d'administration seront réintroduites.

Sources :
- [OrganizationAdmin.container.tsx](../blob/feat/issue-125-v3-integration/frontend/src/Containers/OrganizationAdmin/OrganizationAdmin.container.tsx)
- [routes.tsx](../blob/feat/issue-125-v3-integration/frontend/src/routes.tsx)

### Parser BPMN

Le backend déclare `fast-xml-parser` comme dépendance. Le lot 0 doit encore confirmer son usage effectif, sa configuration et les garanties de round-trip sur les BPMN réels du dépôt. Sa seule présence dans `package.json` ne constitue pas une validation de son aptitude à préserver les extensions, namespaces, attributs et éléments DI.


### Point de vigilance — mise à jour des contenus existants

L'audit du repository TypeORM montre que `updateEditableFields` met à jour `contents.content` après contrôle de l'appartenance ressource/contenu et de certains états de propositions, mais la requête ne limite pas explicitement l'écriture à `status = 'draft'`. L'interface peut normalement n'appeler cette route que pour un brouillon, mais cette hypothèse UI ne doit pas devenir une garantie de sécurité pour un traitement transversal.

**Règle pour RaciGovernance :** ne pas réutiliser `updateEditableFields` pour transformer un contenu publié ou obsolète. Le module doit créer ou cibler un brouillon autorisé, vérifier le contenu publié attendu, puis publier via le mécanisme transactionnel avec contrôle de concurrence. Toute évolution du endpoint générique de contenu devra faire l'objet d'une correction séparée et de tests de non-régression, sans être glissée silencieusement dans le module RACI.

Autre constat : le repository utilise PostgreSQL `xpath` sur le XML pour extraire quelques identifiants BPMN, mais cela ne constitue pas un parseur/éditeur BPMN capable de garantir un round-trip complet des extensions et namespaces.
