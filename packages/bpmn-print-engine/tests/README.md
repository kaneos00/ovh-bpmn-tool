# Tests du moteur d'impression BPMN

## Préparer / régénérer les fichiers consultables

Depuis la racine du dépôt :

```bash
python3 packages/bpmn-print-engine/scripts/generate-fixtures.py
```

Les pages générées sont écrites dans `tests/fixtures/generated/`. Ouvre `pizza-page-01.bpmn`, `pizza-page-02.bpmn` et `pizza-page-03.bpmn` dans KHI Flows ou un éditeur BPMN pour commenter la répartition, les lanes et les marqueurs de continuité.

## Validation automatisée des fixtures

```bash
python3 -m unittest discover -s packages/bpmn-print-engine/tests -p 'test_*.py' -v
```

Les tests vérifient la syntaxe XML, le maintien des deux lanes, les marqueurs de continuité, les références des flux et les références BPMN DI. Ils ne prouvent pas encore la correction de l'algorithme de partitionnement de production : celle-ci reste dans le ticket [#102](https://github.com/kaneos00/ovh-bpmn-tool/issues/102).
