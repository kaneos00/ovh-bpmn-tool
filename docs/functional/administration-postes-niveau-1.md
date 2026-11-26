# Administration des postes — maquette fonctionnelle niveau 1

**Branche de cadrage :** planning/admin-ux-v0.10  
**Périmètre :** administration du référentiel commun (niveau 1).  
**Statut :** spécification fonctionnelle d'interface à valider avant réalisation.

## 1. Navigation

Fil d'Ariane :

`Administration / Référentiel commun / Postes / [Intitulé du poste]`

Deux écrans principaux :

1. **Accueil de la section Postes** : grille/liste des postes, recherche, filtres, création et accès à la fiche.
2. **Administration d'un poste** : formulaire unique et condensé regroupant les informations générales et les quatre blocs de missions.

La fiche de poste consultable est une vue de synthèse accessible depuis la page d'administration. Elle n'est pas un second formulaire de saisie.

## 2. Accueil — liste des postes

La page d'accueil présente une grille de données avec au minimum :

| Colonne | Contenu |
|---|---|
| Code | Code court stable du poste |
| Poste | Intitulé |
| Fonction | Fonction de rattachement |
| Blocs | Nombre de blocs configurés (4 attendus) |
| Compétences | Nombre de compétences distinctes mobilisées |
| Statut | Brouillon / Actif / Inactif |
| Actions | Ouvrir / Consulter la fiche |

Comportements :
- recherche par code, intitulé ou fonction ;
- filtres par fonction et statut ;
- ouverture de l'administration par sélection de ligne ;
- action de consultation de la fiche de poste ;
- création d'un poste avec définition de son code court.

## 3. Page d'administration d'un poste

### 3.1 En-tête et informations générales

Afficher le fil d'Ariane, le code et l'intitulé du poste, le statut et les actions principales.

Champs :
- code court du poste (ex. `CDP`), unique et stable ;
- intitulé (ex. Chef de projet) ;
- fonction de rattachement ;
- finalité du poste (texte court).

### 3.2 Quatre blocs de missions

La page affiche quatre sections, toujours dans le même écran. Chaque section comprend :

- code calculé et stable : `[CODE_POSTE]-1` à `[CODE_POSTE]-4` ;
- intitulé du bloc ;
- description courte ;
- liste de 1 à 4 activités ;
- liste de 1 à 4 compétences associées.

Les quatre blocs sont les emplacements de référence du poste. Ils peuvent être présentés sous forme de cartes compactes, éventuellement repliables, sans navigation vers une page séparée.

### 3.3 Activités

Chaque activité est une ligne éditable directement dans le bloc :
- libellé ;
- description courte facultative ;
- ajout/suppression dans la limite de 1 à 4 activités par bloc.

Les activités décrivent les contributions habituelles du poste. Elles ne sont pas un catalogue de tâches opérationnelles. Les tâches exécutables demeurent dans les processus BPMN ; leur éventuel rattachement aux blocs sera traité dans une phase ultérieure.

### 3.4 Compétences réutilisables

Le bouton « Ajouter une compétence » ouvre une sélection dans le référentiel commun, avec recherche et filtre par famille.

Depuis la même interface, l'utilisateur peut créer une nouvelle compétence si elle n'existe pas. Avant création, rechercher les doublons potentiels sur le libellé et la famille.

Une compétence est un objet partagé :
- elle peut être associée à plusieurs blocs d'un même poste ;
- elle peut être associée à plusieurs postes ;
- elle n'est pas dupliquée lors de son ajout à un autre bloc ;
- retirer une association ne supprime pas la compétence du référentiel ;
- une compétence utilisée est désactivée plutôt que supprimée physiquement.

Chaque association compétence ↔ bloc porte son propre niveau attendu. Le niveau ne doit donc pas être stocké uniquement sur la définition globale de la compétence.

### 3.5 Échelle et slider de compétence

Chaque compétence affiche un slider cranté à cinq positions, avec valeur numérique et libellé visibles :

| Niveau | Libellé | Signification |
|---:|---|---|
| 1 | Notions | Connaît les principes de base ; accompagnement régulier nécessaire. |
| 2 | Élémentaire | Réalise des tâches simples avec consignes et contrôle. |
| 3 | Opérationnel | Réalise les activités courantes de manière autonome. |
| 4 | Avancé | Maîtrise les situations complexes et peut accompagner les autres. |
| 5 | Expert | Maîtrise approfondie ; définit les pratiques et fait référence. |

Le slider :
- ne permet que les cinq valeurs entières ;
- affiche en permanence le chiffre et le libellé sélectionné ;
- présente une aide contextuelle courte ;
- est indépendant pour chaque association compétence ↔ bloc.

### 3.6 Actions et sauvegarde

- Ajout et modification des blocs, activités et associations de compétences directement sur la page.
- Pas de navigation obligatoire pour créer une activité ou associer une compétence.
- Enregistrement global des modifications du poste.
- Les limites de cardinalité sont contrôlées à l'ajout et à l'enregistrement.
- Une erreur de validation indique le bloc et la ligne concernés sans perdre les autres modifications.
- La fiche de poste consultable est accessible depuis l'en-tête ou le pied de page.

## 4. Fiche de poste consultable

Vue compacte, en lecture seule et imprimable, idéalement sur une à deux pages :

1. intitulé, code et fonction ;
2. finalité ;
3. quatre blocs avec leurs activités ;
4. compétences associées et niveaux attendus ;
5. autonomie, limites et interfaces si ces informations sont renseignées.

La fiche est générée depuis le référentiel ; toute modification s'effectue dans l'administration du poste.

## 5. Règles de données à respecter

- Les codes des blocs sont stables et ne changent pas lorsque leur intitulé est modifié.
- Une compétence est globale et réutilisable ; son niveau attendu est contextuel à son association au bloc.
- Les quatre blocs appartiennent au poste ; les compétences sont partagées entre blocs et postes.
- Les activités du référentiel de poste restent descriptives ; ne pas créer un deuxième catalogue de tâches BPMN.
- Une évolution du référentiel commun doit rester identifiable et ne pas écraser silencieusement les adaptations propres à un projet.
- Le niveau 3 réutilisera les postes, blocs et compétences du niveau 1. Les adaptations projet seront portées par le contexte projet, sans modifier la référence commune.

## 6. Hors périmètre de cette tranche

- Affectations nominatives et organigramme général (niveau 2).
- Organisation graphique de projet, affectations et missions projet (niveau 3).
- Mapping des Lanes et tâches BPMN vers les blocs.
- Calcul automatique du RACI depuis les postes ou compétences.
- Évaluation RH complète des personnes.

## 7. Points à vérifier avant implémentation

L'audit V0.10 a identifié des objets existants `JobFunction`, sections d'activités, `Competency`, `CompetencyBlock` et `JobFunctionCompetencyBlock`. Avant de modifier le modèle :
- vérifier comment les quatre blocs peuvent réutiliser les objets existants ;
- confirmer où le niveau attendu est actuellement stocké ;
- vérifier si une compétence peut déjà être associée à plusieurs blocs/fonctions sans duplication ;
- clarifier le lien entre `OrganizationPosition` et la fiche de poste ;
- ne créer une migration que pour un manque confirmé par l'inspection du code, des contraintes SQL et des tests.

Cette maquette ne constitue pas une affirmation que ces parcours sont déjà implémentés.
