# Informations documentées — architecture cible et trajectoire

> **Décision d'architecture validée :** consolider d'abord les informations documentées à l'échelle de chaque projet. Le référentiel organisationnel partagé viendra dans une deuxième phase. La conception de la première phase doit préparer cette évolution sans la développer prématurément.

Ce document décrit la cible fonctionnelle et les règles à respecter lors des évolutions. Il ne signifie pas que le référentiel organisationnel ou la séparation complète des objets décrite en phase 2 sont déjà implémentés.

## 1. Principes structurants

1. Chaque projet dispose d'une liste unique d'informations documentées.
2. Dans la première phase, cette liste ne contient que des informations appartenant au projet.
3. À terme, la même liste pourra également présenter des informations issues du référentiel organisationnel.
4. Toute association BPMN passe par une entrée de la liste du projet. Le BPMN ne référence jamais directement une information globale.
5. Une entrée de projet est le point d'ancrage de l'association BPMN, quel que soit le propriétaire de l'information sous-jacente.
6. L'origine de l'information (projet ou organisation) doit être explicite dans l'interface et filtrable.
7. Le nom de l'élément BPMN et le nom de l'information documentée sont deux valeurs distinctes. Aucune synchronisation automatique ne doit écraser l'une par l'autre.
8. Tant que l'association existe, la description de l'information documentée et la documentation de l'élément BPMN suivent la règle de synchronisation bidirectionnelle définie par le domaine. Les mises à jour doivent être idempotentes et éviter les boucles.
9. Les métadonnées documentaires (type, lien, emplacement, accès, durée de conservation, date de validité, données personnelles, personnes autorisées et restrictions) restent portées par l'information documentée, pas par le nom de l'élément BPMN.
10. Délier un élément BPMN ne supprime pas automatiquement l'information documentée. Après déliaison, les deux objets redeviennent indépendants.
11. Ne pas introduire de « statut projet » dans cette liste : ce champ n'a pas de rôle fonctionnel dans le modèle retenu.

## 2. Phase 1 — consolidation au niveau projet

### Périmètre

- Fiabiliser la création, l'affichage, la modification et la suppression des informations documentées locales.
- Fiabiliser l'association et la déliaison des objets de données et magasins de données BPMN.
- Conserver une seule liste et un seul composant de grille pour les informations documentées du projet.
- Conserver les capacités de recherche, tri et filtrage de la grille.
- Identifier clairement les associations BPMN et permettre de les gérer depuis la liste.
- Préserver les informations existantes et importer les métadonnées historiques BPMN lorsque cela est nécessaire.
- Retirer la colonne « Statut projet », qui ne constitue ni un statut documentaire ni une donnée de gouvernance utile.

### Modèle existant à préserver pendant la consolidation

Le code actuel repose sur deux tables projet :

- `project_documented_sources` : information documentée locale, rattachée à un `projectId`, avec ses métadonnées.
- `project_documented_source_references` : association entre une information documentée et un élément BPMN, avec le `projectId`, le `sourceId`, le `resourceId`, l'`elementId`, l'`elementName` et l'`elementType`.

Les références BPMN sont uniques par triplet projet / processus / élément. Les routes existantes sont sous `/projects/:projectId/documented-sources`.

Dans ce modèle actuel, l'enregistrement `project_documented_sources` porte à la fois les données de l'information et son appartenance au projet. La notion distincte d'« entrée du catalogue projet » n'est donc pas encore un objet de persistance séparé. Cette séparation est un objectif de conception pour permettre le partage organisationnel futur ; elle ne doit pas être supposée déjà présente.

### Règles d'association BPMN

- Une information documentée peut exister sans association BPMN.
- Un élément BPMN ne peut être associé qu'à une seule information documentée dans un même projet.
- Une information documentée peut être associée à plusieurs éléments BPMN.
- L'association est enregistrée dans le contexte du projet et reste indépendante des autres projets.
- La déliaison supprime uniquement l'association ; elle ne supprime pas l'information documentée.
- Le nom de l'élément BPMN reste celui du diagramme ; le nom de l'information documentée reste celui de la fiche documentaire.
- La synchronisation bidirectionnelle de la description ne doit pas propager les champs documentaires spécifiques (emplacement, accès, conservation, autorisations, restrictions, etc.).

### Liste et interface

La grille actuelle de type AG Grid reste la présentation de référence. La phase 1 ne doit pas créer une deuxième liste ni un deuxième mécanisme d'association. Les colonnes documentaires et la gestion des objets BPMN restent disponibles, avec recherche, tri et filtres. La colonne « Statut projet » est à retirer.

## 3. Phase 2 — référentiel organisationnel

Cette phase est volontairement différée. Elle ne doit être engagée qu'après stabilisation de la phase 1.

### Modèle cible

La liste du projet devient une vue unifiée composée de :

- **Entrées locales** : une information documentée appartenant au projet.
- **Entrées référencées** : une information documentée appartenant au référentiel organisationnel, rendue disponible dans le projet par une référence.

