# Moteur indépendant de prettyfication BPMN

## Décision d’architecture

Le moteur est développé en TypeScript dans une branche dédiée, en parallèle des évolutions fonctionnelles et de la refonte du site. Son cœur ne dépend ni du Viewer, ni du Modeleur, ni de React, ni du DOM.

La pagination A4 (#76) est un chantier distinct. Elle ne doit pas embarquer les règles de prettyfication.

## API et adaptateur XML

- L’API géométrique accepte une représentation normalisée (lanes, participants, éléments, coordonnées et dimensions).
- `prettifyBpmnXml(xml, options)` lit le BPMN XML avec `bpmn-moddle`, applique les règles au BPMN-DI existant puis sérialise un nouveau document.
- `verifyBpmnXml(xml)` retourne les diagnostics géométriques et les avertissements de parsing.
- `convertBpmnLaneOrientation(xml, targetOrientation, options)` est l’API V2 : elle convertit l’orientation des lanes (`horizontal` ou `vertical`), puis exécute le moteur de prettyfication V1 sur le document transformé.
- Le traitement ne modifie pas la chaîne XML fournie par l’appelant et n’écrit aucun fichier.

L’adaptateur ne crée pas les formes DI manquantes. Il recale les extrémités des BPMNEdge existants sur les limites des formes déplacées, tout en conservant les waypoints intermédiaires. Ce recalage est volontairement minimal : les routes complexes devront être validées sur un corpus plus large.

## Règles V1

- Lane horizontale : alignement vertical des centres des éléments.
- Lane verticale : alignement horizontal des centres des éléments.
- Homogénéisation de la dimension transversale des lanes sœurs d’un même participant et d’une même orientation (hauteur pour les lanes horizontales, largeur pour les verticales). Le moteur conserve les écarts existants, réagence les lanes suivantes et déplace leur contenu ainsi que les sous-lanes associées.
- Refus d’un alignement qui introduirait un chevauchement entre éléments ou dépasserait la limite de déplacement configurée.
- Limitation du redimensionnement/réagencement par `maxDisplacement`. Après le réagencement, les bounds DI du participant sont recalculés pour englober les lanes de premier niveau.
- Diagnostic des identifiants dupliqués, références de lane manquantes, dimensions invalides, éléments hors lane et chevauchements.

## V2 — Conversion de l’orientation des lanes

- La conversion est une opération explicite, indépendante du frontend.
- Les centres des formes DI et les waypoints des connexions sont tournés de 90 degrés ; les dimensions des lanes et des participants sont permutées.
- Les dimensions propres aux tâches, événements, passerelles et autres formes BPMN sont conservées afin qu’elles restent lisibles.
- Les objets sémantiques BPMN, identifiants et références ne sont pas réécrits intentionnellement.
- Une fois la transformation effectuée, V1 est exécutée pour égaliser et aligner la géométrie.
- L’API refuse de deviner si aucune lane n’a de bounds DI, si toutes les lanes sont carrées ou si les orientations sont également représentées.
- Les tests couvrent la conversion horizontale → verticale, le retour verticale → horizontale, le passage par V1 et la conservation des identifiants/références. Les routes complexes et les diagrammes réels restent à valider avant intégration.

## Garde-fous et limites connues

- Préserver les identifiants, références et la sémantique BPMN.
- Ne jamais écrire dans le document source pendant le calcul.
- Ne pas appliquer le résultat au Modeleur sans action explicite.
- L’orientation source est inférée à partir du rapport largeur/hauteur des lanes ; les cas ambigus sont refusés plutôt que transformés au hasard.
- Les diagrammes avec lanes imbriquées sont représentés explicitement, mais les cas où le redimensionnement d’une lane parent impose une redistribution spécifique des sous-lanes nécessitent encore des fixtures ciblées.
- La vérification initiale est géométrique. Elle ne remplace pas un validateur complet de conformité BPMN.
- Les tests incluent des fixtures ciblées et un BPMN réel du dépôt.
- Ce socle n’est pas prêt pour une intégration utilisateur tant que les contraintes géométriques et les connexions ne sont pas suffisamment validées.

## Phases

1. V1 : règles géométriques, vérificateur et tests de référence.
2. V2 : conversion bidirectionnelle de l’orientation des lanes.
3. Validation sur un corpus BPMN représentatif et vérification de l’idempotence.
4. Intégration réversible dans le Modeleur, uniquement après validation explicite.

Les phases V1/V2 avancent indépendamment de la refonte du site. L’intégration UI attendra un point de raccord stable.
