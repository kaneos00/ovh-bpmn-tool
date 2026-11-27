# Administration des postes — maquette fonctionnelle niveau 1

**Branche de cadrage :** planning/admin-ux-v0.10  
**Périmètre :** administration du référentiel commun (niveau 1).  
**Statut :** spécification fonctionnelle d'interface à valider avant réalisation.

## 1. Navigation

Fil d'Ariane :

`Administration / Référentiel commun / Postes / [Intitulé du poste]`

Trois rubriques principales :

1. **Postes** : grille/liste des postes, recherche, filtres, création et accès à la fiche.
2. **Compétences** : référentiel commun des compétences, avec recherche, filtres et gestion du cycle de vie.
3. **Administration d'un poste** : formulaire unique et condensé regroupant les informations générales, jusqu'à quatre responsabilités/blocs de missions et les compétences transversales.

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

## 3. Référentiel commun des compétences

Cette rubrique est indépendante de l'administration des postes. Elle permet de maintenir une liste commune, réutilisable dans toutes les fiches de poste.

### 3.1 Liste des compétences

Présenter une grille avec au minimum :

| Colonne | Contenu |
|---|---|
| Compétence | Intitulé |
| Famille | Méthodologique / Technique / Fonctionnelle / Savoir-être |
| Description | Définition courte |
| Utilisations | Nombre d'associations à des blocs et à des postes |
| Statut | Active / Inactive |
| Actions | Consulter / Modifier / Désactiver |

Fonctions : recherche par intitulé ou description, filtres par famille et statut, tri, création et ouverture d'une compétence. La liste doit permettre de repérer les compétences déjà utilisées.

### 3.2 Création et modification

Une compétence comporte obligatoirement :
- un intitulé clair, formulé comme une capacité maîtrisable ;
- une description courte précisant ce que recouvre la compétence ;
- une et une seule famille : **Méthodologique**, **Technique**, **Fonctionnelle** ou **Savoir-être** ;
- un statut actif/inactif.

Aucune étiquette secondaire ni famille multiple. La famille est déterminée par la nature principale de la capacité. Si une formulation recouvre réellement deux natures différentes, la compétence doit être reformulée ou décomposée en compétences distinctes.

Avant création, rechercher les doublons potentiels à partir de l'intitulé et de la description. Avertir l'utilisateur des compétences proches et lui permettre de consulter celles-ci avant de confirmer la création. Ne pas fusionner automatiquement des compétences.

La modification de l'intitulé, de la description ou de la famille ne doit pas créer une nouvelle compétence ni casser ses associations existantes. La modification de famille doit être explicite et visible dans l'historique si l'application dispose d'une traçabilité des changements.

### 3.3 Désactivation et suppression

- Une compétence non utilisée peut être supprimée si aucune donnée ne la référence.
- Une compétence déjà associée à un bloc ou à un poste ne doit pas être supprimée physiquement : elle peut être désactivée.
- Une compétence inactive reste visible dans les associations historiques et les fiches existantes ; elle n'est plus proposée par défaut pour de nouvelles associations.
- Une action de réactivation permet de la rendre à nouveau disponible.
- La désactivation ne retire pas automatiquement la compétence des fiches de poste qui l'utilisent.

### 3.4 Utilisation depuis une fiche de poste

Depuis l'administration d'un poste, l'utilisateur recherche et sélectionne une compétence active existante. Il peut aussi lancer une création rapide, qui applique les mêmes contrôles anti-doublons et crée une entrée dans le référentiel commun. Une compétence ainsi créée devient réutilisable dans les autres postes.

## 4. Page d'administration d'un poste

### 4.1 En-tête et informations générales

Afficher le fil d'Ariane, le code et l'intitulé du poste, le statut et les actions principales.

Champs :
- code court du poste (ex. `CDP`), unique et stable ;
- intitulé (ex. Chef de projet) ;
- fonction de rattachement ;
- finalité du poste (texte court).

### 4.2 Responsabilités / blocs de missions (maximum quatre)

La page affiche quatre sections, toujours dans le même écran. Chaque section comprend :

- code calculé et stable : `[CODE_POSTE]-1` à `[CODE_POSTE]-4` ;
- intitulé du bloc ;
- description courte ;
- liste de 1 à 4 activités ;
- liste de 1 à 4 compétences associées.

Les blocs effectivement définis (un à quatre au maximum) sont présentés sous forme de cartes compactes, éventuellement repliables, sans créer de blocs vides pour atteindre quatre.

### 4.3 Activités

Chaque activité est une ligne éditable directement dans le bloc :
- libellé ;
- description courte facultative ;
- ajout/suppression dans la limite de 1 à 4 activités par bloc.

