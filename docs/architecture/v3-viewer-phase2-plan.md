# V3 Viewer — matrice de migration et plan Phase 2

> Référence immuable : `release/v3-freeze-2026-10-28` — `12903c746dfeba1ad72d2318636755a45f559805`.
> Branche de travail : `refactor/v3-viewer-phase2`.
> Cette branche ne doit jamais déplacer ni modifier la référence gelée. Aucun déploiement n'est effectué par ce chantier.

## 1. Invariants non négociables

- Aucun changement backend, API, schéma de données, contrat ou règle métier.
- Login/session et Modeleur restent accessibles ; le Modeleur n'est pas refactoré dans cette phase.
- Un seul explorateur gauche et une seule source d'état de sélection/navigation.
- Le panneau droit de détail d'élément reste indépendant des onglets de la zone centrale.
- Aucun retrait du parcours legacy avant validation des routes, permissions et tests.
- Les actions restent visibles uniquement selon les rôles et capacités existants ; ne pas élargir les droits.
- Pas de déploiement Coolify sans demande explicite.

## 2. Matrice fonctionnelle de migration

La matrice est un contrat de travail. Les composants et services cités sont ceux identifiés dans l'inventaire de #109 ; les contrôles fins des rôles et des effets secondaires doivent être confirmés contre le code et couverts par les tests avant retrait du parcours legacy.

| Fonction | Routes / composant de départ identifiés | Service / contrat à réutiliser | Rôle / règle à préserver | Test d'acceptation |
|---|---|---|---|---|
| Login et session | `/login`, loader `requireSession`, `MainContainer` | `/auth/session`, état de session existant | Même authentification et mêmes restrictions | login/logout, session expirée, route protégée |
| Accueil et navigation dossier | `/`, `/:resourceId`, `BpmnLayout`, `FolderOverview` | `resources.queries.ts`, `useResource`, `useFolders` | Conserver les opérations et droits actuels | racine, dossier, sous-dossier, breadcrumb, URL directe |
| Explorateur | `FolderTree`, `useFolderTree` | ressources + contenus publiés + XML existants | Pas de fuite d'actions non autorisées | arbre unique, expansion, navigation et liens entre processus |
| Recherche | `WorkspaceNavigation`, recherche de l'arbre | requêtes existantes ressources/contenus/RACI | Même périmètre de visibilité et mêmes résultats métier | recherche dossier/processus, sélection et ouverture du résultat |
| Favoris et récents | `FolderTree` / état navigateur | stockage local actuel | Préserver les données utilisateur existantes | ajout/retrait, réouverture, persistance après reload |
| Vue BPMN | `ContentViewer` | `contents.queries.ts`, XML de contenu existant | Lecture seule selon les droits actuels | rendu, zoom, minimap, rechargement, URL directe |
| Sélection et détail BPMN | `ContentViewer` et panneau droit | données du contenu existantes | Le détail reste indépendant de l'onglet central | clic élément, changement d'onglet, sélection stable |
| Description | vue centrale Viewer / fonctions déjà existantes | services de ressources/contenus existants | Édition conditionnée par les droits actuels | lecture, édition autorisée, annulation, persistance |
| Historique | vue centrale / versions du processus | API versions/contenus existante | Pas de mutation implicite | affichage, changement de version, liens directs |
| RACI | vue centrale et matrice du Modeleur comme référence visuelle | données/services RACI existants | Droits de consultation/édition inchangés | affichage, données, rôles, rendu responsive |
| Inventaire des données, fichiers et bases | évolution 38 / ticket #73 | contrats existants, à confirmer pour chaque source | Pas d'invention de données ou d'accès supplémentaires | états vide/chargement/erreur, liens et permissions |
| Versions et comparaison | routes `/:resourceId/compare/...`, `/compare-resources/...`, `ProcessDetails`, `ContentCompare` | `contents.queries.ts` | Règles de version et droits existants | comparaison via route directe et depuis le Viewer |
| Menus contextuels | `FolderTree`, menus dossier/processus | services ressources/contenus existants | actions filtrées selon rôle ; confirmation avant suppression si déjà prévue | dossier/processus, rôle autorisé/interdit, annulation |
| Actions de gestion | routes `add/edit/share/delete/comments/publish` et modules dédiés | API existantes | Conserver les règles métier et validations | action autorisée/interdite, succès/erreur, retour Viewer |
| Espace projet | `/projects`, `/projects/:projectId`, `/projects/:projectId/viewer`, `/workspace`, `ProjectViewer` | API projet existante | Parcours projet séparé tant que non validé | URL directe, liste, détail, Viewer projet, permissions |
| Administration | `/organization/*`, `OrganizationAdmin`, `UserAccounts` | API existantes | Hors refonte Viewer initiale | routes encore accessibles et non cassées |
| Route legacy | `/reference/tree`, `ReferenceTree` | contrats actuels | Pas de suppression avant analyse d'usage | route directe, redirection ou maintien documenté |
| Modeleur | `/:resourceId/modeler`, `ContentModeler` | API et éditeur actuels | Module conservé, non refactoré | ouverture depuis les actions autorisées, sauvegarde, retour |
| Badge build | `MainContainer` / en-tête | métadonnées de build existantes | Identifiant visible et réel, jamais `unknown` | valeur présente dans le build et après navigation |

