# Audit de correspondance — modèle organisationnel V0.10

**Branche auditée :** planning/admin-ux-v0.10  
**Dépôt :** kaneos00/ovh-bpmn-tool  
**Nature :** audit statique ciblé du code, des entités, des migrations et de la documentation. Ce document ne vaut pas validation d'exécution des migrations ni des parcours en environnement.

## 1. Synthèse

La branche contient déjà deux socles complémentaires :
- JobArchitecture : fonctions, sections d'activités, compétences, blocs de compétences, postes projet et mappings BPMN/RACI ;
- Organization : postes permanents, affectations nominatives et relations hiérarchiques.

Le modèle cible défini dans docs/functional/postes-roles-activites-raci.md privilégie leur réutilisation. Il n'est pas nécessaire de créer un nouveau module de zéro.

## 2. Éléments identifiés

| Besoin | Éléments identifiés dans V0.10 | Conclusion |
|---|---|---|
| Fonctions communes | JobFunction | Existant |
| Contenu descriptif des fonctions | Sections d'activités / sections personnalisées | Existant, sémantique à clarifier |
| Compétences | Competency, CompetencyBlock | Existant |
| Association fonction-compétences | JobFunctionCompetencyBlock | Existant |
| Poste permanent | OrganizationPosition | Existant |
| Titulaire et historique | OrganizationAssignment | Existant |
| Hiérarchie permanente | OrganizationPositionRelation | Existant |
| Poste projet | ProjectJobPosition | Existant |
| Référence vers poste permanent | organizationPositionId | Existant |
| Applicabilité des blocs au poste projet | PositionCompetencyBlock | Existant |
| Association poste projet / acteur RACI | PositionRaciActorMapping | Existant |
| Association poste projet / activité BPMN / bloc | PositionActivityMapping | Existant |
| Affectation nominative au poste projet | Non identifiée dans les entités/services inspectés | À ajouter |
| Mission attribuée à une personne dans un projet | Non identifiée comme objet d'affectation dédié | À ajouter ou intégrer à l'affectation projet |
| Relations hiérarchiques entre postes projet | Non identifiées dans le modèle inspecté | À ajouter |
| Vue graphique d'organisation projet | Conception documentée ; implémentation à confirmer | À auditer/développer |
| Association Lane ↔ poste | Pas de mapping Lane dédié identifié | À ajouter ou dériver de façon stable |
| Correspondance processus commun ↔ processus projet | Pas de mécanisme de correspondance complet vérifié | À instruire |

## 3. Points techniques confirmés dans le service

Le service JobArchitectureService :
- crée des ProjectJobPosition à partir d'une JobFunction active ;
- peut rattacher un poste projet à un OrganizationPosition ;
- récupère les blocs de compétences de la fonction de référence ;
- permet de rattacher un acteur RACI existant au poste projet ;
- permet de rattacher une activité BPMN publiée à un poste projet et à un bloc applicable ;
- valide que le processus est lié au projet, que le contenu publié existe et que l'identifiant de tâche figure dans le BPMN publié ;
- expose des diagnostics de cohérence et détecte notamment des mappings BPMN devenus obsolètes.

Limitation explicitement documentée par le diagnostic actuel : un acteur RACI est un libellé de rôle et non une personne physique ; le diagnostic n'infère pas d'affectation nominative.

## 4. Écart par rapport au modèle cible

### À conserver
- les modules et frontières JobArchitecture, Organization, ProjectContext, Resource/Process et le moteur RACI ;
- les postes permanents et leurs affectations historisées ;
- ProjectJobPosition et le lien vers le poste permanent ;
- les blocs de compétences et les mappings BPMN/RACI existants.

### À clarifier
- la relation métier entre JobFunction, fiche de poste et OrganizationPosition ;
- la différence entre section d'activités descriptives et bloc de compétences ;
- la manière de représenter les blocs de missions sans dupliquer les compétences ;
- les règles d'adaptation d'un bloc commun dans une fiche ou un projet.

