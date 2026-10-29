# Moteur indépendant de prettyfication BPMN

## Décision d’architecture

Le moteur est développé en TypeScript dans une branche dédiée, en parallèle des évolutions fonctionnelles et de la refonte du site. Son cœur ne dépend ni du Viewer, ni du Modeleur, ni de React, ni du DOM.

La pagination A4 (#76) est un chantier distinct. Elle ne doit pas embarquer les règles de prettyfication.

## Contrat initial

Entrée : représentation géométrique normalisée du diagramme (lanes, participants, éléments, coordonnées et dimensions).

Sortie : nouvelle représentation sans mutation de l’entrée, liste des règles appliquées et diagnostics structurés.

La couche BPMN-DI (lecture/écriture XML) sera un adaptateur séparé, après audit des bibliothèques et des conventions réellement utilisées dans le dépôt.

## Règles de la première tranche

- Lane horizontal : alignement vertical des centres des éléments.
- Lane vertical : alignement horizontal des centres des éléments.
- Homogénéisation de la dimension transversale des lanes d’un même participant et d’une même orientation (hauteur pour les lanes horizontaux, largeur pour les verticaux).
- Refus d’une correction qui introduirait un chevauchement ou dépasserait une limite de déplacement configurée.
- Diagnostic des identifiants dupliqués, références de lane manquantes, dimensions invalides, éléments hors lane et chevauchements.

## Garde-fous

- Préserver les identifiants et la sémantique BPMN.
- Ne jamais écrire dans le document source pendant le calcul.
- Ne pas appliquer le résultat au Modeleur sans action explicite.
- Ajouter des fixtures réelles avant de brancher l’adaptateur BPMN-DI.
- Ne pas considérer cette première tranche comme prête pour intégration utilisateur : elle établit le socle géométrique et le contrat.

## Phases

1. Audit du dépôt et constitution des fixtures.
2. Contrat et module TypeScript autonome.
3. Premières règles géométriques.
4. Vérificateur et tests CI.
5. Adaptateur et intégration réversible dans le Modeleur.
6. Extension des règles, mesures et stabilisation.

Les phases 2 à 4 avancent indépendamment de la refonte du site. L’intégration UI attendra un point de raccord stable.
