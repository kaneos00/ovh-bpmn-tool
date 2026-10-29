# Moteur indépendant de prettyfication BPMN

## Décision d’architecture

Le moteur est développé en TypeScript dans une branche dédiée, en parallèle des évolutions fonctionnelles et de la refonte du site. Son cœur ne dépend ni du Viewer, ni du Modeleur, ni de React, ni du DOM.

La pagination A4 (#76) est un chantier distinct. Elle ne doit pas embarquer les règles de prettyfication.

## API et adaptateur XML

- L’API géométrique accepte une représentation normalisée (lanes, participants, éléments, coordonnées et dimensions).
- `prettifyBpmnXml(xml, options)` lit le BPMN XML avec `bpmn-moddle`, applique les règles au BPMN-DI existant puis sérialise un nouveau document.
- `verifyBpmnXml(xml)` retourne les diagnostics géométriques et les avertissements de parsing.
- Le traitement ne modifie pas la chaîne XML fournie par l’appelant et n’écrit aucun fichier.

L’adaptateur ne crée pas les formes DI manquantes. Il recale les extrémités des BPMNEdge existants sur les limites des formes déplacées, tout en conservant les waypoints intermédiaires. Ce recalage est volontairement minimal : les routes complexes devront être validées sur un corpus plus large.

## Règles actuelles

- Lane horizontal : alignement vertical des centres des éléments.
- Lane vertical : alignement horizontal des centres des éléments.
- Homogénéisation de la dimension transversale des lanes sœurs d’un même participant et d’une même orientation (hauteur pour les lanes horizontaux, largeur pour les verticaux). Le moteur conserve les écarts existants, réagence les lanes suivantes et déplace leur contenu ainsi que les sous-lanes associées.
- Refus d’un alignement qui introduirait un chevauchement entre éléments ou dépasserait la limite de déplacement configurée.
- Limitation du redimensionnement/réagencement par `maxDisplacement`. Après le réagencement, les bounds DI du participant sont recalculés pour englober les lanes de premier niveau.
- Diagnostic des identifiants dupliqués, références de lane manquantes, dimensions invalides, éléments hors lane et chevauchements.

## Garde-fous et limites connues

- Préserver les identifiants, références et la sémantique BPMN.
- Ne jamais écrire dans le document source pendant le calcul.
- Ne pas appliquer le résultat au Modeleur sans action explicite.
- L’orientation est actuellement inférée à partir du rapport largeur/hauteur des bounds de lane ; cette heuristique doit être testée sur des diagrammes inhabituels.
- Les diagrammes avec lanes imbriquées sont représentés explicitement, mais les cas où le redimensionnement d’une lane parent impose une redistribution spécifique des sous-lanes nécessitent encore des fixtures ciblées.
- La vérification initiale est géométrique. Elle ne remplace pas un validateur complet de conformité BPMN.
- Les tests incluent une fixture construite pour les cas ciblés et un test de parsing/réécriture sur un BPMN réel du dépôt.
- Ce socle n’est pas prêt pour une intégration utilisateur tant que les contraintes géométriques et les connexions ne sont pas suffisamment validées.

## Phases

1. Audit du dépôt et constitution des fixtures.
2. Contrat et module TypeScript autonome.
3. Premières règles géométriques.
4. Vérificateur et tests CI.
5. Intégration réversible dans le Modeleur.
6. Extension des règles, mesures et stabilisation.

Les phases 2 à 4 avancent indépendamment de la refonte du site. L’intégration UI attendra un point de raccord stable.
