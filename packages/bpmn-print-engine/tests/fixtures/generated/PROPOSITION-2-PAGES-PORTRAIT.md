# Proposition de découpage — 2 pages A4 portrait

Cette proposition est générée depuis `tests/fixtures/Pizza-Store.bpmn`. Elle sert à valider le cadrage avant d'en faire une règle générique du moteur d'impression.

## Découpage retenu

- **Page 1** : fenêtre horizontale source `x = 40 à 660`.
- **Page 2** : fenêtre horizontale source `x = 660 à 1373`.
- Format : A4 portrait, marges de 40 unités.
- Même échelle sur les deux pages pour éviter que les tâches, événements et libellés changent de taille entre pages.
- Les pools et les lanes occupent la même largeur sur chaque page. La page 1 conserve une bande blanche à droite, préférable à une déformation horizontale du diagramme.
- Les formes BPMN restent entières et sont affectées à une page selon leur centre ; les flux sont découpés sur la limite de page.
- Les libellés BPMN-DI sont repositionnés avec la même transformation que leur forme ou leur flux, et retirés lorsqu'ils appartiennent clairement à l'autre fenêtre.

## Limite connue à ce stade

Les flux traversant la coupure sont représentés par leurs segments visibles sur chaque page, mais **les marqueurs explicites de raccordement (par exemple une paire de repères « suite page 2 / reprise page 1 ») ne sont pas encore ajoutés**. Le BPMN sémantique complet reste présent dans chaque fichier ; les vues générées sont des supports d'impression et non deux processus indépendants.

## Vérifications automatiques

La suite de tests vérifie le nombre de pages, la validité XML, la présence des participants/lanes, les dimensions A4, la cohérence des dimensions des lanes et la présence des flux coupés sur les deux vues.
