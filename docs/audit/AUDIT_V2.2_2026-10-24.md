# Audit approfondi — BPMN Tool V2.2

- **Date de l'audit :** 2026-10-24
- **Dépôt :** [kaneos00/ovh-bpmn-tool](https://github.com/kaneos00/ovh-bpmn-tool)
- **Branche de référence :** `release/v2.2-reference-2026-10-23`
- **Commit applicatif attendu :** [`ad9178b6749a53e2a4abbd3a9a4fea144ac13abd`](https://github.com/kaneos00/ovh-bpmn-tool/commit/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd)
- **Nature :** audit en lecture seule ; recommandations, aucune correction appliquée dans le cadre de l'audit.

> **Important — limites de vérification.** Ce document consigne les constats de l'audit initial. Les résultats décrits comme « à confirmer » ne sont pas des défauts démontrés en production. Aucun test de charge, navigateur automatisé ou build local n'a été exécuté dans le cadre de cet audit. Les lignes de code peuvent évoluer : vérifier la référence indiquée avant d'implémenter un lot.

## 1. Synthèse exécutive

La V2.2 constitue une base de référence, mais plusieurs risques méritent d'être traités avant de poursuivre les évolutions. Les premières priorités sont la protection de l'authentification, la sûreté des migrations sur bases existantes, puis les défauts fonctionnels du Viewer et du routage. Les coûts réseau et algorithmiques de l'explorateur, les suppressions de ressources et l'analyse RACI constituent ensuite les principaux chantiers de performance.

| Priorité | Sujet | Confiance | Statut / impact |
|---|---|---|---|
| P1 conditionnelle | Authentification et risque de saturation | Élevée sur les constats de code | Impact dépend des protections en amont et de l'exposition |
| P1 conditionnelle | Parcours de migration PostgreSQL | Élevée sur la configuration | Risque dépend de l'historique réel de la base |
| P2 | Synchronisation de la minimap | Élevée | L'état React ne semble pas commander explicitement le service minimap |
| P2 | Simple clic / double-clic BPMN | Élevée sur le décalage temporel | Peut provoquer une sélection transitoire ; reproduction requise |
| P2 | Garde des routes frontend | Élevée | Une redirection peut être interceptée par le `catch` |
| P2 | Explorateur : chargements et construction de l'arbre | Élevée | Nombre de requêtes et algorithme susceptibles de mal passer à l'échelle |
| P2 | Suppression d'un sous-arbre | Élevée | Parcours des descendants et vérifications répétées |
| P2 | Calcul RACI | Élevée | Recherches répétées dans le document XML |
| P2 | Tests frontend absents du périmètre recensé | Élevée | Régressions d'interface peu protégées automatiquement |
| P3 | Code potentiellement mort | Moyenne à élevée selon le symbole | Vérifier le graphe d'import avant suppression |
| P3 | Dépendances vieillissantes | Moyenne à élevée selon le paquet | Modernisation planifiée, non urgente à elle seule |
| P3 | Divergence entre CHECK et code | Élevée | Réconcilier les critères de référence |

Le CI de validation de la branche a été signalé comme réussi lors de l'audit : [exécution 1226](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/39999719983). Un CI vert confirme les contrôles qu'il exécute, mais ne prouve pas à lui seul le bon comportement de toutes les interactions du Viewer.

## 2. Constats détaillés

### 2.1 P1 conditionnelle — Protection de l'authentification et saturation

**Confiance : élevée sur les constats de code ; impact conditionnel.**

Le backend accepte des corps JSON jusqu'à 50 Mo et la configuration Nginx autorise également des requêtes jusqu'à 50 Mo. Le code d'authentification utilise `scryptSync`, opération synchrone qui bloque la boucle d'événements Node.js pendant le calcul. Aucun limiteur de débit n'a été repéré sur la route de connexion dans les fichiers examinés.

Preuves :
- [Configuration du corps JSON dans `main.ts`](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/src/main.ts#L8-L20)
- [Configuration Nginx](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/deploy/coolify/nginx.conf.template#L1-L25)
- [Authentification backend](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/src/auth/auth.controller.ts#L510-L530)

**Risque :** si le reverse proxy externe ne fournit pas de protections complémentaires, des requêtes volumineuses ou des tentatives de connexion répétées peuvent consommer mémoire et CPU. Cela ne prouve pas qu'une attaque est actuellement possible dans l'environnement déployé.

**Correction proposée :**
1. Limiter la taille des corps des routes d'authentification.
2. Ajouter une limitation de débit à la connexion, au proxy ou au backend.
3. Évaluer `scrypt` asynchrone avec une concurrence maîtrisée.
4. Éviter une différence de temps trop observable entre utilisateur inexistant et mot de passe incorrect.

**Tests / acceptation :**
- Une requête trop volumineuse est rejetée.
- Les tentatives répétées sont limitées.
- Les connexions légitimes restent fonctionnelles.
- Une charge de connexions échouées ne bloque pas durablement les autres requêtes.

### 2.2 P1 conditionnelle — Parcours de migration PostgreSQL

**Confiance : élevée sur la configuration ; impact dépendant de la base réelle.**

Le déploiement utilise plusieurs mécanismes :
- `Dockerfile.postgres` copie les scripts d'initialisation du schéma et des projets.
- `Dockerfile.migrations` ne copie que la migration `20261014_v2_1_process_provenance.sql`.
- Le service `schema-migrations` de Compose exécute cette dernière migration.

Preuves :
- [Dockerfile PostgreSQL](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/deploy/coolify/Dockerfile.postgres#L1-L12)
- [Dockerfile migrations](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/deploy/coolify/Dockerfile.migrations#L1-L8)
- [Service migrations Compose](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/deploy/coolify/compose.yaml#L24-L40)

Les scripts d'initialisation PostgreSQL ne sont pas rejoués automatiquement sur un volume déjà initialisé. Le service de migration ne rattrape donc pas les anciennes migrations si elles n'ont jamais été appliquées. Un déploiement sur une base issue d'un historique différent peut aboutir à un schéma incomplet ; rien ne prouve que la base actuellement utilisée soit dans cet état.

Le dépôt contient aussi `backend/migrations/20261011_projects_shared_processes.sql` en parallèle de `20261011_v2_project_context.sql`. Ces scripts définissent notamment `projects` et `project_processes` avec des contraintes différentes ; le premier n'est pas dans les Dockerfiles d'initialisation actuels.

Preuves :
- [Migration historique projects_shared_processes](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/migrations/20261011_projects_shared_processes.sql)
- [Migration v2 du contexte projet](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/migrations/20261011_v2_project_context.sql#L47-L70)

**Correction proposée :**
- Identifier les migrations réellement appliquées dans les environnements existants.
- Mettre en place un registre explicite des migrations appliquées et les exécuter dans l'ordre.
- Ne pas rejouer aveuglément `init.sql` sur une base existante.
- Tester une vraie mise à niveau depuis la version précédente.

**Tests / acceptation :**
1. Installation neuve.
2. Mise à niveau d'une copie de base issue de la version précédente.
3. Schéma cohérent dans les deux cas ; démarrage backend réussi.
4. Aucun script initial destructeur ou non idempotent n'est rejoué sur une base existante.

### 2.3 P2 — Minimap : état visuel non synchronisé explicitement avec le service

**Confiance : élevée.**

Le Viewer est initialisé avec la minimap fermée. Le bouton change l'état `minimapVisible`, qui sert à modifier une classe CSS. Dans le code examiné, cet état ne semble pas synchronisé avec les méthodes d'ouverture et de fermeture du service minimap.

Preuves :
- [Initialisation du Viewer](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/shared/hooks/useModelerInstance.ts#L35-L57)
- [Bouton minimap](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/ProcessViewer/ProcessViewer.tsx#L61-L75)
- [État de visibilité](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts#L175-L191)

Le commit [`cd51edf`](https://github.com/kaneos00/ovh-bpmn-tool/commit/cd51edf) ajoute une synchronisation, mais ne fait pas partie de l'ascendance de la référence auditée : ne pas présumer que cette correction est présente dans V2.2.

**Correction proposée :** synchroniser explicitement l'état React et le service minimap ; fermer proprement la minimap au démontage du Viewer ou au chargement d'un nouveau diagramme.

**Tests / acceptation :**
- Minim ap fermée par défaut (corriger la graphie dans les futurs tests : « minimap »).
- Ouverture effective au clic et fermeture au second clic.
- Pas de réouverture automatique lors d'une sélection.
- Comportement stable après import et changement de processus.

### 2.4 P2 — Délai simple clic / double-clic

**Confiance : élevée sur le décalage, impact visuel à confirmer.**

Dans `useProcessViewer`, la sélection est différée de 220 ms, tandis que le second clic est considéré comme un double-clic rapide dans une fenêtre de 280 ms.

Preuve : [Gestion des clics dans `useProcessViewer`](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts#L145-L190).

Si le second clic arrive entre 220 et 280 ms, le délai de sélection peut déjà avoir déclenché l'ouverture du panneau avant que le double-clic ne lance la navigation. Cela explique potentiellement certains clignotements, sans établir que c'est leur seule origine.

**Correction proposée :** aligner la temporisation ou utiliser un mécanisme d'événements qui empêche l'action de simple clic de s'exécuter prématurément lorsqu'un double-clic est reconnu.

**Tests / acceptation :**
- Tester des intervalles de 180, 230 et 260 ms.
- Tester simple clic, désélection, double-clic sur Call Activity et sous-processus navigable.
- Changer de processus pendant une sélection différée.
- Aucun panneau de détail transitoire avant navigation.

### 2.5 P2 — Garde des routes frontend

**Confiance : élevée.**

Dans `frontend/src/routes.tsx`, un `throw redirect(...)` est exécuté dans un `try`, tandis que le `catch` suivant intercepte aussi cette redirection et renvoie vers la connexion. Un utilisateur authentifié mais sans le rôle attendu pourrait donc être redirigé vers la connexion au lieu de la destination prévue.

Preuve : [Garde de session et de rôle](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/routes.tsx#L5-L28).

**Correction proposée :** séparer la récupération de session de la logique de redirection selon le rôle. Les redirections décidées après une session valide ne doivent pas être interceptées par le `catch` de récupération.

**Tests / acceptation :**
- Utilisateur non authentifié vers la connexion.
- Viewer vers la destination prévue pour son rôle.
- Administrateur sur ses routes autorisées.
- Pas de boucle de redirection.

### 2.6 P2 — Explorateur : coût réseau et construction de l'arbre

**Confiance : élevée.**

`useFolderTree.ts` récupère les ressources, puis crée des requêtes de contenu pour les processus et des requêtes XML pour les contenus publiés.

Preuve : [Chargement des contenus et XML](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts#L47-L76).

Pour (P) processus accessibles, le chargement initial peut atteindre approximativement une requête de ressources, (P) requêtes de contenu et jusqu'à (P) requêtes XML supplémentaires, soit jusqu'à environ (1+2P) requêtes. Le cache peut réduire les chargements ultérieurs mais pas nécessairement ce coût initial.

La construction récursive de l'arbre recherche les enfants en filtrant la liste complète des ressources à chaque niveau et trie les résultats de manière répétée.

Preuve : [Construction de l'arbre](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts#L141-L201).

Pour (R) ressources et (F) dossiers, le coût peut approcher (O(R \times F)), en plus du réseau et de l'analyse XML.

**Correction proposée, en deux étapes :**
1. Indexer les ressources par `parentId` et trier les enfants une seule fois.
2. Éviter de télécharger/analyser tous les XML pour construire l'arbre : privilégier des métadonnées groupées ou une résolution backend des liens.

**Tests / acceptation :**
- Mesurer avec 10, 100 et 500 processus : nombre de requêtes, temps de construction, navigation, mémoire.
- Vérifier les liens Call Activity et sous-processus.
- Même arbre et même comportement fonctionnel.
- Croissance maîtrisée des requêtes et du temps de rendu.

### 2.7 P2 — Suppression d'un dossier : contrôles répétés

**Confiance : élevée.**

`ProjectResourceAccessService.assertCanDeleteResourceTree` parcourt les descendants puis vérifie les autorisations ressource par ressource de manière séquentielle. La suppression effectue ensuite un autre parcours récursif.

Preuve : [Vérification d'accès lors de la suppression d'un arbre](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/src/modules/ProjectContext/projectResourceAccess.service.ts#L205-L245).

Le schéma initial ne semble pas comporter d'index dédié à `resources.parentId`, utilisé pour parcourir la hiérarchie.

Preuves :
- [Entité Resource](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/src/modules/ResourceContext/infrastructure/entities/resource.ormEntity.ts)
- [Schéma initial](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/migrations/init.sql#L35-L50)

**Correction proposée :** indexer `parentId` par migration, charger les descendants une seule fois, regrouper les vérifications d'accès et encadrer contrôle/suppression dans une transaction appropriée pour limiter les modifications concurrentes entre contrôle et suppression.

**Tests / acceptation :**
- Toute ressource interdite bloque la suppression de l'arbre.
- Aucune suppression partielle.
- Performance mesurée sur des arbres volumineux.
- Comportement correct avec ressources partagées entre projets.

### 2.8 P2 — RACI : recherches répétées dans le XML

**Confiance : élevée.**

Le calcul RACI utilise `findById`, qui parcourt les éléments XML pour retrouver un identifiant, notamment lors du traitement des flux de message.

Preuve : [Calcul RACI](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/extensions/raci-viewer.ts#L245-L265).

Pour (N) éléments XML et (M) relations à résoudre, le coût peut approcher (O(M \times N)). `ProcessDetails` analyse également le XML pour identifier la tâche sélectionnée.

Preuve : [ProcessDetails](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx).

**Correction proposée :** construire une table `id → élément XML` une seule fois par version du XML, puis la réutiliser pour RACI et sélection.

**Tests / acceptation :**
- Résultats RACI identiques.
- Tests lanes, participants, flux de message et affectations.
- Temps d'analyse mesuré sur des XML de tailles croissantes.

### 2.9 Explorateur : identités de nœuds, favoris et recherche

**Confiance : moyenne à élevée ; reproduire l'interface avant correction.**

L'arbre emploie des identifiants synthétiques pour certains processus liés alors que la route sélectionne une ressource par identifiant métier. Ces identités ne sont pas nécessairement équivalentes.

Preuve : [Identifiants et état de sélection](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/FolderTree/FolderTree.tsx#L129-L160).

Pendant la recherche, les nœuds développés sont calculés via `searchExpandedNodes`, alors que le bouton personnalisé modifie `expandedNodes`. Le repli pendant la recherche peut donc être incohérent.

**Correction proposée :**
- Distinguer identifiant de ressource et identifiant de nœud.
- Normaliser les favoris sur un identifiant métier stable.
- Synchroniser sélection et focus avec le nœud du processus lié.
- Tester expansion/repli en mode recherche.

**Acceptation :** expansion/repli cohérents, sélection du bon processus lié, favoris persistants, pas de doublons ni de régression de navigation.

### 2.10 Création d'une ressource sous un parent incompatible

**Confiance : moyenne à élevée.**

Le gestionnaire de création vérifie que le parent existe, mais ne semble pas vérifier que le parent est un dossier.

Preuve : [CreateResource command handler](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/backend/src/modules/ResourceContext/application/commands/Resource/createResource/createResource.commandHandler.ts).

Une création via API avec un processus comme parent pourrait produire une ressource que l'arbre frontend ne présente pas correctement.

**Correction proposée :** refuser les parents qui ne sont pas des dossiers, sauf exception métier documentée.

**Acceptation :** création sous dossier fonctionnelle ; parent incompatible rejeté clairement ; aucune ressource orpheline ou invisible.

## 3. Historique Git et corrections successives

L'examen de l'historique a relevé des comportements réécrits plusieurs fois. Ces séquences sont des indices de zones à tester, pas toutes des régressions démontrées.

### 3.1 Couleur des gateways

Séquence relevée :
- [`8126a1d` — couleurs par type](https://github.com/kaneos00/ovh-bpmn-tool/commit/8126a1d)
- [`c60a8da` — vert pour toutes les gateways](https://github.com/kaneos00/ovh-bpmn-tool/commit/c60a8da)
- [`1c36170` — violet foncé pour toutes](https://github.com/kaneos00/ovh-bpmn-tool/commit/1c36170)
- [`ad9178b` — remplissage conservé, contours violets](https://github.com/kaneos00/ovh-bpmn-tool/commit/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd)

Il s'agit de changements de décision graphique, pas nécessairement de régressions. Le fichier CHECK annonce encore le vert tandis que le CSS de référence utilise des contours violets.

Preuves :
- [CHECK, point 42](https://github.com/kaneos00/ovh-bpmn-tool/blob/212a97e99a6915748917b4e85364191ad77b89fd/check.md#L96-L103)
- [CSS gateways](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/Modeler/Modeler.css#L205-L222)

**Action :** décider explicitement de la palette de référence avant d'éditer le code. Le CSS semble contenir un sélecteur répété pour les gateways exclusives ; nettoyer après validation visuelle.

### 3.2 Minimap

L'historique comprend plusieurs modifications de l'ouverture, fermeture et commande manuelle. Le code de référence ne synchronise pas explicitement l'état React avec le service minimap. Le commit `cd51edf` ajoute cette synchronisation, mais n'est pas intégré dans la référence. Tester avant de reprendre ou adapter ce changement.

### 3.3 Flèches de l'explorateur

Commits pertinents :
- [`2076ec8` — flèches d'expansion explicites](https://github.com/kaneos00/ovh-bpmn-tool/commit/2076ec8)
- [`c831cfe` — séparation navigation/expansion](https://github.com/kaneos00/ovh-bpmn-tool/commit/c831cfe)
- [`4506c97` — expansion des dossiers](https://github.com/kaneos00/ovh-bpmn-tool/commit/4506c97)
- [`f244130` — flèches natives et personnalisées](https://github.com/kaneos00/ovh-bpmn-tool/commit/f244130)

Le CHECK signale encore un problème de flèches. Reproduire dans le navigateur et consigner le comportement exact plutôt que supposer que ces commits ont corrigé le cas.

### 3.4 Favoris et processus récemment ouverts

Deux commits successifs abordent la résolution des processus appelés dans les éléments récents :
- [`c5ce338`](https://github.com/kaneos00/ovh-bpmn-tool/commit/c5ce338)
- [`4d095fe`](https://github.com/kaneos00/ovh-bpmn-tool/commit/4d095fe)

Ce n'est pas une preuve de régression, mais une raison de tester favoris, processus liés et listes récentes. Aucun enchaînement explicite de commits portant le message `Revert` n'a été identifié dans l'échantillon des 100 derniers commits examiné ; cela ne garantit pas l'absence de corrections annulées par d'autres moyens.

## 4. Code mort et dépendances

### 4.1 Candidats au code mort

**Indice élevé :** `useFolderTree` retourne `onNodeSelect` et `onNodeToggle`, mais `FolderTree` ne semble pas consommer ces fonctions. Elles paraissent être des reliquats de l'ancienne logique d'arbre MUI remplacée par `react-complex-tree`.

Preuves :
- [Fonctions du hook](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/FolderTree/hooks/useFolderTree.ts#L206-L241)
- [Consommation du hook](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/frontend/src/Components/BusinessComponents/FolderTree/FolderTree.tsx#L45-L60)

**À vérifier avant suppression :**
- `ProcessHierarchyTree/ProcessHierarchyTree.tsx`
- `FolderTree/components/FolderTreeItem.tsx`
- `ResourceExplorer/ResourceExplorer.tsx`
- `ResourceExplorer/hooks/useResourceExplorer.ts`
- composants associés à `ResourceExplorer`

L'inspection des chemins actifs ne suffit pas à prouver l'absence de références dynamiques. Rechercher les imports, routes, exports de baril et chargements dynamiques avant suppression. `url-click-module.ts` contient aussi des blocs commentés d'anciennes implémentations et des commentaires potentiellement obsolètes.

### 4.2 Dépendances à moderniser ou auditer

- **Vite / Rollup :** le frontend utilise Vite `^4.5.14`. Vite 4 n'est plus couvert par la politique de support actuelle ; le lockfile mentionne Rollup 4.61.0 dans le graphe de Vite 4, combinaison à examiner car Vite 4 était basé sur Rollup 3. Le build passe dans le CI rapporté, donc pas d'incompatibilité immédiate démontrée. Préparer une migration cohérente vers une combinaison officiellement compatible, sans mise à niveau isolée de Rollup.
- **TanStack Query :** usage du package historique `react-query` 3.39.3. La migration vers `@tanstack/react-query` est une migration d'API et de comportement, pas un simple bump de version.
- **Joy UI :** version bêta utilisée ; le projet Joy UI est indiqué comme étant en pause. Risque de maintenance à moyen terme, pas nécessité de réécrire l'interface immédiatement.
- **Candidats à l'analyse d'utilisation :** `@mui/lab` (alpha), `react-d3-tree`, `react-window`, `react-virtuoso`, `styled-components`, `@react-spring/rafz`, `@react-spring/web` et composants de l'ancienne pile MUI TreeView.

Références externes à vérifier au moment du lot :
- [Politique de support Vite](https://vite.dev/releases)
- [Migration Vite 5](https://vite.dev/guide/migration.html)
- [Guide de migration TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)
- [Joy UI](https://mui.com/joy-ui/)

Ne pas supprimer ces paquets en bloc : établir d'abord le graphe des imports et les dépendances transitives, puis traiter chaque suppression séparément.

## 5. Architecture et tests

### Frontend

Le frontend recensé compte environ 193 fichiers. Aucun fichier de test frontend n'a été recensé dans la référence, tandis que huit fichiers de tests ont été identifiés côté backend. Le workflow frontend vérifie essentiellement lint et build ; navigation, minimap, flèches, favoris et sélection ne semblent pas couverts par des tests automatisés dédiés.

Preuve : [Workflow Validate](https://github.com/kaneos00/ovh-bpmn-tool/blob/ad9178b6749a53e2a4abbd3a9a4fea144ac13abd/.github/workflows/validate.yml).

`ProcessDetails` concentre plusieurs responsabilités : récupération de contenus, analyse XML BPMN, affichage RACI, sélection, panneaux, raccourcis clavier et rendu des détails. Cette concentration augmente le risque de régression. Après stabilisation, séparer progressivement chargement/analyse, navigation du Viewer et panneaux de détails plutôt que réécrire l'ensemble.

### Backend

Le backend utilise NestJS et TypeORM. `ResourceContext` est organisé autour de commandes, requêtes et handlers ; `ProjectContext` concentre davantage de logique dans contrôleurs et service d'accès. Ce n'est pas automatiquement incorrect, mais une séparation plus homogène des règles métier, autorisations et persistance faciliterait la maintenance. Refactoriser seulement après les corrections prioritaires et avec tests.

## 6. Feuille de route strictement séquentielle

Chaque lot doit être validé avant d'entamer le suivant. Ne pas regrouper les changements de plusieurs lots dans un même commit de correction.

### Lot 0 — Figer la référence comportementale

- **Problème :** CHECK et code ne concordent pas sur certains comportements.
- **Preuves :** palette gateway ; points CHECK relatifs aux flèches, minimap et navigation ; commits non intégrés à la référence.
- **Fichiers :** `check.md`, CSS du Modeler, hooks Viewer et FolderTree.
- **Correctif proposé :** documenter l'état observé : corrigé, partiel, non corrigé, non reproduit ; arrêter la palette attendue ; établir une baseline CI et des scénarios.
- **Risques :** aucun risque applicatif si ce lot reste documentaire.
- **Tests :** inspection manuelle ciblée, exécution du CI existant.
- **Acceptation :** chaque constat possède un état et un scénario reproductible ; exigences visuelles non contradictoires.

### Lot 1 — Protéger l'authentification

- **Problème :** corps volumineux, fonction synchrone de dérivation de clé, absence de limiteur repéré.
- **Preuves :** `main.ts`, Nginx, `auth.controller.ts`.
- **Fichiers :** backend auth/main et configuration proxy.
- **Correctif proposé :** limites de corps, rate limiting, étude de `scrypt` asynchrone, réponse d'échec temporellement moins différenciée.
- **Risques :** limiter trop agressivement des connexions légitimes.
- **Tests :** connexion valide/invalide, requête trop grande, rafale d'essais, latence sous charge.
- **Acceptation :** rejet contrôlé des excès ; connexion normale stable ; backend disponible sous charge d'échecs.

### Lot 2 — Fiabiliser les migrations PostgreSQL

- **Problème :** parcours différent selon base neuve ou existante et migrations historiques divergentes.
- **Preuves :** Dockerfiles, Compose, migrations datées.
- **Fichiers :** `deploy/coolify/Dockerfile.postgres`, `Dockerfile.migrations`, `compose.yaml`, `backend/migrations/*`.
- **Correctif proposé :** registre de migrations, ordre explicite, ne pas rejouer `init.sql` sur base existante, migration de rattrapage si nécessaire.
- **Risques :** écarts de schéma historiques entre installations.
- **Tests :** installation neuve et mise à niveau d'une copie de la version précédente.
- **Acceptation :** schéma cohérent dans les deux cas ; démarrage réussi ; aucune migration initiale destructrice rejouée.

### Lot 3 — Corriger la minimap

- **Problème :** état React et service minimap non synchronisés explicitement.
- **Preuves :** `useModelerInstance.ts`, `ProcessViewer.tsx`, `useProcessViewer.ts`.
- **Correctif proposé :** synchronisation service/état et nettoyage au démontage ou changement de diagramme.
- **Risques :** réouverture involontaire après import ou navigation.
- **Tests :** ouverture/fermeture, sélection, import, changement de processus, démontage.
- **Acceptation :** fermée par défaut ; bouton réellement opérant ; pas de réouverture involontaire.

### Lot 4 — Corriger la garde des routes

- **Problème :** le `catch` peut intercepter une redirection par rôle.
- **Preuve :** `frontend/src/routes.tsx`.
- **Correctif proposé :** isoler récupération de session et décision de redirection.
- **Risques :** changement de parcours selon le rôle.
- **Tests :** non connecté, Viewer, administrateur, erreurs de session.
- **Acceptation :** destinations correctes, aucune boucle, autorisations backend inchangées.

### Lot 5 — Stabiliser clic simple/double et navigation BPMN

- **Problème :** délai de sélection 220 ms et fenêtre double-clic 280 ms.
- **Preuve :** `useProcessViewer.ts`.
- **Correctif proposé :** aligner temporisations ou garantir que le simple clic n'agit pas avant résolution du double-clic.
- **Risques :** sélection perçue comme moins réactive.
- **Tests :** intervalles 180/230/260 ms ; simple clic, désélection, Call Activity, sous-processus, navigation pendant temporisation.
- **Acceptation :** pas de panneau transitoire avant navigation ; sélection et désélection stables.

### Lot 6 — Corriger identifiants et expansion de l'explorateur

- **Problème :** identité synthétique des nœuds différente de l'identité métier ; état d'expansion divergent en recherche.
- **Preuves :** `FolderTree.tsx`, `useFolderTree.ts`, points CHECK.
- **Correctif proposé :** séparer id ressource/id nœud ; normaliser favoris ; synchroniser expansion et sélection.
- **Risques :** perte ou mauvaise résolution des favoris/récents.
- **Tests :** expansion/repli normal et recherche, favoris, processus liés, récents.
- **Acceptation :** arbre stable, bon processus sélectionné, favoris persistants, aucune duplication.

### Lot 7 — Valider le parent lors de la création

- **Problème :** parent existant accepté sans vérification apparente de son type.
- **Preuve :** handler `createResource`.
- **Correctif proposé :** n'autoriser qu'un dossier parent, sauf règle métier explicitement documentée.
- **Risques :** clients/scripts existants qui créent sous un parent désormais interdit.
- **Tests :** création sous dossier et sous processus ; réponse d'erreur ; affichage dans l'arbre.
- **Acceptation :** aucune ressource invisible/orpheline ; règles métier explicites.

### Lot 8 — Optimiser l'explorateur

- **Problème :** requêtes par processus et recherche répétée dans la liste pour construire l'arbre.
- **Preuves :** `useFolderTree.ts`.
- **Correctif proposé :** index parent/enfants puis métadonnées groupées ou résolution backend.
- **Risques :** résolution des Call Activities/sous-processus modifiée.
- **Tests :** 10/100/500 processus, réseau, mémoire, rendu, liens et favoris.
- **Acceptation :** même arbre et mêmes liens ; requêtes réduites ; croissance maîtrisée des temps.

### Lot 9 — Optimiser la suppression des ressources

- **Problème :** parcours descendant répété et contrôles séquentiels.
- **Preuves :** `projectResourceAccess.service.ts`, entité Resource, migration initiale.
- **Correctif proposé :** index `parentId`, chargement unique des descendants, contrôles groupés et transaction adaptée.
- **Risques :** autorisations insuffisantes ou suppression partielle si la logique est simplifiée.
- **Tests :** arbres volumineux, ressource interdite, concurrence, ressources partagées.
- **Acceptation :** aucune suppression partielle ; toutes les autorisations sont conservées ; gain mesuré.

### Lot 10 — Optimiser le calcul RACI

- **Problème :** recherches XML répétées par identifiant.
- **Preuves :** `raci-viewer.ts`, `ProcessDetails.tsx`.
- **Correctif proposé :** index id → élément XML réutilisé.
- **Risques :** mauvaise résolution de relations ou d'affectations.
- **Tests :** comparaison des matrices, lanes, participants, flux de message, grands XML.
- **Acceptation :** résultat identique ; temps d'analyse mesuré et réduit.

### Lot 11 — Nettoyer code mort et dépendances inutilisées

- **Problème :** reliquats d'anciennes implémentations et duplications CSS.
- **Preuves :** fonctions non consommées de `useFolderTree`, composants candidats et sélecteurs CSS.
- **Correctif proposé :** analyser imports/exports/routes avant chaque suppression ; retirer les symboles prouvés inutilisés et les blocs commentés obsolètes.
- **Risques :** référence dynamique ou import indirect non détecté.
- **Tests :** recherche statique, lint, build, tests fonctionnels de l'arbre.
- **Acceptation :** chaque suppression justifiée par le graphe d'import ; aucun changement visuel/fonctionnel non voulu.

### Lot 12 — Moderniser les dépendances frontend

- **Problème :** Vite 4, `react-query` v3 et bibliothèque Joy UI en pause ; dépendances candidates à vérifier.
- **Preuves :** manifests et lockfiles.
- **Correctif proposé, sous-lots indépendants :** (1) mise à niveau cohérente Vite/plugin React ; (2) migration TanStack Query ; (3) décision sur Joy UI ; (4) harmonisation lint/format ; (5) suppression de dépendances prouvées inutiles.
- **Risques :** changements de build, API, cache de requêtes ou rendu UI.
- **Tests :** CI après chaque sous-lot, scénarios frontend, contrôle des lockfiles.
- **Acceptation :** CI vert à chaque étape, versions compatibles et supportées, aucune régression connue.

## 7. Ordre recommandé

1. Lot 0 — baseline et critères.
2. Lot 1 — authentification.
3. Lot 2 — migrations.
4. Lot 3 — minimap.
5. Lot 4 — garde des routes.
6. Lot 5 — clics et navigation.
7. Lot 6 — identifiants et expansion.
8. Lot 7 — règles de création.
9. Lot 8 — performance de l'explorateur.
10. Lot 9 — suppression.
11. Lot 10 — RACI.
12. Lot 11 — code mort.
13. Lot 12 — modernisation des dépendances.

Après chaque lot, lancer le CI et les tests ciblés avant de passer au suivant. Garder les changements fonctionnels, optimisations et mises à niveau de dépendances dans des commits distincts.

## 8. Commandes reproductibles suggérées

Ces commandes sont des pistes de vérification à exécuter dans un clone local ; elles n'ont pas été exécutées pendant cet audit.

```bash
git fetch origin
git checkout release/v2.2-reference-2026-10-23
git rev-parse HEAD
git log --oneline --decorate --graph -100
git log --all --oneline --grep='revert' -i
git log --all -- frontend/src/Components/BusinessComponents/FolderTree
git log --all -- frontend/src/Components/BusinessComponents/ProcessViewer
git diff ad9178b6749a53e2a4abbd3a9a4fea144ac13abd^ ad9178b6749a53e2a4abbd3a9a4fea144ac13abd -- frontend/src
```

Pour rechercher les symboles et imports potentiellement inutilisés, utiliser les outils statiques déjà présents dans le projet et compléter par une recherche globale :

```bash
rg -n "onNodeSelect|onNodeToggle|ProcessHierarchyTree|ResourceExplorer" frontend
rg -n "scryptSync|rate.?limit|bodyParser|json\(" backend
rg -n "parentId|assertCanDeleteResourceTree" backend
rg -n "findById|messageFlow|raci" frontend/src/extensions/raci-viewer.ts
```

Avant tout changement, confirmer que `git rev-parse HEAD` correspond bien à la référence attendue et noter les versions de Node, package manager et base de données utilisées.

## 9. Limites et conclusion

- Les problèmes décrits comme constats de code ont été inférés par inspection ; les interactions visuelles doivent être reproduites dans le navigateur.
- Le risque de migration dépend des migrations réellement appliquées sur chaque base.
- Le risque de saturation dépend également des protections du proxy et de l'environnement.
- Aucun benchmark, test navigateur automatisé, test de charge ni audit CVE exhaustif n'a été réalisé.
- Les candidats au code mort et les dépendances à supprimer nécessitent une vérification complète des imports et usages indirects.

**Conclusion :** commencer par l'authentification et la fiabilité des migrations, puis corriger les défauts fonctionnels du Viewer et des routes. Les performances de l'explorateur, de la suppression et du calcul RACI offrent ensuite les gains les plus prometteurs. Nettoyage et migrations de dépendances doivent rester séparés pour préserver la possibilité de valider chaque lot indépendamment.