Les activités décrivent les contributions habituelles du poste. Elles ne sont pas un catalogue de tâches opérationnelles. Les tâches exécutables demeurent dans les processus BPMN ; leur éventuel rattachement aux blocs sera traité dans une phase ultérieure.

### 4.4 Compétences associées aux blocs

Le bouton « Ajouter une compétence » ouvre une sélection dans le référentiel commun, avec recherche et filtre par famille.

Depuis la même interface, l'utilisateur peut créer une nouvelle compétence si elle n'existe pas. Avant création, rechercher les doublons potentiels sur le libellé et la famille.

Une compétence est un objet partagé :
- elle peut être associée à plusieurs blocs d'un même poste ;
- elle peut être associée à plusieurs postes ;
- elle n'est pas dupliquée lors de son ajout à un autre bloc ;
- retirer une association ne supprime pas la compétence du référentiel ;
- une compétence utilisée est désactivée plutôt que supprimée physiquement.

Chaque association compétence ↔ bloc porte son propre niveau attendu. Le niveau ne doit donc pas être stocké uniquement sur la définition globale de la compétence.

### 4.5 Échelle et slider de compétence

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

### 4.6 Compétences transversales du poste

En fin de page, prévoir une section distincte « Compétences transversales du poste ». Elle regroupe les compétences nécessaires à l'ensemble du poste, indépendamment d'un bloc de missions (par exemple écoute, coopération ou adaptabilité).

Ces compétences sont sélectionnées dans le même référentiel commun que les compétences des blocs. Elles ne constituent pas un cinquième bloc de missions. Une compétence transversale peut également être associée à un bloc si elle y est particulièrement attendue ; les deux associations restent distinctes et peuvent porter des niveaux attendus différents.

Chaque association directe poste ↔ compétence porte son propre niveau attendu, selon la même échelle de 1 à 5.

### 4.7 Actions et sauvegarde

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
3. jusqu'à quatre responsabilités/blocs avec leurs activités ;
4. compétences associées et niveaux attendus ;
5. autonomie, limites et interfaces si ces informations sont renseignées.

La fiche est générée depuis le référentiel ; toute modification s'effectue dans l'administration du poste.

## 5. Règles de données à respecter

- Les codes des blocs sont stables et ne changent pas lorsque leur intitulé est modifié.
- Une compétence est globale et réutilisable ; elle appartient à une seule famille parmi Méthodologique, Technique, Fonctionnelle et Savoir-être, sans étiquette secondaire.
- Une compétence peut être associée à un bloc ou directement au poste comme compétence transversale. Chaque association porte son propre niveau attendu.
- Les responsabilités/blocs sont rattachés au modèle de fiche qui sera arbitré ; les compétences peuvent être partagées entre blocs et postes.
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
- vérifier comment gérer les compétences directement transversales au poste et le niveau attendu de cette association ;
- vérifier les possibilités de désactivation et les références historiques des compétences ;
- clarifier le lien entre `OrganizationPosition` et la fiche de poste ;
- ne créer une migration que pour un manque confirmé par l'inspection du code, des contraintes SQL et des tests.

Cette maquette ne constitue pas une affirmation que ces parcours sont déjà implémentés.


## Addendum de cohérence fonctionnelle — décisions du 27 novembre 2026

Les décisions consolidées dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md#10-décisions-de-cadrage-consolidées--27-novembre-2026) prévalent sur toute formulation antérieure de ce document qui leur serait contraire :

- un poste comporte **au maximum quatre responsabilités** (ou blocs de missions), sans obligation d'en remplir quatre ; chaque responsabilité comporte **au maximum quatre activités** ;
- le référentiel d'activités organisationnelles est unique et les activités sont reliées explicitement aux éléments BPMN ; une même activité de référence peut être utilisée par plusieurs éléments BPMN dans plusieurs processus ;
- la responsabilité organisationnelle est portée par le poste et reste distincte des rôles opérationnels RACI ; aucune entrée RACI n'est déduite automatiquement de la fiche de poste ;
- la structure permanente retenue pour le cadrage est **Directions → Postes → Titulaires** ; les services/unités intermédiaires ne sont pas requis à ce stade ;
- le titulaire structurel n'est pas nécessairement l'unique personne qui réalise le travail : une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes. Les affectations opérationnelles doivent être distinguées de la titularisation ;
- le lien entre fonction-type, poste et fiche de poste reste **non arbitré**. Aucune hypothèse de partage, d'héritage ou de personnalisation ne doit être présentée comme une décision acquise.

Les passages ci-dessus constituent un cadrage fonctionnel et ne décrivent pas des capacités techniques déjà livrées. Aucun audit technique V0.10, aucune modification de code et aucune migration ne sont inclus dans cette harmonisation documentaire.
