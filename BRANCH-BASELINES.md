# Références de branches et règles de reprise

Ce document est la source de vérité pour choisir une base de développement ou de comparaison. En cas de doute, ne pas comparer des branches sur la seule base de leur nom ou de leur date : vérifier le commit exact.

## V0.8 consolidée — référence historique validée

- **Branche canonique :** `feat/process-creation-metadata`
- **Commit de référence enregistré le 19 novembre 2026 :** `93aff50b1bfd5763cc7cef78db0f553eccae3bb2`
- **Intégration tableau de bord + fiches de poste :** `061f6bd99426c83dfefae8ee814fcaadfcbbd735`
- **Statut :** référence consolidée validée pour l'audit de régression V0.8 et la reprise des fonctionnalités V0.8.

Le commit de référence doit être réévalué explicitement lorsqu'une nouvelle référence est validée. Ne pas supposer que le déplacement de la tête de branche change rétroactivement le commit de référence.

## Ancienne branche V0.8 — OBSOLÈTE

- **Branche :** `V0.8`
- **Dernier commit historique identifié avant marquage :** `2fd7abc5bf7fe16d4920d599b36d1d43b3f897b5`
- **Statut :** obsolète, conservée uniquement pour consultation de l'historique.
- **Interdictions :** ne pas l'utiliser comme base de développement, de déploiement, de comparaison ou d'audit de régression.

Un fichier `OBSOLETE.md` est également présent sur cette branche pour rendre son statut visible depuis GitHub.

## Règles obligatoires pour toute intervention future

1. **Identifier la cible réelle.** Relever le dépôt, la branche, le commit exact et, pour un audit de l'instance, le commit réellement déployé. Ne jamais déduire la branche déployée du nom de domaine ou de la branche la plus récente.
2. **Choisir la référence par son nom ET son SHA.** Pour l'audit V0.8, utiliser la référence canonique ci-dessus, jamais la branche historique `V0.8`.
3. **Ne jamais comparer à une branche homonyme obsolète.** Si une référence est ambiguë, interrompre la comparaison et vérifier le présent document et les commits.
4. **Auditer les comportements, pas les volumes de diff.** Une différence de fichiers ou de commits ne prouve pas une régression. Chaque régression doit être étayée par le comportement de référence, le comportement courant et les fichiers/tests concernés.
5. **Protéger les comportements explicitement sanctuarisés.** En particulier, ne pas modifier le comportement de zoom du Viewer sans autorisation explicite et conserver ses tests de non-régression.
6. **Éviter les mélanges de générations.** Les travaux V3 restent distincts de la reprise V0.8, sauf demande explicite d'intégration.
7. **Pas de déploiement implicite.** Un audit ou une correction sur branche ne vaut jamais autorisation de fusion ou de déploiement. CI verte avant toute proposition de déploiement.

## Contrôle préalable obligatoire

Avant chaque comparaison ou portage :
- confirmer la branche cible et son SHA ;
- confirmer la référence et son SHA ;
- confirmer que les deux appartiennent à la même lignée fonctionnelle attendue ;
- lire les commits/PR intermédiaires et identifier les changements intentionnels ;
- consigner les résultats et les incertitudes avant toute modification.

## Branches examinées le 19 novembre 2026 — ne pas confondre avec la référence V0.8

- `planning/admin-ux-v0.9` au commit `d5f3b2f61a3a7ac61eca798695bec10178294ae8` : branche distincte, issue de la lignée V3/architecture d'administration. Sa comparaison avec la référence V0.8 est divergente : ancêtre commun `8138ffe3d06ce6d011d0ce44b5520282dd50ff63`, 122 commits propres à cette branche et 189 commits de la référence non présents dans cette branche. **Ne pas la présenter comme une évolution directe de la V0.8 consolidée.**
- `v3` au commit `d372f644922581728794516345a1308d4c78a84e` : branche V3 séparée. À traiter selon sa propre lignée et ses objectifs, sans la mélanger à la V0.8.
- Ces informations décrivent l'état Git constaté ; elles ne prouvent pas quelle branche/quel SHA est effectivement déployé dans Coolify.

Pour tout audit de l'instance `ovh-bpmn.vps-yma.ovh`, identifier d'abord le SHA réellement injecté dans le build ou la révision sélectionnée dans Coolify. Le nom de domaine, le nom d'une branche candidate et la dernière CI verte ne constituent pas une preuve du commit déployé.

## Attention au guide de déploiement Coolify historique

Le guide `deploy/coolify/README.md` consulté sur la branche candidate indique encore `feature/v2-workspace-views` comme branche de démonstration. Cette branche pointe sur `059d5803f18d1f4319a4261bc812ba3c4d01f893` (13 octobre 2026). Cette indication est historique et ne permet pas d'identifier la branche réellement configurée aujourd'hui dans Coolify. Ne pas l'utiliser comme preuve de la version déployée.
