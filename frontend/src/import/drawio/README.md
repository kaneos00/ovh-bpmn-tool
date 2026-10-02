# Import Draw.io

Cette extension permet d'importer un diagramme Draw.io (.drawio ou XML) dans le modeler BPMN.

## Fonctionnement

1. Le fichier est détecté comme Draw.io.
2. Le mxGraphModel est extrait, y compris depuis un diagramme compressé.
3. Les formes BPMN reconnues sont converties en BPMN 2.0 XML.
4. Le XML est envoyé au moteur BPMN existant via importXML().
5. Les avertissements d'import sont affichés à l'utilisateur.

## Conversion

Sont notamment reconnus : tâches et activités, événements, passerelles, sous-processus, call activities, lanes, pools/participants, flux de séquence et flux de message.

## Limites V1

Le rattachement avancé des pools, lanes et certains détails graphiques reste volontairement conservateur.

## Fichier principal

frontend/src/import/drawio/drawio-to-bpmn.ts

Le convertisseur est indépendant du modeler et produit directement un XML BPMN 2.0 réutilisable par le mécanisme d'import existant.


Development base: d6fb8f64a9072c4b7e7d9f66274d477778108a04
