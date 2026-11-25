# V0.10 — Refonte UX de l'administration et des fonctions organisationnelles

**Statut :** cadrage UX et préparation de l'implémentation.
**Branche de référence du chantier :** `planning/admin-ux-v0.10`.
**Socle de stabilisation :** V0.8 stabilisée. La V0.10 reprend les acquis backend et les écrans déjà développés ; elle ne relance pas leur conception métier.

## 1. Décision de cadrage

La V0.10 porte prioritairement sur l'expérience utilisateur (UX/UI) des fonctions d'administration, d'organisation permanente et d'organisation projet.

Le backend est déjà substantiellement développé sur cette branche :
- module Organization : postes permanents, affectations datées, intérims, hiérarchie, historique, endpoints de consultation et de gestion ;
- module JobArchitecture : fiches de fonction structurées, missions, sections d'activités, compétences, postes projet, mappings vers acteurs RACI et activités BPMN, diagnostics de cohérence ;
- raccordement optionnel d'un rôle projet à un poste permanent ;
- endpoints dédiés et contrôles d'accès existants ;
- premières interfaces : organigramme, gestion des postes, fiches de fonction et postes projet.

**Conséquence :** ne pas engager de refonte backend par défaut. Toute évolution API, modèle ou migration devra être justifiée par un blocage UX démontré, un défaut fonctionnel constaté ou un besoin métier validé. Préférer l'adaptation des écrans et l'orchestration des API existantes.

## 2. Principes UX

1. Organiser les écrans selon les tâches de l'utilisateur et non selon les noms des modules techniques.
2. Distinguer visuellement et fonctionnellement l'administration générale de l'administration d'un projet.
3. Rendre le contexte courant évident à tout moment : organisation globale ou projet sélectionné.
4. Conserver une seule source de vérité par objet métier ; les vues transverses sont des projections.
5. Éviter les écrans CRUD isolés qui obligent l'administrateur à comprendre l'architecture interne.
6. Préférer des parcours guidés : liste → détail → modification → confirmation → retour à la liste.
7. Montrer les relations utiles dans le contexte : poste ↔ titulaire ↔ fiche de poste ; rôle projet ↔ poste permanent éventuel ↔ membres affectés ↔ RACI ↔ activités BPMN.
8. Expliquer les états et anomalies en langage métier : poste vacant, intérim en cours, rôle non affecté, acteur RACI non associé, mapping d'activité obsolète.
9. Préserver les droits actuels côté API ; masquer ou désactiver les actions dans l'interface ne remplace jamais le contrôle backend.
10. Préserver les routes profondes existantes ou fournir des redirections explicites.

## 3. Architecture UX cible

### 3.1 Administration générale

Un espace unique, accessible depuis la navigation principale, avec un accueil qui donne accès à quatre domaines :

- **Utilisateurs et accès** : comptes, statut, accès globaux et accès aux projets.
- **Organisation** : organigramme, postes permanents, affectations et intérims.
- **Fiches de poste** : référentiel des fiches, missions, activités habituelles et compétences.
- **Portefeuille de projets** : projets, responsables, membres et accès.

Les processus communs et la gouvernance transverse restent accessibles selon leurs fonctions existantes ; ils ne doivent pas être mélangés à l'administration des personnes.

### 3.2 Administration d'un projet

Dans le contexte d'un projet sélectionné, proposer une navigation cohérente :

- **Vue d'ensemble** : informations essentielles et alertes utiles.
- **Membres et accès** : personnes autorisées et droits projet.
- **Organisation du projet** : rôles/postes projet, rattachement éventuel à un poste permanent et affectations nominatives.
- **Acteurs et RACI** : acteurs du projet et responsabilités sur les activités.
- **Processus** : processus, activités, ressources documentées et variantes.

Un rôle projet reste distinct d'un rôle d'accès applicatif. Un poste permanent peut servir de référence à un rôle projet, mais le rôle projet peut aussi être spécifique.

## 4. Parcours UX prioritaires

### Parcours A — Administrer l'organisation permanente

1. Ouvrir Administration > Organisation.
2. Consulter l'organigramme avec recherche, filtres et indicateurs de vacance/intérim.
3. Sélectionner un poste pour ouvrir son panneau de détail.
4. Consulter sa fiche, son rattachement hiérarchique et l'historique des titulaires.
5. Créer/modifier un poste ou gérer une affectation depuis ce contexte.
6. Revenir à l'organigramme sans perdre le contexte de recherche.

