# Architecture de navigation V3 — matrice des routes

> Référence de travail : branche `refactor/issue-162-unified-viewer`. Cette matrice décrit les routes déclarées dans `frontend/src/routes.tsx` et les points de contrôle observés dans les composants et contrôleurs. Les permissions métier restent toujours à confirmer côté API ; un bouton masqué ou une garde de navigation frontend ne constitue pas une autorisation.

## Principes

- Le shell de consultation canonique est `BpmnLayout`, avec `ProcessDetails` et son `ProcessViewer`.
- Une seule implémentation de viewer est montée pour la consultation et l'ouverture des snapshots historiques.
- Les anciennes URL de viewer sont conservées comme redirections de compatibilité ; elles ne montent pas un viewer parallèle.
- Les deux entrées de publication classique utilisent le même module `PublishResource`.
- La publication d'une proposition approuvée reste un parcours métier distinct, avec son propre endpoint.
- La comparaison reste un écran autonome : elle ne doit pas rendre le workspace BPMN en arrière-plan.

## Matrice des routes

| URL | Composant / comportement | Accès et contrôles | Entrée et retour |
|---|---|---|---|
| `/login` | `Login` | Route publique ; les routes applicatives redirigent vers elle si la session manque. | Connexion puis retour vers l'URL demandée via `next`. |
| `/`, `/home` | Redirection vers `/root` | Session requise par le parent applicatif. | Compatibilité avec les anciennes pages d'accueil. |
| `/projects` | `Projects` | Session requise ; les opérations projet sont protégées par les API. | Liste des projets. |
| `/projects/:projectId` | `Projects` | Session requise ; les opérations d'administration vérifient les rôles projet côté API. | Administration / espace du projet. |
| `/root` | `BpmnLayout` puis `FolderOverview` | Session requise ; projet actif utilisé pour filtrer l'espace de travail. | Espace de travail du projet ; navigation vers les dossiers et processus. |
| `/:resourceId` | `BpmnLayout`, puis fiche dossier ou `ProcessDetails` avec `ProcessViewer` | Session requise ; lecture des ressources contrôlée côté API. Les actions de modélisation sont exposées selon le rôle, avec contrôle serveur obligatoire à l'écriture. | Fiche processus canonique ; historique, RACI, viewer, actions autorisées. |
| `/:resourceId/add`, `edit`, `share`, `delete` | Modules d'action dédiés sous le workspace | Session requise ; les API doivent vérifier les droits correspondants. | Action contextuelle ; retour à la ressource. |
| `/:resourceId/publish` | `PublishResource` | Session requise ; publication protégée côté API. | Entrée depuis la fiche processus ; annulation vers la fiche. |
| `/:resourceId/modeler` | `ContentModeler` | Session requise ; accès d'écriture et sauvegarde contrôlés côté API. | Modeleur ; protection des modifications non enregistrées. |
| `/:resourceId/modeler/publish` | Même module `PublishResource` | Même contrôle serveur que la publication classique. | Entrée après sauvegarde du brouillon ; annulation vers le modeleur. |
| `/:resourceId/viewer/:contentId` | Redirection vers `/:resourceId?contentId=:contentId` | Session requise ; le contenu demandé doit rester accessible via l'API. | URL historique conservée ; identifiant de snapshot et paramètres de contexte préservés. |
| `/projects/:projectId/viewer` | `ProjectWorkspaceRedirect` puis `/root` | Session requise ; le projet est activé avant redirection. | Compatibilité ; ne monte pas de second viewer. |
| `/:resourceId/compare/:leftContentId/:rightContentId` | `ContentCompare` autonome | Session requise ; chaque contenu et ressource est chargé via les API protégées. | Comparaison de deux versions d'une ressource ; retour vers la ressource. |
| `/compare-resources/:leftResourceId/:leftContentId/:rightResourceId/:rightContentId` | `ContentCompare` autonome | Session requise ; les deux ressources et snapshots sont contrôlés par les API. | Comparaison inter-ressources ; `returnTo` interne permet de retrouver le contexte de revue. À défaut, retour vers la ressource de droite. |
| `/search` | `SearchResults` | Session requise ; résultats soumis aux droits de lecture. | Recherche transversale ; ouverture de la ressource sélectionnée. |
| `/mes-demandes` | `MyProcessChangeProposals` | Session requise ; les listes et décisions sont filtrées et autorisées côté contrôleur selon l'appartenance et le rôle. | Suivi des demandes créées et file des demandes à traiter. |
| `/organization/users`, `/organization/users/:username` | `UserAccounts` | Garde globale Admin ; endpoints d'administration également protégés côté API. | Annuaire canonique et fiche utilisateur. |
| `/organization/accounts` | Redirection vers `/organization/users`, paramètres conservés | Garde globale Admin. | Alias historique, aucune seconde implémentation. |
| `/organization/:section` | `OrganizationAdmin` pour `overview`, `projects`, `processes`, `governance` | Garde globale Admin et liste blanche ; section inconnue renvoie 404. | Administration organisationnelle, distincte de l'administration projet. |