## 3. Architecture cible

- **Shell authentifié** : session et permissions réutilisées, sans changer le backend.
- **Explorateur gauche unique** : arborescence, recherche, favoris, récents, expansion et navigation.
- **Zone centrale** : vue dossier ou processus ; onglets de processus pour Diagramme, Description, Historique, RACI et Inventaire.
- **Panneau droit** : détail de l'élément BPMN sélectionné ; indépendant de l'onglet central.
- **Modeleur** : route/module autonome, sans migration dans le shell Viewer.
- **Services** : appels API existants réutilisés ; aucun double service créé pour la nouvelle interface.
- **Compatibilité** : routes directes et ancien parcours conservés pendant la transition.

## 4. Ordre d'exécution

1. Comparer la branche de travail au gel V3 et inspecter les composants/routages réellement présents.
2. Établir les tests de caractérisation des routes et actions existantes avant déplacement.
3. Stabiliser le shell et le modèle de sélection/navigation partagés.
4. Migrer les vues une à une : dossier/processus, Diagramme, Description, Historique, RACI, Inventaire.
5. Reconnecter recherche, favoris, récents, liens entre processus, menus et actions selon les droits.
6. Valider routes directes, navigation clavier/souris, chargement/erreurs, CI et tests navigateur.
7. Mesurer avant/après les requêtes, latences et mémoire sur un jeu de processus reproductible.
8. Ne supprimer l'ancien chemin qu'après réussite de tous les critères ; garder un retour arrière simple.

## 5. Critères de sortie Phase 2

- Une seule instance d'explorateur et pas d'état de navigation concurrent.
- Toutes les routes directes listées dans la matrice continuent à fonctionner.
- Permissions et actions identiques au comportement de référence.
- Diagramme, Description, Historique, RACI et Inventaire sont accessibles dans la zone centrale.
- Panneau droit indépendant ; pas de régression du Modeleur, login ou accueil dossiers/projets.
- CI verte et tests navigateur principaux réussis ; aucune régression connue masquée.
- Mesures de performance consignées ; suppression du legacy seulement après validation.

## 6. Limites connues / points à vérifier pendant l'implémentation

- La recherche globale et `useFolderTree` semblent coûteux : l'arbre charge contenus publiés et XML pour résoudre les sous-processus. Mesurer avant toute optimisation et préserver la résolution exacte des Call Activities.
- La session est interrogée à plusieurs endroits. Une mutualisation frontend ne doit pas modifier le comportement de sécurité.
- La persistance de l'expansion, des favoris et récents via `localStorage` doit être conservée.
- Le périmètre précis des pages projet et de l'administration reste distinct du socle Viewer ; elles ne doivent pas disparaître lors du changement de shell.
- Les tests automatiques ne remplacent pas la validation navigateur réelle, notamment pour le positionnement des panneaux, les changements d'onglet et la sélection BPMN.

## 7. État de la livraison

- Phase 1 (#109) : inventaire initial documenté ; la matrice ci-dessus est maintenant formalisée. Les rôles/actions fins restent à caractériser par tests pendant la migration ; ne pas déclarer la phase validée uniquement sur la présence du document.
- Phase 2 (#110) : branche isolée créée à partir du gel V3. La mise en œuvre doit être incrémentale et CI-gated.
- CI et navigateur : à exécuter sur les commits de cette branche ; aucune réussite n'est présumée par ce document.
- Déploiement : non effectué.