Écrans à concevoir :
- vue organigramme ;
- liste tabulaire des postes avec filtres ;
- panneau ou page détail d'un poste ;
- formulaire de création/édition ;
- dialogue d'affectation et d'intérim avec dates explicites.

### Parcours B — Administrer les fiches de poste

1. Accéder au référentiel des fiches.
2. Rechercher une fiche par code, intitulé ou mission.
3. Ouvrir une fiche structurée avec sections clairement identifiées.
4. Modifier les informations, missions, sections d'activités et compétences.
5. Prévisualiser la fiche dans sa présentation finale.
6. Identifier clairement les champs incomplets et les informations de validation documentaire.

La V0.10 doit améliorer la lisibilité de l'éditeur existant ; le workflow de validation/publication et les exports Word/PDF restent hors périmètre sauf décision dédiée.

### Parcours C — Construire l'organisation d'un projet

1. Sélectionner un projet ; son nom reste visible.
2. Consulter les rôles projet existants.
3. Créer ou modifier un rôle projet.
4. Choisir éventuellement un poste permanent de référence.
5. Définir les compétences applicables et les activités concernées.
6. Associer les acteurs RACI existants.
7. Affecter explicitement les membres du projet.
8. Consulter les diagnostics de cohérence et traiter les éléments incomplets.

Le parcours doit distinguer clairement :
- rôle projet ;
- poste permanent de référence ;
- membre du projet ;
- acteur RACI ;
- responsabilité RACI ;
- activité BPMN.

### Parcours D — Comprendre les responsabilités d'une personne

Depuis l'espace personnel, présenter :
- poste permanent et période d'affectation ;
- éventuel intérim ;
- rôles projet explicitement attribués ;
- responsabilités RACI explicites ;
- liens vers les projets, processus et activités concernés.

Ne pas déduire une responsabilité RACI du seul poste permanent ou d'une fiche de poste.

## 5. Audit UX initial — constats sur les écrans existants

Les premiers écrans existent déjà sur la branche V0.10. Ils constituent une base à améliorer, pas des maquettes à remplacer systématiquement.

| Écran / composant existant | Constat initial | Travail UX à mener |
|---|---|---|
| `OrganizationAdminLayout` | Navigation latérale globale avec plusieurs rubriques ; les notions Organisation, Postes et Fiches de fonction sont juxtaposées. | Regrouper les rubriques sous des domaines cohérents ; clarifier le contexte global/projet ; réduire les entrées concurrentes. |
| `OrganizationStructure` | Organigramme interactif et détail sélectionné déjà présents. | Améliorer recherche, lisibilité, navigation dans les niveaux, vacance/intérim, détail et actions contextuelles. |
| `OrganizationPositions` | Gestion des postes avec grille, sélection multiple et actions d'affectation. | Clarifier les actions de masse, filtres, statuts, historique et formulaire de gestion d'une affectation. |
| `JobFunctions` | Éditeur de fiche structuré avec mission, sections et compétences. | Repenser la hiérarchie visuelle, la navigation dans une fiche longue, l'édition inline/assistée et la prévisualisation. |
| `ProjectJobPositions` | Écran riche : rôles projet, compétences, RACI, activités et diagnostics. | Réduire la densité ; séparer configuration du rôle, affectations, mappings et diagnostics en étapes ou onglets compréhensibles. |
| Routes `/organization/*` | Routes globales et routes dédiées coexistent ; certaines rubriques ont des points d'entrée distincts. | Définir une arborescence canonique, gérer les alias et tester les liens profonds. |

Cet audit est une première lecture du code. Il ne remplace pas une recette visuelle en situation réelle ni des tests avec utilisateurs.

## 6. Livrables UX et ordre de réalisation

### UX-0 — Inventaire et cartographie

- inventorier toutes les routes, pages, composants, actions et permissions ;
- associer chaque fonctionnalité existante à une destination UX cible ;
- relever les doublons de navigation, incohérences de libellés et écrans trop denses ;
- cartographier les appels API utilisés par chaque parcours ;
- identifier les états vides, erreurs, chargements et cas sans permission.

