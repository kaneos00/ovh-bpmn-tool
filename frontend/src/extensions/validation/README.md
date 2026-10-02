# Plugin Validation BPMN — validation avant publication

## Objectif

Ajouter au projet une validation BPMN avant la publication d'un processus.

Le plugin doit permettre de détecter les erreurs et incohérences courantes d'un modèle BPMN avant qu'il soit considéré comme publiable.

L'objectif est de fournir une validation **compréhensible par un utilisateur métier**, sans empêcher la modélisation pendant le travail en cours.

## Principe

La validation distingue trois niveaux :

- **Erreur** : problème bloquant pour la publication.
- **Avertissement** : incohérence ou bonne pratique non respectée, à vérifier avant publication.
- **Information** : remarque utile sans caractère bloquant.

La validation doit pouvoir être lancée manuellement depuis le viewer/modeler et, à terme, automatiquement avant une action de publication.

## Première version

La V1 doit contrôler notamment :

### Structure du processus

- présence d'au moins un événement de début ;
- présence d'au moins un événement de fin ;
- présence d'au moins une activité ;
- détection des éléments isolés ;
- détection des flux de séquence invalides ou incohérents ;
- vérification des passerelles ayant des entrées/sorties cohérentes.

### Activités

- activité sans nom ;
- activité sans flux entrant lorsqu'un flux est attendu ;
- activité sans flux sortant lorsqu'un flux est attendu ;
- détection des activités potentiellement inaccessibles.

### Événements

- événement de début sans sortie ;
- événement de fin sans entrée ;
- événements intermédiaires incohérents avec leur position dans le processus.

### Passerelles

- passerelle sans branche de sortie ;
- passerelle avec une seule branche lorsque plusieurs branches sont attendues ;
- passerelle dont les branches sont difficiles à distinguer ;
- vérification des conditions lorsque celles-ci sont nécessaires.

### Flux

- flux de séquence sans source ou sans cible ;
- flux sortant vers un élément incompatible ;
- conditions manquantes lorsqu'une passerelle conditionnelle l'exige.

## Interface utilisateur

Prévoir un panneau **Validation BPMN** présentant :

| Niveau | Affichage |
|---|---|
| Erreur | rouge |
| Avertissement | orange |
| Information | bleu |

Chaque résultat doit contenir :

- niveau ;
- message lisible ;
- identifiant de l'élément BPMN concerné ;
- nom de l'élément si disponible ;
- règle de validation ;
- possibilité de sélectionner/centrer l'élément dans le diagramme.

Exemple :

> Erreur — L'activité « Sauvegarder les données » n'a aucun flux sortant.

Le clic sur le résultat doit permettre de localiser l'élément concerné dans le diagramme.

## Validation avant publication

Le principe cible est :

`Modélisation → Validation → Correction éventuelle → Publication`

Une publication doit pouvoir être bloquée lorsqu'il existe au moins une erreur de niveau **bloquant**.

Les avertissements ne doivent pas nécessairement empêcher la publication.

Le comportement exact du bouton **Publier** sera défini lors de l'implémentation du workflow multi-utilisateur et des droits.

## Architecture prévue

Le plugin doit rester découplé du moteur de publication.

Structure envisagée :

```
frontend/src/extensions/validation/
├── README.md
├── index.ts
├── validation.ts
├── rules/
│   ├── structure.ts
│   ├── activities.ts
│   ├── events.ts
│   ├── gateways.ts
│   └── flows.ts
└── types.ts
```

Cette structure est indicative et pourra être adaptée à l'architecture existante du projet.

## Modèle de résultat

Chaque règle devrait retourner un résultat comparable à :

```ts
{
  level: 'error' | 'warning' | 'info',
  ruleId: string,
  message: string,
  elementId?: string,
  elementName?: string
}
```

Les règles doivent être indépendantes afin de pouvoir être ajoutées, désactivées ou modifiées sans réécrire le moteur de validation.

## Validation technique

La validation doit utiliser le modèle BPMN déjà chargé par l'application autant que possible.

Elle ne doit pas modifier le diagramme.

Une validation doit être :

- déterministe ;
- reproductible ;
- sans effet de bord ;
- suffisamment rapide pour être exécutée à chaque demande de validation.

## Tests prévus

Prévoir des cas de test couvrant au minimum :

1. processus valide ;
2. processus sans événement de début ;
3. processus sans événement de fin ;
4. activité isolée ;
5. activité sans sortie ;
6. passerelle mal configurée ;
7. flux invalide ;
8. plusieurs erreurs simultanées ;
9. mélange erreurs / avertissements / informations ;
10. sélection d'un élément depuis le résultat de validation.

## Évolutions futures

Après la V1, le plugin pourra évoluer vers :

- règles BPMN 2.0 plus complètes ;
- règles métier configurables ;
- profils de validation ;
- validation avant publication obligatoire ;
- validation spécifique ISO 9001 ;
- validation spécifique ITIL ;
- contrôle de nommage ;
- contrôle des liens vers les procédures/wiki ;
- contrôle RACI ;
- rapport de validation exportable ;
- historique des validations ;
- API REST de validation ;
- validation automatique dans un workflow CI/CD.

## Relation avec les autres plugins

Le plugin est conçu pour s'intégrer progressivement avec :

- **Recherche** : retrouver les éléments présentant des erreurs ;
- **API REST** : exposer les résultats de validation ;
- **RACI** : vérifier que les responsabilités nécessaires sont renseignées ;
- **Multi-utilisateur** : contrôler qui peut publier ;
- **Historique** : conserver le résultat d'une validation avec une version ;
- **Documentation** : intégrer le rapport de validation aux documents générés.

## État

Branche initiale :

`feature/plugin-validation`

Cette branche contient d'abord la spécification fonctionnelle du plugin. L'implémentation du moteur et de l'interface sera ajoutée après validation de cette spécification.
