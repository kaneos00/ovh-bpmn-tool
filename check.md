
Dernière mise à jour : 25 octobre 2026
Dépôt : [kaneos00/ovh-bpmn-tool](https://github.com/kaneos00/ovh-bpmn-tool)  
Branche de référence : release/v2.2-reference-2026-10-24

Ce document est la **référence unique de suivi**. Les statuts reflètent les informations et tests rapportés à ce jour ; ils ne signifient pas qu'un comportement est validé si le test n'a pas été explicitement confirmé.

## Légende

### Statut
- **Validé** : le test fonctionnel a été explicitement déclaré OK.
- **Partiel** : code présent ou test partiel, mais résultat incomplet.
- **À corriger** : un défaut est signalé ou la fonctionnalité reste à faire.
- **À tester** : le code existe, mais le test fonctionnel n'est pas confirmé.
- **À planifier** : évolution future, non considérée comme un correctif V2.1.

### Facilité estimée
- **Facile** : changement local et bien circonscrit.
- **Moyenne** : plusieurs composants, interactions ou tests sont concernés.
- **Difficile** : dépendances ou modèle de données à analyser, risque de régression ou refonte nécessaire.

### Impact estimé
- **Faible — IHM** : modification locale d'interface.
- **Moyen — plusieurs IHM / backend** : plusieurs vues ou interactions concernées, ou modification du backend/API/données.
- **Fort — refonte** : architecture, navigation centrale, modèle métier ou refonte importante.

Les estimations sont préliminaires, à confirmer après lecture du code et définition des critères d'acceptation. « Impact » décrit l'étendue du changement, pas sa gravité pour l'utilisateur.

## A. Correctifs V2.1 et régressions à fermer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 1 | Minimap fermée à l'ouverture/sélection ; ouverture/fermeture uniquement par le bouton de la barre d'outils ; échelle initiale 1:1 et position en haut à gauche | Le bouton Viewer pilote directement le service minimap ; le bouton interne .toggle est masqué dans le Viewer uniquement | CI vert sur f1c61b5 ; recette navigateur requise | À tester dans le navigateur : confirmer que seul le bouton de la barre d'outils contrôle la minimap | Moyenne | Faible — IHM |
| 2 | Les trois panneaux gauche, central et droit vont jusqu'en bas, avec même hauteur et coins carrés | Déjà vérifié par l'utilisateur | L'utilisateur confirme le point clos précédemment | Validé — point fermé | Facile | Faible — IHM |
| 3 | Boutons Retour/Suivant sur toute la largeur du bas de l'explorateur ; raccourci Ctrl+Z ; boutons masqués ou adaptés lorsque le panneau est replié | Oui, confirmé dans les commits précédents | Retour/Suivant, Ctrl+Z et affichage dans l'état replié testés OK ; fonctionnement confirmé après reconnexion | **✅ Validé — point fermé** | Facile | Faible — IHM |
| 4 | Largeur des panneaux gauche et droit réglable à la souris et mémorisée | Oui, correction présente dans les commits précédents | Redimensionnement des deux côtés et mémorisation testés OK, y compris après reconnexion | **✅ Validé — point fermé** | Moyenne | Faible — IHM |
| 5 | Panneau de détail droit fermé par défaut ; ouverture/fermeture par le titre ; ouverture à la sélection BPMN | Déjà vérifié par l'utilisateur | L'utilisateur confirme le point clos | Validé — point fermé | Facile | Faible — IHM |
| 6 | Supprimer l'ancienne navigation et la liste « Processus et activités » ; garder Arborescence, Récents et Favoris | Le shell Viewer actif utilise FolderTree pour les dossiers et ProcessDetails avec FolderTree pour les processus. L'ancien dossier de code ResourceExplorer et ses composants associés ont été supprimés après un scan de toutes les sources TS/JS : aucune référence externe trouvée | Test d'audit des imports, contrats frontend et CI complète verts sur f1c61b5 : [tests frontend run 40179717027](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40179717027), [Validate run 40179717071](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40179717071) | Validé côté code et shell actif — point fermé. Confirmer lors de la recette Coolify qu'aucune ancienne liste ne réapparaît | Moyenne | Moyen — plusieurs IHM |
| 7 | Clic sur le nom d'un dossier : ouvrir le niveau enfant s'il est fermé, sans refermer les autres branches ; garder la navigation attendue. La flèche reste un contrôle explicite | Correction candidate dans FolderTree.tsx et useFolderTree.ts : expansion additive et développement du dossier sélectionné après navigation/remontage | CI vert sur f1c61b5 : [tests frontend run 40179717027](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40179717027), [Validate run 40179717071](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40179717071) | Prêt pour recette navigateur : tester nom, flèche, niveaux 3–4 et conservation des branches ouvertes | Moyenne | Moyen — plusieurs IHM |
| 8 | Fil d'Ariane et profondeur des dossiers cohérents ; retour vers les dossiers parents dans le shell Viewer | Le fil d'Ariane remonte les parentId ; une garde contre les cycles est ajoutée. Un parent absent peut tronquer la chaîne ; depth est stocké séparément et n'est pas la source du fil | CI vert sur f1c61b5 ; les données réelles de Coolify n'ont pas été inspectées | Audit partiel : tester les niveaux 3–4 et comparer sans modification parentId et depth ; aucune preuve actuelle de corruption | Difficile | Fort — navigation et layout Viewer |
| 9 | Simple clic sur un élément BPMN = sélection ; second clic sur le même élément = désélection, sans navigation involontaire | Oui : `4ec6460` distingue clic simple et double clic ; `7ac6f31` rend les lanes sélectionnables ; `c6cf2d4` préserve la sélection au clic simple sur une Call Activity | Recette utilisateur du 23/10/2026 : sélection/désélection testée sur un élément BPMN, une lane et un sous-processus ; résultat OK | **✅ Validé — point fermé**. Tests fonctionnels confirmés par l'utilisateur | Moyenne | Moyen — plusieurs IHM |
| 10 | Simple clic sélectionne ; double-clic ouvre le processus appelé pour Call Activity et sous-processus BPMN replié ; double-clic ouvre aussi l'URL d'une Task qui en possède une | Correction candidate : résolution des références SubProcess vers ID de ressource ou ID de processus BPMN ; double-clic URL limité au Viewer | CI vert sur f1c61b5 ; test navigateur nécessaire | Prêt pour recette navigateur : vérifier sélection au simple clic, ouverture au double-clic et absence de navigation involontaire | Difficile | Moyen — plusieurs IHM / backend |
| 11 | Toutes les flèches de navigation sont en bas à droite, apparaissent uniquement après sélection et ouvrent la cible au clic ; second clic désélectionne | Tâche URL, SubProcess et Call Activity utilisent une position commune ; flèches SubProcess/Call Activity cliquables ; overlay natif gris drilldown retiré dans le Viewer | CI vert sur f1c61b5 ; recette navigateur nécessaire | Prêt pour recette navigateur : vérifier les trois types, position, clic sur flèche et disparition à la désélection | Moyenne | Faible — IHM |
| 12 | Récents et Favoris affichent les ressources attendues sans doublons et conservent l'onglet choisi lors de la navigation | L'onglet explorateur est mémorisé dans localStorage ; listes Récents/Favoris distinctes | CI vert sur f1c61b5 ; test navigateur nécessaire | Prêt pour recette navigateur : ouvrir un processus depuis Récents puis Favoris et vérifier que l'onglet reste sélectionné | Moyenne | Moyen — plusieurs IHM |
| 13 | Navigation entre processus fluide, sans rechargement complet ni clignotement non nécessaire | Diagnostic en cours : le Viewer efface le diagramme lorsque xmlContent est temporairement absent lors d'un changement de ressource ; cela peut créer un intervalle blanc. La cause des clignotements aléatoires n'est pas encore confirmée | Pas encore de correction ni de test navigateur de reproduction | À investiguer : tracer les imports asynchrones et erreurs BPMN ; ne pas masquer les erreurs ni supposer que tous les clignotements ont la même cause | Difficile | Moyen — plusieurs IHM / backend |
| 14 | CI de la branche de reprise | Oui | CI Validate réussie le 23/10/2026 sur la tête de branche `9bd666c` (push et pull request) ; les deux exécutions se terminent avec succès | **✅ Validé — point fermé**. Vérification du commit `9bd666c` : CI Validate verte (push : [run 1143](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/39955337774) ; PR : [run 1144](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/39955346336)). La CI valide les contrôles automatisés, sans remplacer la recette fonctionnelle navigateur | — | Moyen — plusieurs composants |

## B. Recherche, RACI et interactions dans le Viewer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 15 | Dans le panneau de recherche, intégrer des liens vers les fiches/matrices RACI correspondantes | Non confirmé | Non confirmé | **À analyser puis réaliser**. Définir la destination et le comportement du lien | Moyenne | Moyen — plusieurs IHM |
| 16 | Lorsqu'un rôle est choisi dans les résultats de recherche, mettre en surbrillance les lanes correspondantes dans le diagramme BPMN | Non confirmé | Non testé | **À planifier** : établir la correspondance rôle ↔ lane BPMN et gérer les rôles présents dans plusieurs processus | Moyenne | Moyen — plusieurs IHM |
| 17 | Rendre les lanes BPMN sélectionnables | Non confirmé | Non testé | **À réaliser** : sélectionner une lane sans casser la sélection des tâches et événements | Moyenne | Moyen — plusieurs IHM |
| 18 | Sélectionner une lane met en évidence la colonne du rôle correspondant dans le tableau RACI du Viewer, avec un cadre visible autour de la colonne | Non confirmé | Non testé | **À réaliser** : définir une correspondance robuste entre lane et rôle de matrice RACI ; gérer les rôles absents ou ambigus | Difficile | Moyen — plusieurs IHM / données |
| 19 | Afficher les badges R/A/C/I avec les mêmes couleurs pastel que celles déjà utilisées dans l'application | Partiel / réutilisation possible des styles existants | Pas de test spécifique rapporté | **À vérifier puis harmoniser** sans créer une deuxième palette de couleurs | Facile | Faible — IHM |
| 20 | Depuis une cellule/activité du tableau RACI, cliquer pour pointer vers l'élément BPMN correspondant et le mettre en évidence | Non confirmé | Non testé | **À réaliser** : associer ligne/activité à l'ID BPMN, centrer ou surligner l'élément et gérer les éléments hors diagramme courant | Difficile | Moyen — plusieurs IHM / données |
| 21 | Dans le Viewer, disposer les onglets Processus, RACI et Historique entre l'explorateur gauche et le détail droit ; permettre une navigation RACI aussi naturelle que celle des processus | Non confirmé | Non testé | **À planifier** après stabilisation V2.1 ; définir la navigation, l'état des onglets et les liens croisés | Difficile | Fort — refonte de la zone Viewer |
| 22 | Dans le détail droit, présenter verticalement et dans l'ordre : informations de tâche, RACI, documentation ; afficher le lien externe dans la section documentation | Oui | Recette utilisateur du 23/10/2026 : point confirmé OK sur la version de référence V2.2 | ✅ **Validé — point fermé le 23/10/2026**. Référence logicielle : `ad9178b` (PR #31) | Moyenne | Faible — IHM |

## C. Référentiel et explorateur en arborescence graphique

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 23 | Un seul explorateur gauche avec Arborescence, Récents et Favoris ; pas de liste concurrente « Processus et activités » | Shell actif vérifié ; ancien composant ResourceExplorer supprimé après vérification qu'aucune source ne l'importe | L'utilisateur n'a rencontré aucun cas d'une seconde navigation ; CI vert sur f1c61b5 | Validé — point fermé | Moyenne | Moyen — plusieurs IHM |
| 24 | Explorateur aligné visuellement avec le panneau de détail droit : hauteur, bordures, largeur et états repliés cohérents | Déjà vérifié par l'utilisateur | L'utilisateur confirme le point clos précédemment | Validé — point fermé | Facile | Faible — IHM |
| 25 | Remplacer, dans le Référentiel, l'explorateur actuel par l'arborescence de la page Arborescence (tree view), avec une présentation inspirée de [fokolo/family-tree](https://github.com/fokolo/family-tree) | Non confirmé | Aucune recette | **À concevoir** : réutiliser la source de données et les actions existantes ; ne pas confondre inspiration visuelle et dépendance obligatoire au projet externe | Difficile | Fort — refonte de l'explorateur |
| 26 | Arborescence graphique dynamique, réorganisée selon la taille de l'écran | Non | Non testé | **À concevoir** : définir le comportement responsive, le zoom/déplacement éventuel, les niveaux visibles et l'accessibilité | Difficile | Fort — refonte de l'explorateur |
| 27 | Menu contextuel au clic droit sur un nœud : Edit, Clone, Share, Delete ; disponible pour éditeurs et administrateurs, pas pour Viewer simple | Non confirmé | Non testé | **À réaliser** avec contrôle des rôles côté serveur et dans l'IHM ; confirmer les droits de chaque action | Difficile | Moyen — plusieurs IHM / backend |
| 28 | Prévoir une maquette HTML de l'explorateur en arbre familial avant de développer | Non | Non testé | **À faire en amont du point 25** pour valider le look, le responsive et les menus de rôle ; maquette non encore créée | Moyenne | Faible — IHM |

## D. Hiérarchie des processus, rôles et responsabilités

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 29 | Sous chaque processus parent, résoudre les Call Activities et les sous-processus BPMN repliés sans doublons, références ambiguës ni récursion infinie | Résolution des références et déduplication en place ; garde de cycle dans la hiérarchie des dossiers | CI vert sur f1c61b5 ; contrats source couvrent la résolution/déduplication et les cycles | Validé côté code/tests — point fermé selon la demande. La recette visuelle de l'explorateur est couverte au point 7 | Difficile | Moyen — plusieurs IHM / backend |
| 30 | Étudier si cette hiérarchie peut être réutilisée ailleurs | Non | Non applicable | **À étudier plus tard**, sans en faire une exigence de la première livraison | Moyenne | Moyen — plusieurs IHM |
| 31 | Associer un rôle à chaque utilisateur dans chaque projet à partir des rôles des processus du projet | Non confirmé | Non testé | **À cadrer** : règles d'héritage, plusieurs rôles, exceptions et droits ; distinguer rôle de processus et autorisation d'accès | Difficile | Fort — modèle métier / backend |
| 32 | Fiche de poste par utilisateur : récapitulatif de toutes ses tâches et responsabilités sur tous les projets, avec plusieurs modes de regroupement | Non | Non testé | **À concevoir** : maquette d'écran et regroupements possibles (par projet, processus, rôle, type RACI) avant développement | Difficile | Fort — nouvelle fonctionnalité / modèle métier |
| 33 | Prévoir un responsable pour chaque processus, capable d'éditer, valider et publier le processus | Non confirmé | Non testé | **À cadrer** : cycle de vie brouillon/revue/validation/publication, permissions et historique des versions | Difficile | Fort — workflow métier / backend |
| 34 | Prévoir une option « acting » pour les rôles sans personne actuellement en poste | Non | Non testé | **À cadrer** : suppléance temporaire, dates de validité, délégation et traçabilité | Difficile | Moyen — modèle métier / backend |

## E. Couleurs BPMN, recherche et données

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 35 | Événements Start en vert et End en rouge, y compris plusieurs événements dans un diagramme | Marqueurs et styles dédiés présents | L'utilisateur confirme le point clos ; CI vert sur 041fdf9 | Validé — point fermé | Facile | Faible — IHM |
| 36 | Data Store et Data Object Reference orange, sélectionnables et avec lien associé ouvrable | Les deux types sont acceptés par la sélection du Viewer ; styles et flèches d'URL présents | CI vert sur f1c61b5 ; test navigateur requis | Correction candidate : tester sélection, panneau droit, lien, sauvegarde et rechargement pour les deux types | Moyenne | Moyen — IHM / données |
| 43 | Descriptif pédagogique du type BPMN sous l'identifiant dans le panneau droit, sans remplacer la documentation propre à l'élément | Code présent | L'utilisateur confirme le point clos | Validé — point fermé | Facile | Faible — IHM |
| 37 | Ajouter une recherche en langage naturel avec une page de résultats | Non | Non testé | **À cadrer** : sources recherchées (processus, tâches, RACI, documentation), pertinence, droits d'accès et moteur requis | Difficile | Fort — nouvelle fonctionnalité / architecture |
| 38 | Ajouter une page de saisie/inventaire des données qui recense fichiers et bases de données avec leurs informations | Non | Non testé | **À cadrer** : métadonnées, types de sources, propriétaires, liens, droits et éventuelles intégrations | Difficile | Fort — nouvelle fonctionnalité / modèle métier |
| 39 | Ajouter un moteur de vérification de la formulation des actions, pour s'assurer qu'une action est claire et bien exprimée | Non | Non testé | **À cadrer** : critères de qualité, règles de validation, suggestions et éventuelle assistance linguistique ; ne pas bloquer une action sans règle définie | Difficile | Fort — nouvelle fonctionnalité / moteur de validation |

## F. Modèles BPMN et export documentaire

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 40 | Proposer des modèles BPMN réutilisables, dont un modèle avec des lanes préconfigurées pour trois rôles ; les noms des rôles doivent être personnalisables et le modèle doit pouvoir servir de point de départ à un nouveau processus | Non | Non testé | **À cadrer puis concevoir** : définir le mécanisme de création/duplication de modèle, les libellés par défaut des trois lanes, leur personnalisation et la manière de maintenir les modèles. Vérifier que le résultat reste un BPMN valide et éditable | Moyenne | Moyen — IHM / gestion des modèles |
| 41 | Exporter un diagramme BPMN en SVG prêt à intégrer dans un document A4. Si le processus est trop long, proposer une découpe automatique en plusieurs pages/segments, avec en-têtes cohérents et identiques ; la première page doit montrer le point d'arrêt et la page suivante le point de reprise, clairement reliés et sans ambiguïté sur la continuité du flux | Non | Non testé | **À cadrer puis prototyper** : définir les dimensions et marges A4, l'échelle/lecture minimale, la règle de découpe et les cas où une activité ou un flux traverse la coupure. Répéter les en-têtes et ajouter des repères de continuation/reprise correspondants ; produire un SVG distinct par page et vérifier que l'ensemble reste lisible et fidèle au BPMN source. Prévoir aperçu avant export et tests sur processus courts, longs et avec plusieurs lanes | Difficile | Fort — rendu BPMN / export documentaire |
| 42 | Colorer toutes les gateways BPMN (Exclusive, Parallel, Inclusive, Complex, Event-Based) avec le même contour violet et le même motif interne ; badge du panneau droit cohérent | Correction validée par l'utilisateur sur Coolify le 24/10/2026 | Recette utilisateur confirmée OK | Validé — point fermé | Facile | Faible — IHM |
 
## G. Ordre de traitement recommandé

Cet ordre privilégie la stabilisation et les corrections qui bloquent la navigation avant les évolutions de plus grande ampleur.

1. **Navigation et explorateur** : points 7–8 et 23 ; correctifs candidats ajoutés sur `fix/v2.1-folder-breadcrumb-layout`, validation CI et navigateur requise avant déploiement.
2. **Minimap et espace de travail** : points 1–5.
3. **Navigation BPMN, appels, doublons et fluidité** : points 9–13 et 29. Hiérarchie OK et doublons éliminés ; ne pas retoucher les clignotements avant diagnostic des processus.
4. **Référentiel arbre graphique** : maquette 28, puis points 25–27.
5. **Détail tâche, recherche et RACI** : points 15–22.
6. **Couleurs BPMN et Data Store** : points 35–36.
7. **Responsabilités et gouvernance** : points 31–34.
8. **Fonctionnalités nouvelles** : points 32, 37–39, après cadrage métier.
9. **Modèles BPMN et export A4/SVG** : points 40–41 ; cadrer le modèle à trois rôles puis prototyper la pagination automatique SVG.

## Règles de mise à jour

- Conserver les numéros pour permettre de vérifier les corrections une par une.
- Pour passer un point à **Validé**, indiquer la date, le commit/PR et le résultat du test concret.
- Une CI verte n'est pas une preuve de validation fonctionnelle dans le navigateur.
- Ne pas refaire un correctif qui existe déjà : comparer les commits et réutiliser la correction validée lorsqu'elle est pertinente.
- Aucun déploiement ou merge n'est autorisé implicitement par ce tableau ; attendre la validation prévue dans le workflow du projet.
