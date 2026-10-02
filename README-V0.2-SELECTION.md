# V0.2 — Correction de la sélection Viewer

## Base

Cette branche part directement de **V0.2** :

- V0.2 : `4543fec8f9914d6ec60bb0c93b195bf8f33971f3`
- base fonctionnelle : `496e1a5`

Elle expérimente une correction du cycle de vie Viewer et ajoute un surlignage indépendant pour les résultats de recherche. Le problème de sélection native reste ouvert :

1. sélection impossible lors du lancement direct du Viewer ;
2. élément atteint par la recherche mais pas sélectionné.

Les modifications de cycle de vie testées ici n'ont pas résolu ces deux problèmes.

## Cause identifiée

Le Viewer était initialisé dans cet ordre :

```text
importXML()
    ↓
import.done
    ↓
attachTo()
```

Or le module Recherche écoute `import.done` pour traiter le paramètre URL `?element=...`.

La sélection pouvait donc être demandée alors que le Viewer n'était pas encore attaché au DOM. Cela explique également le comportement observé :

- Viewer ouvert directement : diagramme visible mais interaction/sélection incorrecte ;
- passage préalable par le Modeler : la sélection fonctionne ;
- recherche : la navigation arrive sur le bon élément mais sa sélection n'est pas fiable.

La correction applique l'ordre attendu :

```text
attachTo()
    ↓
importXML()
    ↓
import.done
    ↓
sélection de l'élément
```

## Modifications

### 1. Viewer

Dans :

`frontend/src/Components/BusinessComponents/ProcessViewer/hooks/useProcessViewer.ts`

Le Viewer est maintenant attaché au conteneur **avant** l'appel à `importXML()`.

Cela garantit que les services d'interaction et de sélection sont disponibles lorsque l'événement `import.done` est traité.

### 2. Recherche — sélection native

Dans :

`frontend/src/extensions/recherche/recherche-module.ts`

La sélection de l'élément cible a été simplifiée :

- suppression du retry de sélection jusqu'à 10 tentatives ;
- suppression des temporisations associées ;
- sélection directe après `import.done` ;
- conservation de `canvas.scrollToElement()`.

L'objectif était de corriger le cycle de vie du Viewer plutôt que de compenser un mauvais ordre d'initialisation par des retries. Les tests ont montré que cette modification ne suffit pas à rétablir la sélection native.

### 3. Recherche — surlignage indépendant

Un mécanisme distinct de la sélection `diagram-js` a été ajouté dans :

`frontend/src/extensions/recherche/recherche-highlight.css`

et utilisé par `recherche-module.ts`.

Lorsqu'un résultat de recherche possède un élément BPMN :

- l'élément est marqué avec `canvas.addMarker()` ;
- une bordure orange et un halo permettent de l'identifier visuellement ;
- le mécanisme fonctionne quel que soit le type d'élément BPMN ;
- l'ancien surlignage est retiré lorsqu'un autre résultat est ciblé ;
- le marqueur est supprimé lors de la destruction du diagramme.

Ce surlignage ne dépend pas du service `selection` et constitue donc une fonctionnalité indépendante du problème de sélection native.

## Ce qui n'est pas modifié

- aucune modification du moteur de recherche ;
- aucune modification du provider de recherche ;
- aucune modification du modèle BPMN ;
- aucun ajout de boucle de retry ;
- aucune modification de la base V0.2 elle-même.

## Validation attendue

Après déploiement, vérifier séparément :

### A. Viewer direct

1. ouvrir directement un processus en Viewer ;
2. constater que le problème de sélection native reste présent.

Ce comportement est volontairement laissé en attente.

### B. Recherche

1. rechercher un élément dans le processus courant ;
2. sélectionner un résultat ;
3. vérifier la navigation ;
4. vérifier que l'élément cible est visuellement surligné.

### C. Navigation inter-processus

1. rechercher un élément appartenant à un autre processus ;
2. ouvrir le processus cible ;
3. vérifier que le Viewer est interactif ;
4. vérifier que l'élément transmis par `?element=...` est sélectionné.

### D. Retour Modeler → Viewer

Vérifier que le comportement reste identique après passage dans le Modeler.

## Historique

```text
496e1a5
   ↓
4543fec8   V0.2
   ↓
b433cac3   attach Viewer avant import
   ↓
791ddef6   suppression du retry de sélection
```

Le surlignage est la fonctionnalité validée à tester sur cette branche. Le problème de sélection native Viewer/Recherche reste volontairement en attente.
