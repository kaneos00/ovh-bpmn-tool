# Tickets vérifiés et validés

Dernière mise à jour : 26 octobre 2026. Les statuts ci-dessous reposent sur des confirmations fonctionnelles explicites. Ticket 29 ajouté après validation utilisateur sur l'instance Coolify de test.

## A. Correctifs V2.1 et régressions à fermer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 1 | Mini-carte : fermée à l'ouverture/sélection d'un processus ; ouverture/fermeture uniquement via l'action prévue (+/−) ; diagramme initial à l'échelle 1:1, en haut à gauche | Correctif ajouté : à chaque import, le Viewer appelle `setMinimapVisibility(false)`, qui ferme aussi le service minimap et pas seulement son état React ; contrat de non-régression ajouté | Confirmation utilisateur du 25/10/2026 : fonctionnement parfait | ✅ **Validé — point fermé le 25/10/2026**. Conserver le contrat automatisé de non-régression et vérifier ce comportement lors de toute modification future du Viewer/minimap | Moyenne | Faible — IHM |
| 2 | Les trois panneaux (explorateur gauche, BPMN central, détail droit) restent visibles, vont jusqu'en bas, ont la même hauteur et des coins carrés ; le BPMN garde un maximum d'espace | Oui : correctifs CSS/Flex validés sur la branche de référence `release/v2.2-reference-2026-10-24` (`6490a45`, `bf0a5e0`) | Recette Coolify du 24 octobre 2026 : l'utilisateur confirme que les trois panneaux sont visibles et descendent jusqu'en bas de la fenêtre | ✅ **Validé — point fermé le 24/10/2026**. La recette utilisateur confirme le résultat attendu ; CI verte sur le commit de référence | Moyenne | Faible — IHM |
| 3 | Boutons Retour/Suivant sur toute la largeur du bas de l'explorateur ; raccourci Ctrl+Z ; boutons masqués ou adaptés lorsque le panneau est replié | Oui, confirmé dans les commits précédents | Retour/Suivant, Ctrl+Z et affichage dans l'état replié testés OK ; fonctionnement confirmé après reconnexion | **✅ Validé — point fermé** | Facile | Faible — IHM |
| 4 | Largeur des panneaux gauche et droit réglable à la souris et mémorisée | Oui, correction présente dans les commits précédents | Redimensionnement des deux côtés et mémorisation testés OK, y compris après reconnexion | **✅ Validé — point fermé** | Moyenne | Faible — IHM |
| 6 | Retirer définitivement l'ancien panneau à l'extrême gauche et l'ancienne zone « Processus et activités » ; ne garder qu'un explorateur avec Arborescence, Récents et Favoris | Oui | Confirmation explicite de l'utilisateur le 25/10/2026 | ✅ **Validé — point fermé le 25/10/2026** | Moyenne | Moyen — plusieurs IHM |
| 7 | Dans l'explorateur de gauche, le clic sur le nom d'un dossier ouvre ses enfants sans changer de page ; le clic sur la flèche permet de replier/déplier ; les autres branches ouvertes restent ouvertes, y compris autour des Call Activities et sous-processus | Correction présente sur la branche candidate | Recette utilisateur du 25/10/2026 : l'utilisateur confirme que la navigation dans l'explorateur fonctionne | ✅ **Validé — point fermé le 25/10/2026**, sous réserve de ne pas confondre ce point avec la régression de navigation des SubProcess/Call Activities suivie au point 10 | Moyenne | Moyen — plusieurs IHM |
| 8 | Référentiel comme écran d'accueil ; bouton Home et fil d'Ariane reflètent la même hiérarchie que l'explorateur | Le fil d'Ariane réutilise l'arbre assemblé par `useFolderTree` | Recette utilisateur du 25/10/2026 : hiérarchie du fil d'Ariane confirmée OK | ✅ **Validé et fermé le 25/10/2026**. Ajouter/conserver le test de non-régression sur le chemin des dossiers imbriqués et processus liés | Difficile | Fort — navigation et layout Viewer |
| 9 | Simple clic sur un élément BPMN = sélection ; second clic sur le même élément = désélection, sans navigation involontaire | Oui : `4ec6460` distingue clic simple et double clic ; `7ac6f31` rend les lanes sélectionnables ; `c6cf2d4` préserve la sélection au clic simple sur une Call Activity | Recette utilisateur du 23/10/2026 : sélection/désélection testée sur un élément BPMN, une lane et un sous-processus ; résultat OK | **✅ Validé — point fermé**. Tests fonctionnels confirmés par l'utilisateur | Moyenne | Moyen — plusieurs IHM |
| 11 | Flèche bleue de lien externe ou d'appel visible uniquement après clic sur l'élément concerné ; curseur cohérent avec une cible réellement navigable | Styles communs des flèches URL/appel | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Moyenne | Faible — IHM |
| 12 | Récents : afficher uniquement des processus, sans dossiers, sans doublons, et ouvrir directement le processus sélectionné | Récents filtré sur les ressources de type processus ; déduplication conservée | Confirmation utilisateur du 25/10/2026 : « ok à fermer » | ✅ **Validé — point fermé le 25/10/2026** | Moyenne | Moyen — plusieurs IHM / backend |
| 14 | CI de la branche de reprise | Oui | CI Validate verte sur le commit `035ac68` (25/10/2026) ; lint/build frontend et backend, tests unitaires, contrats de non-régression, images Docker et smoke-test Compose réussis | ✅ **Validé — CI verte sur le candidat `035ac68`**. Validate : [run 1518](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40189970316) ; tests frontend : [run 226](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/40189970355), 27/27 contrats et 27/27 tests unitaires. La recette navigateur des points 1, 5, 7, 8, 10, 11, 12 et 13 reste distincte de la CI | — | Moyen — plusieurs composants |

