# Tickets à corriger ou à valider

Dernière mise à jour : 26 octobre 2026. Recette navigateur utilisateur du 26/10/2026 intégrée. Correction prioritaire demandée le 26/10/2026 : ticket 29 uniquement (à la place du ticket 39, erreur de numéro signalée par l'utilisateur). Le ticket 46 est reporté jusqu'à la fin du ticket 29. Les tickets 13 et 10 restent hors périmètre ; le ticket 10 reste explicitement en pause.

## A. Correctifs V2.1 et régressions à fermer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 5 | Panneau de détail droit fermé par défaut ; clic sur son titre pour ouvrir/fermer ; sélection d'un élément BPMN ouvre le détail | Oui, PR #26 et retouches associées | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Moyenne | Faible — IHM |
| 10 | Navigation dans les processus liés : simple clic sur une Call Activity ou un SubProcess BPMN replié = sélection ; double-clic = ouverture du processus cible ; le double-clic sur une tâche avec URL ouvre le lien externe | Correctif candidat présent dans le hook de navigation ; correction mise en pause à la demande de l'utilisateur | Recette navigateur du 26/10/2026 : 1) clic simple sur le SubProcess replié : OK ; 2) double-clic sur le SubProcess replié : NOK ; 3) double-clic sur la Call Activity : OK ; 4) réactivité/sélection : jugée acceptable (« ça va ») | ⏸️ **Mis en pause — ne pas poursuivre cette correction pour le moment**. Conserver le constat du double-clic SubProcess NOK pour reprise ultérieure ; ne pas engager de nouvelle modification maintenant | Difficile | Moyen — plusieurs IHM / navigation |
| 11 | Flèche bleue de lien externe ou d'appel visible uniquement après clic sur l'élément concerné ; curseur cohérent avec une cible réellement navigable | Style commun et position bas-droite appliqués aux flèches URL/appel ; masquage CSS renforcé pour la flèche native fantôme | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** ; conserver ce comportement lors des corrections de navigation | Moyenne | Faible — IHM |
| 13 | Navigation entre processus sans rechargement complet de la page et sans clignotement non nécessaire | Non résolu | Recette utilisateur du 26/10/2026 : KO, le passage d'un processus à l'autre recharge encore la page | 🔴 **KO confirmé — à traiter séparément**. Diagnostiquer la navigation (lien natif, routeur, remount du shell) et ajouter un test vérifiant l'absence de rechargement complet. Ne pas traiter ce ticket dans le lot du ticket 39 | Difficile | Fort — navigation centrale / architecture Viewer |

## C. Référentiel et explorateur en arborescence graphique

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 23 | Dans le conteneur gauche `/html/body/div[1]/div/div[1]`, conserver un seul explorateur avec Arborescence, Récents et Favoris ; retirer la liste séparée « Processus et activités » | Partiel | Explorateur repositionné, ancienne navigation encore accessible dans certains cas | **À terminer** avec les points 6 à 8 ; éviter deux arbres/listes concurrents | Moyenne | Moyen — plusieurs IHM |
| 24 | Mettre le panneau explorateur à gauche au même niveau visuel que le panneau de détail droit, avec une structure et un style cohérents | Partiel | Position de l'explorateur déclarée correcte ; cohérence complète à retester | **À retester** : alignement, bordures, hauteur, largeur, coins carrés et états repliés | Facile | Faible — IHM |

## D. Hiérarchie des processus, rôles et responsabilités

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 29 | Dans l'explorateur, placer sous chaque processus parent les processus référencés par ses Call Activities et SubProcess BPMN repliés | Correction d'extraction candidate présente ; échec fonctionnel encore constaté | Recette utilisateur du 26/10/2026 : KO. Le double-clic navigue vers le processus cible mais l'affichage échoue avec `can't access property "id", e is undefined` | 🔴 **KO confirmé — priorité de correction actuelle**. Reproduire l'erreur de chargement du diagramme et identifier la référence/objet indéfini (`can't access property "id", e is undefined`). Corriger et ajouter un test de non-régression. Ne pas toucher aux tickets 13, 46 ou 10 pendant ce travail | Difficile | Moyen — plusieurs IHM / backend |

## E. Couleurs BPMN, recherche et données

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 35 | Colorer les événements de début/Start en vert et les événements de fin/End en rouge | Oui : marqueurs Viewer/éditeur et styles dédiés ; contrat de non-régression vérifie les marqueurs Start/End et leurs contours colorés | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Facile | Faible — IHM |
| 36 | Colorer les Data Store et Data Object Reference en orange et permettre de les lier ou pointer vers l'outil associé | Oui : marqueurs Viewer/éditeur, styles orange, champ URL et flèche sur l'élément sélectionné | Recette utilisateur du 26/10/2026 : OK, y compris l'affichage des éléments et des liens | ✅ **Validé par recette navigateur le 26/10/2026**. La flèche reste positionnée à droite | Moyenne | Moyen — IHM / données |

## F. Modèles BPMN et export documentaire

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 42 | Donner aux gateways BPMN (Exclusive, Parallel, Inclusive, Complex et Event-Based) un contour et un motif intérieur violets cohérents ; badge du panneau droit violet également, sans modifier les remplissages existants | Style commun présent pour les types de passerelles | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Facile | Faible — IHM |
| 43 | Afficher dans le panneau droit, juste sous l’identifiant de l’élément sélectionné, un descriptif pédagogique du rôle de son type BPMN | Code présent pour les principaux types BPMN | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Facile | Faible — IHM |
| 46 | Recherche d'annotations BPMN : afficher « Description » pour une annotation, rechercher son texte et sélectionner/surligner l'élément BPMN correspondant au clic, dans le processus courant ou après navigation vers un autre processus | Correctif candidat présent : libellé « Description », indexation du texte des TextAnnotation et résolution des IDs dans le registre du diagramme courant | Recette utilisateur du 26/10/2026 : KO. Le résultat de recherche ouvre le bon processus, mais l'élément n'est pas sélectionné | ⏸️ **Reporté après le ticket 29**, conformément à la demande utilisateur. Ne pas intervenir sur le ticket 46 avant que le ticket 29 soit corrigé et retesté | Moyenne | Moyen — recherche / navigation BPMN |

## Ticket 39 — vérification de la formulation des actions (hors priorité actuelle)

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 39 | Ajouter un mécanisme de vérification de la formulation des actions BPMN, pour aider à identifier les libellés ambigus ou mal formulés | Non confirmé ; ticket promu en priorité de développement à la demande de l'utilisateur | Aucun test exécuté | ⏸️ **Hors périmètre actuel** : l'utilisateur a corrigé sa demande ; la priorité est le ticket 29. Ne pas développer le ticket 39 tant que la priorité n'a pas été redéfinie | Difficile | Fort — qualité métier / IHM |

## Identifiant de version déployée

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 49 | Afficher un identifiant unique et fiable de la version réellement déployée, afin de distinguer sans ambiguïté les builds testés dans l'instance | Implémentation candidate ajoutée : badge discret dans l'application ; Dockerfile calcule un identifiant source si Coolify ne fournit pas de SHA Git ; Compose transmet `VITE_BUILD_ID` | CI en cours ; recette navigateur après déploiement nécessaire | 🟡 **À vérifier après CI et déploiement de test** : confirmer que le badge `Build …` apparaît en bas à droite, que l'identifiant est stable pour le même contenu et change quand le code source change ; si Coolify fournit `VITE_BUILD_COMMIT`, le commit est affiché en priorité | Moyenne | Faible — IHM / configuration de build |


## Règles de suivi

- Conserver les numéros de tickets existants.
- Indiquer le commit et le résultat concret du test lors de chaque mise à jour.
- Ne pas déclarer un point validé sur la seule base de la CI.
