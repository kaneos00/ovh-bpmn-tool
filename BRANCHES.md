# Référentiel des branches de version

Ce document distingue les **branches de référence numérotées** des branches de développement et des branches de travail liées aux tickets.

## Branches de référence

| Référence | Ancienne branche / origine | Commit de référence | Rôle |
|---|---|---|---|
| `V0.1` | historique | `d6fb8f64` | Repère historique conservé |
| `V0.2` | historique | `8c85c336` | Repère historique conservé |
| `V0.3` | historique | `b3efd8a6` | Repère historique conservé |
| `V0.4` | `v2.3` | `d4a8c389` | Référence V2 antérieure |
| `V0.5` | `v2.4` | `df25c696` | Référence V2 actuelle, informations documentées et navigation explorateur |
| `V0.6` | `v3` | `d372f644` | Référence de développement V3 |

Les branches `V0.1` à `V0.6` sont des repères de version successifs. La numérotation continue à partir de `V0.7` pour la prochaine référence publiée.

## Branches de travail

Les branches `feat/*`, `fix/*`, `refactor/*`, `test/*` et `work/*` restent nommées selon leur sujet ou leur ticket. Elles ne sont pas renommées en références V0.x.

En particulier, les branches de développement V3 et les branches d'intégration associées à des PR ouvertes restent distinctes des références V0.x. Une référence V0.x ne remplace pas une branche de travail active.

## Règles de gestion

1. Créer une nouvelle branche V0.x au commit exact qui constitue la référence validée.
2. Ne jamais déplacer une référence V0.x après sa création ; créer la suivante pour une nouvelle référence.
3. Conserver les références historiques V0.x.
4. Avant toute suppression d'une branche de travail, vérifier ses PR, ses commits propres, les références documentaires et les déploiements éventuels.
5. Ne pas supprimer une branche associée à une PR ouverte sans décision explicite.
6. Une création de référence ne déclenche aucun déploiement automatique de notre part.

## Correspondance temporaire des anciens noms

Les noms historiques `v2.3`, `v2.4` et `v3` sont conservés en parallèle pour le moment, car le connecteur GitHub utilisé pour cette opération permet de créer et déplacer des références, mais ne fournit pas d'action de renommage ou de suppression de branche. Les branches V0.x ci-dessus pointent sur les mêmes commits que leurs branches sources au moment de leur création.