## Publication et comparaison

### Publication classique

Les routes `/:resourceId/publish` et `/:resourceId/modeler/publish` chargent toutes deux `PublishResource`. Le modeleur n'ouvre le module qu'après confirmation de l'enregistrement du brouillon. L'annulation utilise la navigation relative au contexte d'entrée. Après succès, l'utilisateur revient à la fiche du processus ; une erreur doit laisser l'écran de confirmation ouvert pour permettre une nouvelle tentative.

### Proposition approuvée

La publication d'une proposition approuvée n'utilise pas le module de publication classique. Le modeleur reçoit `publishApproved=1`, charge le snapshot soumis en lecture seule, puis appelle `/projects/process-change-proposals/:id/publish`. Cette distinction évite de publier par erreur le brouillon courant à la place de la version approuvée.

### Comparaison inter-ressources

Depuis la file de revue, la comparaison doit porter sur la version publiée source et le snapshot soumis de la proposition. Le lien transmet un `returnTo` encodé vers la revue du même `proposalId` et du même `submittedContentId`. Le composant de comparaison n'accepte qu'un chemin interne commençant par un seul `/` ; sinon il revient à la ressource de droite.

## Couverture de non-régression

Les tests déterministes frontend couvrent notamment :
- l'unicité du shell Viewer et les redirections des anciennes URL ;
- la conservation des identifiants de snapshot explicites ;
- les points d'entrée communs de publication, l'annulation et le retour après succès ;
- les routes de comparaison et le retour vers le contexte de revue ;
- l'ouverture d'une revue sur le snapshot soumis, la publication séparée d'une proposition approuvée et les actions du fil de remarques ;
- les contrôles backend unitaires des rôles, des remarques, des demandes de précision et des réponses de l'auteur.

**Limite connue :** le dépôt ne déclare actuellement pas de framework ni de script de test navigateur E2E dans `frontend/package.json`. Les contrats frontend actuels sont des tests déterministes de code et ne doivent pas être présentés comme une validation navigateur de bout en bout. Un vrai E2E doit être ajouté avec un environnement de test authentifié et des données isolées avant de considérer le critère E2E du ticket comme terminé.

## Vérifications avant acceptation V3

- Vérifier manuellement les parcours avec des comptes de rôles distincts (contributeur, valideur, chef de projet, administrateur).
- Vérifier les snapshots réels en base et les permissions API sur un jeu de données de test.
- Exécuter les scénarios navigateur de revue, demande de précision, réponse, décision, comparaison et publication approuvée dès qu'un environnement E2E isolé est disponible.
- Ne fusionner dans `feat/user-account-management-v3` et ne déployer qu'après validation fonctionnelle explicite.