Le modèle cible distingue explicitement :

- **Information documentée** : le contenu et les métadonnées de l'information, avec un propriétaire (projet ou organisation).
- **Entrée du catalogue projet** : l'accès à cette information dans un projet donné ; c'est le point d'ancrage des associations BPMN.
- **Référence BPMN** : l'association entre l'entrée du catalogue projet et un élément d'un processus lié à ce projet.

Pour une information locale, l'entrée du catalogue pointe vers une information détenue par le projet. Pour une information globale, elle pointe vers l'information détenue par l'organisation. Plusieurs projets peuvent donc référencer la même information globale sans en dupliquer le contenu.

### Parcours utilisateur attendu

Dans la liste des informations documentées d'un projet, l'action « Ajouter » proposera :

1. Créer une nouvelle information documentée locale.
2. Sélectionner une information documentée disponible dans le référentiel organisationnel.

La grille reste unique. Une colonne « Origine » distingue « Projet » et « Organisation » et permet de filtrer les lignes. Les utilisateurs retrouvent les mêmes actions d'association BPMN quel que soit le type d'entrée.

### Association BPMN avec une information globale

Le processus est identique pour les deux origines :

1. L'utilisateur sélectionne un élément BPMN dans un processus du projet.
2. Il choisit une entrée de la liste du projet.
3. La référence BPMN est enregistrée vers cette entrée du projet.
4. L'entrée résout ensuite l'information locale ou globale correspondante.

Le diagramme BPMN n'a pas à connaître le type de propriétaire de l'information. Les contrôleurs, composants et règles d'association BPMN restent ainsi unifiés.

### Cycle de vie et droits

- Modifier une information locale relève des droits du projet.
- Modifier une information globale relève des droits d'administration organisationnelle.
- Un utilisateur de projet peut utiliser une information globale sans pouvoir modifier sa définition centrale.
- Retirer une entrée globale d'un projet ne supprime ni l'information globale ni ses usages dans les autres projets.
- Les associations BPMN du projet retiré doivent être supprimées ou réaffectées selon une confirmation explicite.
- Une copie locale est une nouvelle information indépendante ; elle ne reste pas synchronisée avec l'information globale.
- Une information globale utilisée par des projets ne doit pas être supprimée silencieusement. Son retrait doit être contrôlé et signaler ses usages.

Les modifications d'une information globale (par exemple son chemin réseau, son URL applicative ou sa description) sont visibles par tous les projets qui référencent cette même information. Il s'agit d'une donnée partagée unique, pas d'une propagation de copies.

## 4. Consolidation et fusion : périmètre distinct

Ne pas confondre les opérations suivantes :

- **Ajouter une référence globale à un projet** : rendre une information organisationnelle disponible dans le projet.
- **Copier localement** : créer une information indépendante à partir d'une information existante.
- **Réaffecter une association BPMN** : changer l'entrée du catalogue projet utilisée par un élément BPMN.
- **Fusionner des doublons** : opération exceptionnelle qui consolide plusieurs informations réellement identiques.

La première phase peut traiter les doublons strictement à l'intérieur d'un projet, avec validation et conservation des associations. La fusion interprojet est différée à la phase organisationnelle : elle nécessite un propriétaire canonique commun, des règles de droits, une analyse des usages et une traçabilité. Deux informations ayant le même nom ne sont pas nécessairement des doublons.

## 5. Décisions à ne pas remettre en cause sans nouvelle validation

- Une liste unifiée par projet, pas une liste locale et une liste globale séparées.
- Une entrée de catalogue projet comme point de passage obligatoire de toute association BPMN.
- Aucun lien BPMN direct vers un objet du référentiel organisationnel.
- Le nom BPMN et le nom documentaire restent indépendants.
- La description est synchronisée dans les deux sens uniquement pendant que l'association existe.
- Les métadonnées documentaires restent distinctes des propriétés de l'élément BPMN.
- La déliaison ne détruit pas l'information documentée.
- Pas de champ « Statut projet ».
- La phase organisationnelle et la fusion interprojet restent hors du périmètre de la première phase.

## 6. Critères de validation de la phase 1

- Les informations documentées déjà enregistrées sont visibles dans la liste du projet.
- La création, la modification et la suppression contrôlée fonctionnent.
- L'association à un élément BPMN existant fonctionne, y compris lorsque l'information est créée avant ou après le processus.
- Une association existante est correctement affichée et peut être déliée.
- Un élément BPMN ne peut pas être associé deux fois dans le même projet.
- Le nom BPMN ne remplace jamais le nom documentaire et réciproquement.
- La synchronisation de description ne génère pas de boucle ni de mises à jour répétées.
- La déliaison laisse l'information documentaire disponible et indépendante.
- Les filtres, tris et recherches de la grille restent opérationnels.
- Aucune colonne « Statut projet » n'est présentée.
- Les données historiques restent accessibles après migration.