**Livrable :** matrice routes/fonctions/API/droits et backlog UX priorisé.

### UX-1 — Architecture de navigation

- définir les entrées Administration générale et Administration projet ;
- définir les menus et sous-menus ;
- rendre le contexte courant persistant ;
- définir les breadcrumbs et liens de retour ;
- préserver les routes utiles et prévoir les redirections.

**Livrable :** arborescence cible et maquette filaire de navigation.

### UX-2 — Organisation permanente

- organigramme et liste synchronisés ;
- recherche et filtres ;
- panneau détail de poste ;
- historique et intérims lisibles ;
- création, modification et affectation contextualisées.

**Livrable :** parcours complet organisation permanente.

### UX-3 — Fiches de poste

- liste/recherche des fiches ;
- présentation détaillée et édition structurée ;
- sections d'activités et compétences plus faciles à parcourir ;
- prévisualisation et états de complétude.

**Livrable :** parcours complet de gestion d'une fiche.

### UX-4 — Organisation projet et RACI

- vue d'ensemble des rôles projet ;
- assistant ou formulaire en étapes pour créer/configurer un rôle ;
- rattachement facultatif à un poste permanent ;
- affectations nominatives explicites ;
- onglets ou panneaux distincts pour compétences, RACI, activités et diagnostics ;
- accès direct aux activités BPMN et aux éléments à corriger.

**Livrable :** parcours complet d'administration d'un rôle projet.

### UX-5 — Espace personnel

- synthèse claire des affectations et responsabilités ;
- séparation des responsabilités explicites et informations de rattachement ;
- filtres par projet et liens de navigation.

**Livrable :** parcours de consultation personnelle.

### UX-6 — Harmonisation et qualité

- composants visuels cohérents ;
- accessibilité clavier et contrastes ;
- responsive ;
- états de chargement, erreur, vide et accès refusé ;
- tests de régression des parcours et routes.

## 7. Contraintes techniques

- Réutiliser les endpoints existants de Organization et JobArchitecture.
- Ne pas recréer d'API si les endpoints existants suffisent.
- Ne pas introduire de nouvelles tables pour résoudre un problème de présentation.
- Toute évolution de contrat API doit être documentée et justifiée par un cas d'usage UX.
- Les autorisations restent vérifiées côté backend.
- Les écrans transverses consomment les données des modules propriétaires ; pas de duplication des référentiels.
- Les identifiants de mappings RACI/BPMN doivent rester stables.
- Conserver la notion métier unique **Activité** ; les libellés historiques ou noms techniques BPMN ne doivent pas réintroduire une entité métier « Tâche ».

## 8. Critères d'acceptation V0.10

La refonte UX est recevable lorsque :
- l'utilisateur comprend immédiatement s'il administre l'organisation globale ou un projet ;
- chaque fonction existante a une place unique et identifiable ;
- les parcours A à E peuvent être exécutés sans connaître les noms des modules techniques ;
- l'organisation permanente, les rôles projet et les accès restent distincts ;
- l'utilisateur peut comprendre les affectations, intérims et responsabilités sans ambiguïté ;
- les diagnostics RACI/BPMN sont compréhensibles et actionnables ;
- aucune fonctionnalité existante n'est perdue ;
- les routes profondes et permissions sont testées ;
- aucune migration ou modification backend non nécessaire n'est introduite ;
- les tests frontend et les tests de non-régression sont verts.

## 9. Hors périmètre

- Refonte du modèle organisationnel ou du moteur RACI.
- Réécriture des API et migrations déjà opérationnelles.
- Gestion RH complète, paie ou données RH sensibles.
- Workflow complet d'approbation/publication des fiches et exports documentaires.
- Refonte du Viewer/Modeler BPMN.
- Déploiement sans validation explicite.

## 10. Prochaine action

Commencer par UX-0 : établir la cartographie complète des routes, composants, permissions et API sur cette branche. Puis produire les maquettes filaires de navigation et des cinq écrans principaux avant de modifier les composants.

Ne pas créer une nouvelle branche de développement avant d'avoir confirmé la base V0.8 stabilisée à utiliser pour l'implémentation V0.10. La branche `planning/admin-ux-v0.10` reste le support du cadrage et des travaux UX préparatoires.
