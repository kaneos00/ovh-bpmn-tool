# Fixtures du moteur d'impression

- `pizza-process.bpmn` : BPMN source de test, avec deux lanes horizontales et une chaîne de tâches qui s'étend sur plusieurs pages.
- `generated/` : BPMN de présentation générés par le script de fixture, destinés à une revue visuelle rapide dans KHI Flows / bpmn-js.
- Les fichiers `*-page-*.bpmn` sont des **vues de travail pour inspection**, pas des BPMN source à réimporter comme processus métier. Les connecteurs qui traversent une page sont représentés par des tâches de continuation.

Régénérer les fichiers depuis la racine du dépôt :

```bash
python3 packages/bpmn-print-engine/scripts/generate-fixtures.py
```

Le générateur est volontairement limité aux fixtures de démonstration. Il ne constitue pas l'algorithme de partitionnement de production, qui doit être implémenté et testé via le ticket #102.