## B. Recherche, RACI et interactions dans le Viewer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 22 | Dans le détail droit, présenter verticalement et dans l'ordre : informations de tâche, RACI, documentation ; afficher le lien externe dans la section documentation | Oui | Recette utilisateur du 23/10/2026 : point confirmé OK sur la version de référence V2.2 | ✅ **Validé — point fermé le 23/10/2026**. Référence logicielle : `ad9178b` (PR #31) | Moyenne | Faible — IHM |
| 35 | Colorer les événements de début/Start en vert et les événements de fin/End en rouge | Oui : marqueurs Viewer/éditeur et styles dédiés | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Facile | Faible — IHM |
| 36 | Colorer les Data Store et Data Object Reference en orange et permettre de les lier ou pointer vers l'outil associé | Oui : marqueurs Viewer/éditeur, styles orange, champ URL et flèche sur l'élément sélectionné | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Moyenne | Moyen — IHM / données |
| 42 | Contour et motif intérieur violets pour les passerelles BPMN, sans modifier les remplissages existants | Oui | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Facile | Faible — IHM |
| 43 | Afficher un descriptif pédagogique du type BPMN dans le panneau droit, sous l’identifiant | Oui | Recette utilisateur du 26/10/2026 : OK | ✅ **Validé par recette navigateur le 26/10/2026** | Facile | Faible — IHM |


## C. Édition depuis le Viewer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 50 | Modification de la description d'un élément BPMN depuis la fiche du Viewer pour les rôles admin/modélisateur | Oui : édition et sauvegarde via l'API de contenu existante | Recette utilisateur sur Coolify après déploiement manuel du commit `78afca4` : fonctionnement confirmé | ✅ **Validé par recette utilisateur le 26/10/2026**. L'anomalie d'affichage de l'identifiant de commit à côté de « FHI Flow » est suivie séparément dans le ticket #84 ; elle n'empêche pas la validation de cette fonctionnalité | Moyenne | Moyen — édition BPMN / panneau droit |

## D. Hiérarchie des processus — tickets clôturés

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 29 | Dans l'explorateur, placer sous chaque processus parent les processus référencés par ses Call Activities et SubProcess BPMN repliés | Oui : résolution des processus liés et remontage du `ProcessViewer` à chaque changement de processus/version | CI vert sur le commit `2a246869`; validation utilisateur sur Coolify le 26/10/2026 : le diagramme cible s'affiche sans l'erreur `can't access property "id", e is undefined` | ✅ **Validé et clôturé le 26/10/2026** | Difficile | Moyen — plusieurs IHM / backend |


## Règles de suivi

- Conserver les numéros de tickets existants.
- Indiquer le commit et le résultat concret du test lors de chaque mise à jour.
- Ne pas déclarer un point validé sur la seule base de la CI.
