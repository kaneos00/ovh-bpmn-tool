# Export BPMN — Word et BPMN 2.0 XML

Cette extension ajoute les exports de processus depuis le modeler BPMN.

## Formats disponibles

### Word (.docx)

Le bouton **Export → Export as Word** génère un document Word contenant notamment :

- le nom du processus ;
- la description, lorsqu'elle est disponible ;
- la version ;
- le créateur et la date de modification lorsqu'ils sont disponibles ;
- le diagramme BPMN sous forme d'image ;
- la liste des éléments BPMN principaux ;
- les flux de séquence ;
- le XML BPMN 2.0 dans une section de documentation.

Le document DOCX est généré directement dans le navigateur, sans dépendance npm supplémentaire.

### BPMN 2.0 XML (.bpmn)

Le bouton **Export → Export BPMN 2.0 XML** exporte le XML produit directement par saveXML({ format: true }).

Le fichier conserve donc le modèle BPMN édité par le modeler et peut être réimporté avec le bouton **Upload**.

## Fichiers

- word-export.ts : génération du document DOCX et téléchargement.
- index.ts : point d'entrée de l'extension.
- useContentModeler.ts : orchestration des exports depuis le modeler.
- ModelerActionBar.tsx : boutons du menu Export.

## Architecture

Le Word export utilise :

1. saveXML() pour récupérer le BPMN ;
2. saveSVG() pour récupérer le diagramme ;
3. generatePngFromSvg() pour produire une image PNG ;
4. createWordDocument() pour construire le fichier DOCX ;
5. downloadWordDocument() pour déclencher le téléchargement.

Aucune donnée n'est envoyée à un service externe pour générer le document.

## Convention de nommage

Les fichiers utilisent le nom du processus et sa version :

- <nom>_v<version>.docx
- <nom>_v<version>.bpmn

## Compatibilité

Le fichier BPMN exporté est le XML généré par bpmn-js/Camunda et constitue le format natif de sauvegarde du modèle.

Le DOCX est construit comme une archive Office Open XML directement dans le navigateur. Il doit être vérifié avec Microsoft Word et LibreOffice lors de la phase de test.

## Évolutions possibles

- ajouter les propriétés détaillées des tâches et événements dans le document Word ;
- ajouter les responsables et rôles lorsqu'un modèle RACI sera disponible ;
- ajouter les commentaires/documentation BPMN ;
- ajouter une table des matières ;
- proposer un export PDF à partir du même modèle documentaire.


Development base: d6fb8f64a9072c4b7e7d9f66274d477778108a04
