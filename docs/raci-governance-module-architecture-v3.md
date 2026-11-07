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

Le module ne doit pas importer de composants React du Viewer/Modeleur, ni modifier les contrôleurs RACI existants pour fonctionner. Il consomme les capacités existantes au moyen de services/adaptateurs fins ; il ne recopie ni les règles ni les accès aux données déjà implémentés. Les adaptateurs ne sont pas des repositories bis : ils délèguent aux services/repositories existants ou à des contrats étroits ajoutés à ceux-ci lorsque cela est indispensable.

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

Le module réutilise les entités et repositories existants au travers des modules propriétaires et de leurs services exportés. Il ne déclare pas une seconde entité TypeORM pour `project_raci_actors`, `project_raci_entries`, `resources`, `contents`, utilisateurs ou projets. Les adaptateurs ne doivent pas dupliquer les requêtes métier existantes. Les nouvelles tables sont limitées aux concepts réellement absents du modèle actuel (identités de référence, correspondances, décisions/candidats et opérations d'harmonisation/audit), après vérification de chaque besoin.

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
5. **Administration** : ajouter uniquement les fonctions de gouvernance dans la zone Administration existante ; réutiliser son shell, sa navigation, ses composants et son design. Aucun écran RACI bis dans le parcours projet.
6. **Consolidation** : lecture multi-projets avec provenance et codes R/A/C/I conservés.
7. **Remplacements transversaux** : inventaire, aperçu, exclusions, collisions, confirmation, exécution contrôlée, journal et annulation.
8. **Intégration de référence** : import du module dans l'application, tests de contrat/non-régression, CI et recette sur instance isolée. Le module ne sera activé qu'à l'entrée Administration.

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



## 8. Exigence d'intégration — composant natif, isolable en développement

Cette section prévaut sur toute formulation antérieure qui pourrait laisser entendre qu'il faut construire une application autonome parallèle ou un second système RACI/BPMN.

### 8.1 Un module de l'application, pas une application concurrente

Le résultat final est une fonctionnalité native de l'application BPMN Tool. « Autonome » décrit sa frontière de code, son cycle de développement et sa testabilité, pas une nouvelle application en production.

- Pas de deuxième frontend complet, deuxième backend applicatif, deuxième base métier ou deuxième authentification.
- Pas de deuxième moteur BPMN, parser/éditeur générique ou gestionnaire de versions.
- Pas de deuxième registre des acteurs locaux, matrice RACI, gestion des projets, gestion des utilisateurs ou ACL.
- Pas de copie des tables `project_raci_actors`, `project_raci_entries`, `resources` et `contents`.
- Pas de duplication des règles de publication, des workflows de propositions #125 ou des contrôles d'accès.

### 8.2 Réutilisation obligatoire des capacités existantes

Avant d'ajouter un service, repository, entité, composant ou endpoint, le développement doit identifier le mécanisme existant qui couvre déjà le besoin et le réutiliser.

| Besoin | Capacité propriétaire à réutiliser |
|---|---|
| Authentification et identité | mécanismes existants de l'application |
| Autorisation globale | ACL et groupe organisationnel existants |
| Accès aux projets et périmètres | `ProjectContext` et ses services |
| Acteurs et affectations RACI locaux | registre, contrôleur et repository `ProjectContext` existants |
| Ressources, contenus et versions BPMN | `ResourceContext` et ses repositories/command handlers |
| Publication et concurrence | transaction de publication existante |
| Propositions de modification | workflow #125 existant, sans le contourner |
| Navigation, mise en page et design | shell Administration et composants frontend existants lorsqu'ils sont disponibles |

Si une capacité n'est pas exposée proprement, préférer l'export d'un service existant ou l'ajout d'une interface étroite dans son module propriétaire. Ne pas recopier son implémentation dans RaciGovernance.

### 8.3 Seules les fonctions administratives sont visibles

Le module ajoute une entrée/section dans l'Administration, protégée côté serveur par l'ACL organisationnelle existante. Ses API sont administratives.

Pour un utilisateur du parcours normal :
- aucun nouvel écran, bouton, badge, avertissement ou étape ;
- aucune action supplémentaire lors de l'ouverture, de la lecture ou de la modification d'un processus ;
- aucune modification du Viewer, du Modeleur, des matrices RACI projet ou du workflow #125 ;
- aucune tâche de détection ou de remplacement déclenchée implicitement pendant l'utilisation normale ;
- aucune différence de comportement tant qu'un administrateur n'a pas explicitement lancé et confirmé une opération de gouvernance.

Les données locales et les libellés existants continuent de fonctionner comme avant. Une correspondance au référentiel ne change pas, à elle seule, les affectations RACI ni le BPMN.

### 8.4 Autonomie de développement et de test

Le module doit pouvoir être compilé et testé sans démarrer le parcours utilisateur complet :
- tests unitaires du domaine et des cas d'usage ;
- tests d'adaptateurs avec les services propriétaires réels et doubles contractuels contrôlés ;
- tests d'intégration NestJS avec PostgreSQL de test et les migrations du module ;
- fixtures BPMN et RACI représentatives, sans copie des logiques métier existantes ;
- tests d'autorisation prouvant qu'un non-administrateur ne peut ni lire les données transversales ni lancer une mutation ;
- tests de non-régression prouvant que les routes et parcours utilisateur ordinaires n'ont aucun changement.

Le module fournit un petit harness de test (module de test NestJS / configuration Jest dédiée), pas un deuxième produit exécutable en production. En intégration, il utilise les connexions, services et fournisseurs déjà configurés par l'application.

### 8.5 Critères de refus d'une implémentation

Une PR doit être revue/refusée si elle :
- recopie un service ou une table existante sans nécessité démontrée ;
- ajoute une dépendance du parcours utilisateur vers RaciGovernance ;
- modifie les routes Viewer/Modeleur ou les écrans projet pour exposer la gouvernance ;
- lance une détection, un rapprochement ou un remplacement sans action administrative explicite ;
- contourne le repository ResourceContext, la publication transactionnelle ou l'ACL existante ;
- ajoute une base ou un service applicatif séparé uniquement pour rendre le module testable.


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
