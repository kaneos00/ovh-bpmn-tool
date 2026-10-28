# Architecture du moteur d'impression BPMN

> Statut : architecture initiale et squelette de module — aucune promesse de moteur complet à ce stade.
>
> Base de travail : branche `v2.3`. Cette documentation vit sur `feat/bpmn-print-engine-architecture` pour rester isolée des évolutions UI et métier.

## 1. Objectif

Construire un moteur de pagination et de génération de documents BPMN réutilisable dans KHI Flows en V2.4, V2.5 ou toute version ultérieure, sans couplage aux composants React, au modeleur, au viewer, aux routes ou à l'API métier.

Le BPMN source reste immuable. Le moteur produit un **plan d'impression** et une **représentation intermédiaire paginée** ; les formats SVG, PNG et PDF sont des sorties de rendu, pas des moteurs de pagination distincts.

## 2. Tickets et historique liés

- Évolution mère : [#76 — Évolution 41 : exporter les diagrammes BPMN en SVG paginé A4](https://github.com/kaneos00/ovh-bpmn-tool/issues/76).
- [#100 — Contrat public et socle indépendant](https://github.com/kaneos00/ovh-bpmn-tool/issues/100).
- [#101 — Plan de pagination et orientation](https://github.com/kaneos00/ovh-bpmn-tool/issues/101).
- [#102 — Partitionnement logique du BPMN](https://github.com/kaneos00/ovh-bpmn-tool/issues/102).
- [#103 — Rendus SVG, PNG et PDF](https://github.com/kaneos00/ovh-bpmn-tool/issues/103).
- [#104 — Adaptateur KHI Flows et compatibilité multi-version](https://github.com/kaneos00/ovh-bpmn-tool/issues/104).
- [PR #87 — première implémentation SVG A4](https://github.com/kaneos00/ovh-bpmn-tool/pull/87) : référence historique à auditer ; elle mélange moteur et intégration UI.
- [PR #98 — correctifs des coupures de formes SVG depuis V2.3](https://github.com/kaneos00/ovh-bpmn-tool/pull/98) : conserver les cas de régression et les heuristiques utiles, sans imposer l'architecture géométrique actuelle comme cible.

La fonctionnalité n'est pas considérée comme terminée simplement parce que l'export SVG V1 existe. Le ticket #76 reste le suivi parent jusqu'à validation fonctionnelle, tests et intégration.

## 3. Pipeline en trois responsabilités

```text
BPMN XML + paramètres d'impression
              |
              v
  1. planPages() — fonction pure
              |
              v
       PagePlan (format neutre)
              |
              v
  2. partitionBpmn() — logique BPMN
              |
              v
    PagedPrintDocument (IR)
              |
              +-----------------+
              |        |        |
              v        v        v
        renderSvg  renderPng  renderPdf
```

### Étape 1 — Planification des pages

Responsabilité : déterminer le format papier, l'orientation portrait/paysage, les marges, la zone utile, l'échelle, le nombre de pages, leur ordre et les fenêtres logiques/coordonnées.

- Fonction déterministe et testable sans DOM.
- Aucun parsing/réécriture BPMN et aucun rendu.
- Les unités et conversions sont explicites.
- Le choix entre pagination par grille et répartition logique doit être documenté ; ne pas supposer qu'un ratio largeur/hauteur suffit à garantir la lisibilité.
- Une limite de sécurité du nombre de pages est configurable et testée.

### Étape 2 — Partitionnement logique

Responsabilité : analyser le BPMN et construire une représentation d'impression page par page.

- Ne jamais muter le XML source.
- Conserver les identifiants et les relations source utiles au diagnostic.
- Affecter les éléments entiers aux pages ; éviter les coupures au milieu d'une tâche, d'un événement, d'une gateway ou d'un label.
- Représenter les lanes sur les pages concernées avec une identité et un titre cohérents.
- Définir explicitement les flux qui traversent les limites, les retours, les événements attachés, les sous-processus et les éléments impossibles à répartir proprement.
- Les repères de continuation sont des annotations de publication, pas des événements BPMN inventés.
- V1 : conserver autant que possible les coordonnées source. Un algorithme de re-layout est une évolution séparée, derrière une stratégie explicite.

Le résultat n'est pas automatiquement un ensemble de BPMN XML indépendants : ce choix risquerait de casser la sémantique et les références de flux. Les fichiers BPMN par page, si requis plus tard, devront faire l'objet d'un contrat et de validations dédiés.

### Étape 3 — Rendu de documents

Responsabilité : convertir l'IR paginée en sorties imprimables, sans recalculer le plan ni déplacer les éléments.

- SVG est le premier format de référence.
- PNG et PDF sont des adaptateurs distincts, avec leurs dépendances documentées.
- Dimensions A4, marges, échelle, titres, numéros de page et marqueurs de continuation doivent rester cohérents.
- Le rendu peut signaler une impossibilité ou une perte de fonctionnalité ; il ne doit pas masquer les erreurs de partitionnement.

## 4. Structure cible

```text
packages/bpmn-print-engine/
  package.json
  README.md
  src/
    index.ts              # API publique stable
    types.ts              # contrats et structures intermédiaires
    pagination/           # planPages
    partition/            # partitionBpmn
    render/
      svg/
      png/
      pdf/
  tests/
    pagination/
    partition/
    render/
  fixtures/
    simple-process.bpmn
    horizontal-lanes.bpmn
    multi-lane-long-process.bpmn
    parking-regression.bpmn
```

Les sous-dossiers seront ajoutés au rythme de l'implémentation. Le squelette actuel ne prétend pas fournir déjà ces algorithmes.

## 5. Contrats et dépendances

- L'API publique est exposée uniquement depuis `src/index.ts`.
- Le cœur ne dépend ni de React, ni de bpmn-js, ni de l'état du modeleur, ni de l'API backend.
- L'entrée peut être un XML BPMN et des options neutres ; toute extraction de diagramme à partir d'un canvas bpmn-js appartient à un adaptateur de l'application.
- Le modèle intermédiaire contient des données sérialisables et ne dépend pas du DOM du navigateur.
- Les dépendances nécessaires à la conversion PNG/PDF restent confinées aux adaptateurs correspondants.
- Versionner le contrat public et documenter les changements incompatibles.
- Ne pas déplacer prématurément le code historique en masse : comparer son comportement et ses tests avant d'extraire ou remplacer une fonction.

## 6. Tests et validation séquentielle

1. **Planification** : tests purs pour A4 portrait/paysage, diagramme court, large, haut, marges, limites, valeurs invalides, ordre des pages.
2. **Partitionnement** : tests de conservation des identifiants, éléments non tronqués, lanes, flux entrants/sortants, raccordements et éléments impossibles à partitionner.
3. **Rendu** : tests des dimensions et du contenu SVG ; ensuite PNG/PDF, avec vérifications visuelles ou fixtures de référence.
4. **Intégration** : un adaptateur fin dans le modeleur ; tests d'intégration sur V2.3 et validation de reprise sur les branches ultérieures.
5. **Régressions** : réutiliser les BPMN de test existants, notamment le cas Parking associé à la PR #98, sans coupler le package à la structure des tests frontend.

Chaque étape doit pouvoir être validée et livrée indépendamment. Les tests d'intégration vérifient l'enchaînement, mais ne remplacent pas les tests unitaires des modules.

## 7. Stratégie de branche et de migration

- Base de conception : `v2.3`, commit de base confirmé par la PR #98 : `eb6995d3dc64c7e9a9c801dc80d921e5c1a96387`.
- Branche isolée : `feat/bpmn-print-engine-architecture`.
- Ne pas déployer ni modifier automatiquement la branche `v2.3`.
- Le moteur pourra être intégré par copie du package, sous-module ou workspace selon la configuration réelle du dépôt ; la décision doit éviter de forcer une migration monorepo globale.
- L'adaptateur est le seul endroit qui connaît les API de KHI Flows.
- Pour V2.4/V2.5+, vérifier le contrat public et lancer les tests du package avant les tests d'intégration. Un changement d'UI ne doit pas imposer de modifier le cœur du moteur.

## 8. Hors périmètre du socle initial

- Re-layout automatique des tâches pour remplir chaque page.
- Réécriture du BPMN source.
- Création de BPMN XML autonomes par page.
- Aperçu UI et modifications du menu d'export.
- Garantie de conversion PNG/PDF sans dépendance d'environnement avant sélection des bibliothèques.

## 9. Ordre de réalisation

1. #100 — contrat et socle.
2. #101 — calcul du plan de pages.
3. #102 — partitionnement logique.
4. #103 — rendus, SVG d'abord.
5. #104 — adaptateur KHI Flows et validation d'intégration.

L'évolution mère #76 ne doit être close qu'après validation des critères fonctionnels complets et de la sortie intégrée.
