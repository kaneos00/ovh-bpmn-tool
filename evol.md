# Évolutions à planifier ou à développer

Dernière mise à jour : 26 octobre 2026. Cette liste regroupe les améliorations et nouvelles fonctionnalités ; elles ne sont pas considérées comme des correctifs validés.

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

## C. Référentiel et explorateur en arborescence graphique

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 25 | Remplacer, dans le Référentiel, l'explorateur actuel par l'arborescence de la page Arborescence (tree view), avec une présentation inspirée de [fokolo/family-tree](https://github.com/fokolo/family-tree) | Non confirmé | Aucune recette | **À concevoir** : réutiliser la source de données et les actions existantes ; ne pas confondre inspiration visuelle et dépendance obligatoire au projet externe | Difficile | Fort — refonte de l'explorateur |
| 26 | Arborescence graphique dynamique, réorganisée selon la taille de l'écran | Non | Non testé | **À concevoir** : définir le comportement responsive, le zoom/déplacement éventuel, les niveaux visibles et l'accessibilité | Difficile | Fort — refonte de l'explorateur |
| 27 | Menu contextuel au clic droit sur un nœud : Edit, Clone, Share, Delete ; disponible pour éditeurs et administrateurs, pas pour Viewer simple | Non confirmé | Non testé | **À réaliser** avec contrôle des rôles côté serveur et dans l'IHM ; confirmer les droits de chaque action | Difficile | Moyen — plusieurs IHM / backend |
| 28 | Prévoir une maquette HTML de l'explorateur en arbre familial avant de développer | Non | Non testé | **À faire en amont du point 25** pour valider le look, le responsive et les menus de rôle ; maquette non encore créée | Moyenne | Faible — IHM |

## D. Hiérarchie des processus, rôles et responsabilités

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 30 | Étudier si cette hiérarchie peut être réutilisée ailleurs | Non | Non applicable | **À étudier plus tard**, sans en faire une exigence de la première livraison | Moyenne | Moyen — plusieurs IHM |
| 31 | Associer un rôle à chaque utilisateur dans chaque projet à partir des rôles des processus du projet | Non confirmé | Non testé | **À cadrer** : règles d'héritage, plusieurs rôles, exceptions et droits ; distinguer rôle de processus et autorisation d'accès | Difficile | Fort — modèle métier / backend |
| 32 | Fiche de poste par utilisateur : récapitulatif de toutes ses tâches et responsabilités sur tous les projets, avec plusieurs modes de regroupement | Non | Non testé | **À concevoir** : maquette d'écran et regroupements possibles (par projet, processus, rôle, type RACI) avant développement | Difficile | Fort — nouvelle fonctionnalité / modèle métier |
| 33 | Prévoir un responsable pour chaque processus, capable d'éditer, valider et publier le processus | Non confirmé | Non testé | **À cadrer** : cycle de vie brouillon/revue/validation/publication, permissions et historique des versions | Difficile | Fort — workflow métier / backend |
| 34 | Prévoir une option « acting » pour les rôles sans personne actuellement en poste | Non | Non testé | **À cadrer** : suppléance temporaire, dates de validité, délégation et traçabilité | Difficile | Moyen — modèle métier / backend |

## E. Couleurs BPMN, recherche et données

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 37 | Ajouter une recherche en langage naturel avec une page de résultats | Non | Non testé | **À cadrer** : sources recherchées (processus, tâches, RACI, documentation), pertinence, droits d'accès et moteur requis | Difficile | Fort — nouvelle fonctionnalité / architecture |
| 38 | Ajouter une page de saisie/inventaire des données qui recense fichiers et bases de données avec leurs informations | Non | Non testé | **À cadrer** : métadonnées, types de sources, propriétaires, liens, droits et éventuelles intégrations | Difficile | Fort — nouvelle fonctionnalité / modèle métier |
| 39 | Ajouter un moteur de vérification de la formulation des actions, pour s'assurer qu'une action est claire et bien exprimée | Promu dans `check_toto.md` à la demande de l'utilisateur le 26/10/2026 | Non testé | **Retiré de la liste des évolutions à planifier : développement prioritaire demandé.** Le périmètre sera défini à partir des règles de qualité BPMN déjà retenues ; les recommandations resteront non bloquantes | Difficile | Fort — nouvelle fonctionnalité / moteur de validation |

## F. Modèles BPMN et export documentaire

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 40 | Proposer des modèles BPMN réutilisables, dont un modèle avec des lanes préconfigurées pour trois rôles ; les noms des rôles doivent être personnalisables et le modèle doit pouvoir servir de point de départ à un nouveau processus | Non | Non testé | **À cadrer puis concevoir** : définir le mécanisme de création/duplication de modèle, les libellés par défaut des trois lanes, leur personnalisation et la manière de maintenir les modèles. Vérifier que le résultat reste un BPMN valide et éditable | Moyenne | Moyen — IHM / gestion des modèles |
| 41 | Exporter un diagramme BPMN en SVG prêt à intégrer dans un document A4. Si le processus est trop long, proposer une découpe automatique en plusieurs pages/segments, avec en-têtes cohérents et identiques ; la première page doit montrer le point d'arrêt et la page suivante le point de reprise, clairement reliés et sans ambiguïté sur la continuité du flux | Non | Non testé | **À cadrer puis prototyper** : définir les dimensions et marges A4, l'échelle/lecture minimale, la règle de découpe et les cas où une activité ou un flux traverse la coupure. Répéter les en-têtes et ajouter des repères de continuation/reprise correspondants ; produire un SVG distinct par page et vérifier que l'ensemble reste lisible et fidèle au BPMN source. Prévoir aperçu avant export et tests sur processus courts, longs et avec plusieurs lanes | Difficile | Fort — rendu BPMN / export documentaire |

## H. Évolution à planifier

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 44 | Ajouter Undo / Redo (annuler / rétablir) dans le modeleur BPMN, pour revenir en arrière et réappliquer les modifications du diagramme | Non — évolution ajoutée à la liste uniquement, aucune implémentation demandée ou engagée | Non testé | **À planifier** : étudier l'historique natif du modeleur BPMN, les opérations couvertes, les raccourcis clavier et la cohérence avec sauvegarde/chargement ; définir les critères d'acceptation avant développement | Moyenne | Moyen — IHM / édition BPMN |
| 45 | Prévoir un thème sombre (dark theme) cohérent dans l'application, y compris l'explorateur, les panneaux, les formulaires, le Viewer BPMN, les badges et les composants de recherche | Non — évolution ajoutée à la liste uniquement | Non testé | **À planifier** : inventorier les couleurs codées en dur, définir les tokens clair/sombre et leur persistance, puis traiter l'accessibilité/contraste et les couleurs sémantiques BPMN sans modifier les données du diagramme | Difficile | Fort — ensemble de l'IHM |

## I. Évolutions Viewer à cadrer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 47 | Reproduire à l'identique dans l'onglet RACI du Viewer le panneau RACI existant dans le modeleur : structure, positionnement, couleurs, espacements, interactions et présentation des badges | Non confirmé ; analyse comparative des composants et styles à effectuer avant de décider quoi mutualiser | Non testé | **À réaliser** : comparer le panneau RACI du modeleur à l'onglet RACI du Viewer ; réutiliser les composants/styles existants autant que possible afin d'éviter deux implémentations divergentes ; ne pas modifier le rendu validé du modeleur | Moyenne à difficile | Moyen — plusieurs IHM |
| 48 | Permettre depuis le panneau droit du Viewer de consulter et modifier les descriptions de tâches, les données RACI et les documents associés, sans ouvrir le modeleur, selon les permissions du profil connecté | Non confirmé ; vérifier les composants d'édition, les API et les règles d'autorisation déjà disponibles | Non testé | **À cadrer puis réaliser** : distinguer lecture et modification selon les droits ; réutiliser les règles d'accès existantes, appliquer les contrôles côté serveur/API lorsqu'ils existent et éviter tout contournement par l'IHM ; définir le comportement de sauvegarde et les messages d'erreur avant implémentation | Difficile | Fort — plusieurs IHM / permissions / données |


## Règles de suivi

- Conserver les numéros de tickets existants.
- Indiquer le commit et le résultat concret du test lors de chaque mise à jour.
- Ne pas déclarer un point validé sur la seule base de la CI.
