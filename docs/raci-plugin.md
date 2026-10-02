# Plugin RACI — V0.3

## Règles

1. Les valeurs R/A/C/I explicitement enregistrées ont priorité.
2. Une lane fournit un rôle et permet d'inférer R lorsqu'aucun R explicite n'est présent.
3. Une activité d'approbation, validation ou autorisation permet d'inférer A sur son rôle de lane.
4. Un MessageFlow entrant permet d'inférer C depuis le rôle source.
5. Un MessageFlow sortant permet d'inférer I vers le rôle cible.
6. Une cellule sans attribution reste `missing`.

## Limites

Le BPMN ne permet pas de déduire tous les rôles RACI. Les inférences restent volontairement limitées à des règles explicites et traçables.

## Architecture

- `raci-model.json` : extension moddle.
- `raci-engine.ts` : moteur pur de dérivation.
- `raci-properties-provider.ts` : édition des métadonnées.
- `RaciMatrix.tsx` : affichage et édition de la matrice.
- `raci.css` : présentation.

## Débogage V0.3

Le premier objectif est de vérifier l'intégration sans toucher au code Recherche de V0.2.
