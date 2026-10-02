# V0.3 — RACI sur base V0.2

## Base de référence

V0.3 part directement de la branche `v0.2` gelée au commit `9c6e368a7b79a9867a5cec9ac88cb29125267235`.

La branche RACI historique `feature/raci-from-search-6cce15d` n'est pas fusionnée telle quelle : elle part de `6cce15d`, alors que V0.2 contient des évolutions Recherche ultérieures, notamment le surlignage validé.

## RACI intégré

- extension moddle `raci:*` persistée dans le BPMN XML ;
- moteur de dérivation R/A/C/I ;
- statuts `explicit`, `inferred`, `missing` ;
- R inféré depuis la lane ;
- A inféré sur les activités d'approbation/validation/autorisation ;
- C/I inférés à partir des MessageFlow ;
- édition R/A/C/I dans le panneau de propriétés ;
- matrice RACI accessible depuis la barre du Modeler ;
- sélection d'une activité depuis la matrice ;
- édition d'une cellule et acceptation des valeurs inférées.

## Principe de débogage

V0.2 reste la référence fonctionnelle. Le moteur Recherche et son surlignage ne doivent pas être modifiés pour corriger RACI.

Les tests V0.3 doivent d'abord vérifier :

1. compilation TypeScript/Vite ;
2. ouverture du Modeler sans erreur ;
3. bouton RACI ;
4. calcul de la matrice ;
5. R inféré par lane ;
6. A inféré sur validation ;
7. C/I par MessageFlow ;
8. persistance XML des métadonnées ;
9. recherche V0.2 toujours fonctionnelle.
