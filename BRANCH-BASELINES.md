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
