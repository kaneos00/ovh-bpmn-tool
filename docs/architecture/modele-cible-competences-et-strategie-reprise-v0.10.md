# Décision d’architecture — modèle cible global des compétences V0.10

**Branche :** `planning/admin-ux-v0.10`  
**Statut :** modèle cible retenu ; migration destructive limitée à la base de test à préparer.  
**Périmètre :** catalogue global des compétences, blocs de missions des fiches de poste et usages projet.

## 1. Décisions structurantes

La base utilisée pour ce chantier est une base de test. Il n'est pas nécessaire de préserver les compétences historiques, leurs identifiants ou leurs associations de test. Le nouveau modèle peut donc remplacer l'ancien directement, sans table de correspondance ni double écriture.

Deux notions doivent rester distinctes :

- Les `CompetencyBlock` existants sont des conteneurs utilisés par les postes projet, les exigences de compétences et les mappings d'activités.
- Les blocs de missions, dans la limite de quatre par poste, décrivent les contributions habituelles du poste.

Ces deux objets ne doivent pas être fusionnés. Les blocs de compétences projet restent disponibles tant que leurs usages projet/BPMN en ont besoin ; les blocs de missions ont leurs propres tables.

## 2. Catalogue global

La compétence est une entité de référentiel commune, indépendante des blocs.

Champs :
- identifiant UUID ;
- code unique global ;
- intitulé ;
- description courte ;
- famille obligatoire et exclusive ;
- statut actif/inactif.

Quatre familles :
- `methodological` — Méthodologique ;
- `technical` — Technique ;
- `functional` — Fonctionnelle ;
- `behavioral` — Savoir-être.

Aucune étiquette secondaire, famille multiple ou niveau de référence global.

Le niveau attendu est porté par l'association compétence ↔ bloc de mission, compétence ↔ poste transversal ou compétence ↔ exigence de poste projet.

## 3. Associations

### 3.1 Catalogue ↔ blocs de compétences projet

Une table de liaison explicite relie les compétences globales aux `competency_blocks`. Une compétence peut appartenir à plusieurs blocs projet. Cette association remplace `competencies.blockId`.

Les blocs projet existants ne sont pas transformés en blocs de missions. Les liens fonction ↔ blocs projet, les blocs de postes projet et les mappings BPMN qui les référencent sont conservés.

### 3.2 Exigences des postes projet

Les exigences projet référencent la compétence globale et le bloc projet par l'association explicite. Le niveau `requiredLevel` reste propre à chaque exigence.

Comme il s'agit d'une base de test, les lignes actuelles de `position_competency_requirements` peuvent être supprimées et recréées après la mise en place du nouveau modèle. Les postes projet, blocs projet et mappings BPMN ne sont pas supprimés par défaut.

### 3.3 Fiche de poste — blocs de missions

Tables dédiées :
- `job_position_mission_blocks` ;
- `job_position_mission_activities` ;
- `job_position_mission_competencies` ;
- `job_position_transversal_competencies`.