### À compléter
1. Affectation projet nominative : personne existante, poste projet, dates, statut et historique.
2. Mission projet : une ou plusieurs missions confiées à une personne dans ce contexte, avec référence facultative à un ou plusieurs blocs communs et possibilité d'une description locale.
3. Organigramme projet graphique : relations hiérarchiques propres au projet entre postes projet.
4. Correspondance Lane BPMN ↔ poste/acteur : identifiants stables, en tenant compte des acteurs externes.
5. Diagnostic personne / mission / tâche / RACI, sans inférer automatiquement les responsabilités.

## 5. Architecture métier cible et réutilisation

| Niveau | Modèle cible | Réutilisation V0.10 |
|---|---|---|
| Commun | Blocs de missions, compétences, postes types, fiches de référence | JobArchitecture + OrganizationPosition |
| Organisation générale | Unités, postes occupés, titulaires, hiérarchie | Organization |
| Projet | Composition de postes communs et spécifiques, personnes, missions et hiérarchie projet | ProjectJobPosition + extensions ciblées |

Principe directeur :
- la fiche de poste décrit ce qu'un poste recouvre ;
- la personne occupe un poste ;
- le projet attribue une ou plusieurs missions à une personne ;
- les tâches décrivent le travail à réaliser ;
- le RACI précise qui fait quoi.

L'organisation projet doit être une composition du référentiel commun et de postes spécifiques, affichée sous forme graphique. Elle ne doit jamais modifier l'organigramme général.

## 6. Proposition de séquencement

1. Stabiliser le vocabulaire et le modèle commun des fiches de poste/blocs de missions.
2. Vérifier les liens actuels entre JobFunction et OrganizationPosition ; compléter seulement ce qui manque.
3. Ajouter l'affectation nominative projet et les missions confiées.
4. Ajouter les relations hiérarchiques projet et l'organigramme graphique.
5. Dans une tranche ultérieure, raccorder les Lanes et les tâches BPMN aux blocs, puis relier le RACI aux personnes affectées.
6. Ajouter les diagnostics et tests de non-régression.

## 7. Réserves de validation

Cet audit est fondé sur la lecture de fichiers de la branche et des migrations associées. Avant toute migration ou fusion, il reste à :
- vérifier toutes les migrations dans leur ordre réel et sur une base représentative ;
- vérifier les contraintes, index et relations SQL effectifs ;
- exécuter les tests backend/frontend et le CI de la branche ;
- parcourir les écrans et parcours CRUD dans l'application ;
- confirmer les routes et DTO réellement exposés.

Aucune modification de schéma ni aucun code applicatif n'est proposé par ce document.


## Addendum de cohérence fonctionnelle — décisions du 27 novembre 2026

Les décisions consolidées dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md#10-décisions-de-cadrage-consolidées--27-novembre-2026) prévalent sur toute formulation antérieure de ce document qui leur serait contraire :

- un poste comporte **au maximum quatre responsabilités** (ou blocs de missions), sans obligation d'en remplir quatre ; chaque responsabilité comporte **au maximum quatre activités** ;
- le référentiel d'activités organisationnelles est unique et les activités sont reliées explicitement aux éléments BPMN ; une même activité de référence peut être utilisée par plusieurs éléments BPMN dans plusieurs processus ;
- la responsabilité organisationnelle est portée par le poste et reste distincte des rôles opérationnels RACI ; aucune entrée RACI n'est déduite automatiquement de la fiche de poste ;
- la structure permanente retenue pour le cadrage est **Directions → Postes → Titulaires** ; les services/unités intermédiaires ne sont pas requis à ce stade ;
- le titulaire structurel n'est pas nécessairement l'unique personne qui réalise le travail : une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes. Les affectations opérationnelles doivent être distinguées de la titularisation ;
- le lien entre fonction-type, poste et fiche de poste reste **non arbitré**. Aucune hypothèse de partage, d'héritage ou de personnalisation ne doit être présentée comme une décision acquise.

Les passages ci-dessus constituent un cadrage fonctionnel et ne décrivent pas des capacités techniques déjà livrées. Aucun audit technique V0.10, aucune modification de code et aucune migration ne sont inclus dans cette harmonisation documentaire.
