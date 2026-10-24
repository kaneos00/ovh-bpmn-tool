# Check — suivi des corrections et évolutions BPMN V2

Dernière mise à jour : 24 octobre 2026  
Dépôt : [kaneos00/ovh-bpmn-tool](https://github.com/kaneos00/ovh-bpmn-tool)  
Branche de référence : `release/v2.2-reference-2026-10-23`

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
| 1 | Minimap : fermée à l'ouverture/sélection d'un processus ; ouverture/fermeture uniquement via l'action prévue (+/−) ; diagramme initial à l'échelle 1:1, en haut à gauche | Oui, plusieurs commits ; comportement retouché, dont `37575a4` | Partiel ; minimap encore signalée visible à la sélection du processus | **À corriger**. Comparer les commits précédents où le comportement avait été corrigé, puis tester sélection, import et boutons | Moyenne | Faible — IHM |
| 2 | Les trois panneaux (explorateur gauche, BPMN central, détail droit) restent visibles, vont jusqu'en bas, ont la même hauteur et des coins carrés ; le BPMN garde un maximum d'espace | Régression initiale due à `height: 0` sur des conteneurs. Commit `3a4607d` a restauré l'affichage ; nouveau correctif `6490a45` rétablit des hauteurs `100%` sur les enfants flex concernés pour propager la hauteur disponible jusqu'aux trois panneaux | Recette Coolify du 24 octobre : l'utilisateur confirme que les trois panneaux sont revenus, mais qu'ils ne descendent toujours pas jusqu'en bas de la fenêtre | 🟡 **Correction de hauteur candidate — CI puis nouvelle recette navigateur requis**. Vérifier le bord inférieur des trois panneaux, latéraux repliés/dépliés ; contrôler aussi absence de chevauchement et de contenu coupé. Ne pas fermer avant confirmation utilisateur | Moyenne | Faible — IHM |
| 3 | Boutons Retour/Suivant sur toute la largeur du bas de l'explorateur ; raccourci Ctrl+Z ; boutons masqués ou adaptés lorsque le panneau est replié | Oui, confirmé dans les commits précédents | Retour/Suivant, Ctrl+Z et affichage dans l'état replié testés OK ; fonctionnement confirmé après reconnexion | **✅ Validé — point fermé** | Facile | Faible — IHM |
| 4 | Largeur des panneaux gauche et droit réglable à la souris et mémorisée | Oui, correction présente dans les commits précédents | Redimensionnement des deux côtés et mémorisation testés OK, y compris après reconnexion | **✅ Validé — point fermé** | Moyenne | Faible — IHM |
| 5 | Panneau de détail droit fermé par défaut ; clic sur son titre pour ouvrir/fermer ; sélection d'un élément BPMN ouvre le détail ; état mémorisé selon le besoin validé | Oui, PR #26 et retouches associées | Partiel | **À tester** : fermeture au démarrage, ouverture par sélection/clic, comportement lorsque les panneaux sont repliés, persistance | Moyenne | Faible — IHM |
| 6 | Retirer définitivement l'ancien panneau à l'extrême gauche et l'ancienne zone « Processus et activités » ; ne garder qu'un explorateur avec Arborescence, Récents et Favoris | Correctif ajouté sur `fix/v2.1-points-6-8-29-validation` : retrait de la liste centrale héritée des dossiers | CI et recette navigateur à exécuter ; vérifier qu'aucune action utile n'a été perdue | **À tester**. Vérifier dossiers, processus, favoris/récents et navigation vers le parent | Moyenne | Moyen — plusieurs IHM |
| 7 | Dans l'explorateur de gauche, le clic sur le nom d'un dossier déplie/replie ses enfants sans changer de page ; le clic sur la flèche d'expansion doit produire le même résultat pour les dossiers et les processus qui ont des enfants | Partiel : clic sur le nom validé ; clic sur la flèche non fonctionnel pour les dossiers/processus | Recette utilisateur du 23/10/2026 : clic sur le nom OK, clic sur la flèche KO | 🟡 **Partiel — reste à corriger**. Corriger la gestion du clic sur la flèche sans casser la navigation par le nom du processus | Moyenne | Moyen — plusieurs IHM |
| 8 | Référentiel comme écran d'accueil ; bouton Home et fil d'Ariane permettent de revenir au référentiel et de naviguer vers les dossiers parents en conservant la nouvelle interface Viewer | Partiel : Home et retour au référentiel OK ; ouverture d'un dossier depuis le fil d'Ariane affiche encore l'ancienne présentation, sans l'explorateur et ses commandes Retour/Suivant | Recette utilisateur du 23/10/2026 : retour au référentiel OK ; navigation vers un dossier = interface incohérente / ancien explorateur | 🔴 **À corriger**. Faire utiliser aux pages dossier le même shell/layout que la page processus, avec l'explorateur de gauche et les commandes Retour/Suivant ; vérifier que la liste héritée n'est plus affichée | Difficile | Fort — navigation et layout Viewer |
| 9 | Simple clic sur un élément BPMN = sélection ; second clic sur le même élément = désélection, sans navigation involontaire | Oui : `4ec6460` distingue clic simple et double clic ; `7ac6f31` rend les lanes sélectionnables ; `c6cf2d4` préserve la sélection au clic simple sur une Call Activity | Recette utilisateur du 23/10/2026 : sélection/désélection testée sur un élément BPMN, une lane et un sous-processus ; résultat OK | **✅ Validé — point fermé**. Tests fonctionnels confirmés par l'utilisateur | Moyenne | Moyen — plusieurs IHM |
| 10 | Pour une Call Activity / un sous-processus navigable : simple clic sélectionne ; double-clic entre dans le processus appelé | Oui : hiérarchie fonctionnelle et doublons éliminés selon la recette du 23/10/2026 | Hiérarchie OK, plus de doublons ; clignotements persistants et erreurs possibles, potentiellement liés à des erreurs dans les modèles BPMN | 🟡 **Partiellement validé — investigation restante**. Ne pas modifier davantage ce comportement pour l'instant. Garder les clignotements/erreurs comme point ouvert ; reprendre uniquement après analyse des processus concernés et reproduction des erreurs | Difficile | Moyen — plusieurs IHM / backend |
| 11 | Flèche bleue de lien externe ou d'appel visible uniquement après clic sur l'élément concerné ; curseur cohérent avec une cible réellement navigable | Oui, plusieurs commits | Partiel | **À tester / corriger** : aucun badge affiché par défaut ; badge limité à l'élément sélectionné ; clic suivant désélectionne | Moyenne | Faible — IHM |
| 12 | Récents et Favoris : afficher les processus appelés attendus sans doublons, en distinguant ID de ressource et ID de nœud de l'arbre | Oui, commits `c5ce338` et `4d095fe` | Partiel : commit testé, doublons ensuite signalés | **À corriger**. Tracer la source des doublons et dédupliquer sur un identifiant métier stable | Difficile | Moyen — plusieurs IHM / backend |
| 13 | Navigation entre processus fluide, sans rechargement complet de page ni clignotement non nécessaire | Pas de correction confirmée | Au 23/10/2026 : clignotements encore observés sur des processus contenant des appels/sous-processus ; absence de doublons désormais confirmée par l'utilisateur | 🔴 **Reste à traiter, sans modification pour l'instant**. Isoler les erreurs BPMN éventuelles avant de toucher au code ; reproduire et diagnostiquer avant tout correctif pour éviter une régression | Difficile | Moyen — plusieurs IHM / backend |
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
| 23 | Dans le conteneur gauche `/html/body/div[1]/div/div[1]`, conserver un seul explorateur avec Arborescence, Récents et Favoris ; retirer la liste séparée « Processus et activités » | Partiel | Explorateur repositionné, ancienne navigation encore accessible dans certains cas | **À terminer** avec les points 6 à 8 ; éviter deux arbres/listes concurrents | Moyenne | Moyen — plusieurs IHM |
| 24 | Mettre le panneau explorateur à gauche au même niveau visuel que le panneau de détail droit, avec une structure et un style cohérents | Partiel | Position de l'explorateur déclarée correcte ; cohérence complète à retester | **À retester** : alignement, bordures, hauteur, largeur, coins carrés et états repliés | Facile | Faible — IHM |
| 25 | Remplacer, dans le Référentiel, l'explorateur actuel par l'arborescence de la page Arborescence (tree view), avec une présentation inspirée de [fokolo/family-tree](https://github.com/fokolo/family-tree) | Non confirmé | Aucune recette | **À concevoir** : réutiliser la source de données et les actions existantes ; ne pas confondre inspiration visuelle et dépendance obligatoire au projet externe | Difficile | Fort — refonte de l'explorateur |
| 26 | Arborescence graphique dynamique, réorganisée selon la taille de l'écran | Non | Non testé | **À concevoir** : définir le comportement responsive, le zoom/déplacement éventuel, les niveaux visibles et l'accessibilité | Difficile | Fort — refonte de l'explorateur |
| 27 | Menu contextuel au clic droit sur un nœud : Edit, Clone, Share, Delete ; disponible pour éditeurs et administrateurs, pas pour Viewer simple | Non confirmé | Non testé | **À réaliser** avec contrôle des rôles côté serveur et dans l'IHM ; confirmer les droits de chaque action | Difficile | Moyen — plusieurs IHM / backend |
| 28 | Prévoir une maquette HTML de l'explorateur en arbre familial avant de développer | Non | Non testé | **À faire en amont du point 25** pour valider le look, le responsive et les menus de rôle ; maquette non encore créée | Moyenne | Faible — IHM |

## D. Hiérarchie des processus, rôles et responsabilités

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 29 | Dans l'explorateur, placer sous chaque processus parent les processus référencés par ses Call Activities et sous-processus BPMN « collapsed » | Correctif ajouté : extraction des `calledElement` et des IDs des `subProcess isExpanded="false"`, résolution uniquement si l'identifiant cible est non ambigu, déduplication et filtrage des cycles existants | CI et recette navigateur à exécuter ; tester un appel simple, plusieurs parents, une référence inconnue et un cycle | **À tester**. Les cycles sont filtrés ; vérifier que chaque processus reste accessible et n'apparaît qu'une fois | Difficile | Moyen — plusieurs IHM / backend |
| 30 | Étudier si cette hiérarchie peut être réutilisée ailleurs | Non | Non applicable | **À étudier plus tard**, sans en faire une exigence de la première livraison | Moyenne | Moyen — plusieurs IHM |
| 31 | Associer un rôle à chaque utilisateur dans chaque projet à partir des rôles des processus du projet | Non confirmé | Non testé | **À cadrer** : règles d'héritage, plusieurs rôles, exceptions et droits ; distinguer rôle de processus et autorisation d'accès | Difficile | Fort — modèle métier / backend |
| 32 | Fiche de poste par utilisateur : récapitulatif de toutes ses tâches et responsabilités sur tous les projets, avec plusieurs modes de regroupement | Non | Non testé | **À concevoir** : maquette d'écran et regroupements possibles (par projet, processus, rôle, type RACI) avant développement | Difficile | Fort — nouvelle fonctionnalité / modèle métier |
| 33 | Prévoir un responsable pour chaque processus, capable d'éditer, valider et publier le processus | Non confirmé | Non testé | **À cadrer** : cycle de vie brouillon/revue/validation/publication, permissions et historique des versions | Difficile | Fort — workflow métier / backend |
| 34 | Prévoir une option « acting » pour les rôles sans personne actuellement en poste | Non | Non testé | **À cadrer** : suppléance temporaire, dates de validité, délégation et traçabilité | Difficile | Moyen — modèle métier / backend |

## E. Couleurs BPMN, recherche et données

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 35 | Colorer les événements de début/Start en vert et les événements de fin/End en rouge | Oui : marqueurs et styles dédiés dans le Viewer et le mode édition | CI et recette navigateur à exécuter ; vérifier Start/End avec plusieurs événements et thèmes | 🟡 **Code ajouté — à valider**. Vérifier le rendu réel et le contraste avant fermeture | Facile | Faible — IHM |
| 36 | Colorer les Data Store et Data Object Reference en orange et permettre de les lier ou pointer vers l'outil associé | Oui côté code : marqueurs et styles orange pour `bpmn:DataStoreReference` et `bpmn:DataObjectReference` dans le Viewer et l'éditeur ; champ `url:link` « URL de l’outil associé » et flèche cliquable sur l'élément sélectionné | CI et recette navigateur à exécuter ; vérifier la couleur, la persistance après sauvegarde/rechargement et l'ouverture du lien pour les deux types d'éléments | 🟡 **À valider**. La flèche reste positionnée à droite ; ne pas déplacer. Confirmer le comportement dans l'application avant fermeture | Moyenne | Moyen — IHM / données |
| 37 | Ajouter une recherche en langage naturel avec une page de résultats | Non | Non testé | **À cadrer** : sources recherchées (processus, tâches, RACI, documentation), pertinence, droits d'accès et moteur requis | Difficile | Fort — nouvelle fonctionnalité / architecture |
| 38 | Ajouter une page de saisie/inventaire des données qui recense fichiers et bases de données avec leurs informations | Non | Non testé | **À cadrer** : métadonnées, types de sources, propriétaires, liens, droits et éventuelles intégrations | Difficile | Fort — nouvelle fonctionnalité / modèle métier |
| 39 | Ajouter un moteur de vérification de la formulation des actions, pour s'assurer qu'une action est claire et bien exprimée | Non | Non testé | **À cadrer** : critères de qualité, règles de validation, suggestions et éventuelle assistance linguistique ; ne pas bloquer une action sans règle définie | Difficile | Fort — nouvelle fonctionnalité / moteur de validation |

## F. Modèles BPMN et export documentaire

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 40 | Proposer des modèles BPMN réutilisables, dont un modèle avec des lanes préconfigurées pour trois rôles ; les noms des rôles doivent être personnalisables et le modèle doit pouvoir servir de point de départ à un nouveau processus | Non | Non testé | **À cadrer puis concevoir** : définir le mécanisme de création/duplication de modèle, les libellés par défaut des trois lanes, leur personnalisation et la manière de maintenir les modèles. Vérifier que le résultat reste un BPMN valide et éditable | Moyenne | Moyen — IHM / gestion des modèles |
| 41 | Exporter un diagramme BPMN en SVG prêt à intégrer dans un document A4. Si le processus est trop long, proposer une découpe automatique en plusieurs pages/segments, avec en-têtes cohérents et identiques ; la première page doit montrer le point d'arrêt et la page suivante le point de reprise, clairement reliés et sans ambiguïté sur la continuité du flux | Non | Non testé | **À cadrer puis prototyper** : définir les dimensions et marges A4, l'échelle/lecture minimale, la règle de découpe et les cas où une activité ou un flux traverse la coupure. Répéter les en-têtes et ajouter des repères de continuation/reprise correspondants ; produire un SVG distinct par page et vérifier que l'ensemble reste lisible et fidèle au BPMN source. Prévoir aperçu avant export et tests sur processus courts, longs et avec plusieurs lanes | Difficile | Fort — rendu BPMN / export documentaire |
| 42 | Donner aux gateways BPMN (Exclusive, Parallel, Inclusive, Complex et Event-Based) un contour et un motif intérieur violets cohérents ; badge du panneau droit violet également, sans modifier les remplissages existants | Correctif CSS/TSX présent sur la branche candidate | Recette utilisateur Coolify du 24/10/2026 : contour, symbole intérieur et badge confirmés OK | ✅ **Validé sur la branche candidate** ; ne reste pas bloquant pour les deux retouches de layout du point 2 | Facile | Faible — IHM |
 
| 43 | Afficher dans le panneau droit, juste sous l’identifiant de l’élément sélectionné, un descriptif pédagogique du rôle de son type BPMN (ex. passerelle exclusive : choisir un seul chemin selon une condition) | Code candidat ajouté pour les principaux types BPMN : tâches, passerelles, événements, sous-processus, flux et données | À vérifier dans Coolify après CI, en sélectionnant plusieurs types, notamment les différentes gateways | **À tester après CI** : le texte suit le type sélectionné et reste placé immédiatement sous l’ID, sans remplacer la documentation propre à l’élément | Facile | Faible — IHM |

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