Chaque fiche peut comporter jusqu'à quatre blocs de missions (maximum quatre, sans obligation de remplir les quatre). Chaque bloc peut comporter jusqu'à quatre activités (maximum quatre, sans obligation d'en définir quatre) et les compétences associées selon les règles de ce document. Les compétences transversales sont associées directement à la fiche en fin de fiche, sans cinquième bloc.

Le rattachement canonique reste à préciser entre `JobFunction` (fonction/famille de référence existante) et une entité explicite de fiche de poste. L'objectif est qu'une fiche de référence puisse être partagée par plusieurs postes permanents, sans duplication inutile.

## 4. Traitement des données de test

La migration de remplacement est autorisée à :
- supprimer les anciennes lignes de `competencies` ;
- supprimer `referenceLevel` et `blockId` de l'ancien modèle ;
- supprimer les exigences de compétences projet existantes, qui seront reconfigurées ;
- conserver les associations fonction ↔ blocs de compétences : elles alimentent les blocs initiaux des postes projet.

Elle doit conserver par défaut :
- `competency_blocks` tant que le modèle projet en dépend ;
- `position_competency_blocks` ;
- `position_activity_mappings` et les identifiants de tâches BPMN qu'ils référencent ;
- les processus BPMN, versions publiées, Lanes, ressources et données RACI.

Les données de compétence de test ne sont pas reprises automatiquement. Le nouveau catalogue est créé vide ou alimenté par un jeu de référence validé séparément.

## 5. Règles de cycle de vie

- Une compétence utilisée est désactivée, pas supprimée physiquement.
- Une compétence inactive reste visible dans les associations existantes.
- Les sélecteurs proposent les compétences actives par défaut.
- Retirer une association ne supprime pas la compétence.
- Le niveau attendu appartient à l'association.
- Les quatre familles sont exclusives.
- Une modification de nom ou de famille ne modifie pas l'identité de la compétence.

## 6. Conditions de sécurité de migration

- La migration destructive doit être explicitement ciblée sur la base de test.
- Sauvegarde préalable obligatoire.
- Ajouter une garde empêchant l'exécution sur une base de production.
- Vérifier les FK, cascades et consommateurs applicatifs avant de supprimer une table ou colonne.
- Ne pas étendre la remise à zéro à des données projet/BPMN qui ne dépendent pas directement des anciennes compétences.

## 7. Critères d'acceptation

- Le catalogue global est indépendant des blocs.
- Une compétence peut être partagée entre plusieurs blocs projet et plusieurs fiches de poste.
- Les niveaux sont portés par les associations.
- Les quatre familles sont présentes et exclusives.
- Les blocs de missions sont distincts des blocs de compétences projet.
- Les exigences projet fonctionnent avec les nouvelles associations.
- Les mappings BPMN, tâches, processus et RACI restent intacts.
- La désactivation conserve les associations ; aucune suppression physique d'une compétence utilisée n'est exposée dans l'API.
- Aucun code historique ni table de correspondance n'est maintenu.

## 8. Limites

Le modèle est documenté sur la base de l'inspection statique du dépôt. La recherche exhaustive des consommateurs et l'exécution sur la base de test restent des étapes préalables à l'écriture et à l'exécution de la migration. Aucune donnée n'a été supprimée et aucune migration n'a encore été exécutée.


## 9. Précision issue de l'inspection des consommateurs

Le service backend utilise effectivement `job_function_competency_blocks` pour composer `listFunctions()` et pour initialiser les blocs d'un nouveau poste projet. Cette table n'est donc pas une simple ancienne association à supprimer. Elle reste dans le modèle projet.

Les exigences de niveau existent à deux granularités différentes :
- `position_competency_blocks.requiredLevel` : niveau global demandé pour le bloc ;
- `position_competency_requirements.requiredLevel` : niveau demandé pour une compétence précise.

La refonte du catalogue ne doit pas fusionner ces deux niveaux. Seules les exigences individuelles peuvent être remises à zéro dans la base de test ; les applicabilités et niveaux des blocs projet sont conservés.


## Addendum de cohérence fonctionnelle — décisions du 27 novembre 2026

Les décisions consolidées dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md#10-décisions-de-cadrage-consolidées--27-novembre-2026) prévalent sur toute formulation antérieure de ce document qui leur serait contraire :

- un poste comporte **au maximum quatre responsabilités** (ou blocs de missions), sans obligation d'en remplir quatre ; chaque responsabilité comporte **au maximum quatre activités** ;
- le référentiel d'activités organisationnelles est unique et les activités sont reliées explicitement aux éléments BPMN ; une même activité de référence peut être utilisée par plusieurs éléments BPMN dans plusieurs processus ;
- la responsabilité organisationnelle est portée par le poste et reste distincte des rôles opérationnels RACI ; aucune entrée RACI n'est déduite automatiquement de la fiche de poste ;
- la structure permanente retenue pour le cadrage est **Directions → Postes → Titulaires** ; les services/unités intermédiaires ne sont pas requis à ce stade ;
- le titulaire structurel n'est pas nécessairement l'unique personne qui réalise le travail : une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes. Les affectations opérationnelles doivent être distinguées de la titularisation ;
- le lien entre fonction-type, poste et fiche de poste reste **non arbitré**. Aucune hypothèse de partage, d'héritage ou de personnalisation ne doit être présentée comme une décision acquise.

Les passages ci-dessus constituent un cadrage fonctionnel et ne décrivent pas des capacités techniques déjà livrées. Aucun audit technique V0.10, aucune modification de code et aucune migration ne sont inclus dans cette harmonisation documentaire.
