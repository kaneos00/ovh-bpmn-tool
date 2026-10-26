# Tickets à corriger ou à valider

Dernière mise à jour : 26 octobre 2026. La correction du double-clic SubProcess (ticket 10) est explicitement mise en pause ; ne pas la reprendre pour le moment.

## A. Correctifs V2.1 et régressions à fermer

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 5 | Panneau de détail droit fermé par défaut ; clic sur son titre pour ouvrir/fermer ; sélection d'un élément BPMN ouvre le détail ; état mémorisé selon le besoin validé | Oui, PR #26 et retouches associées | Contrat de non-régression ajouté sur le candidat `1c43a6c` : état fermé initial, ouverture par sélection, commandes du titre et ordre des sections | 🟡 **À tester dans le navigateur** : vérifier fermeture au démarrage, ouverture par sélection/clic, comportement lorsque les panneaux sont repliés ; la persistance de l'état ouvert/fermé n'est pas revendiquée | Moyenne | Faible — IHM |
| 10 | Navigation dans les processus liés : simple clic sur une Call Activity ou un SubProcess BPMN replié = sélection ; double-clic = ouverture du processus cible ; le double-clic sur une tâche avec URL ouvre le lien externe | Correctif candidat présent dans le hook de navigation ; correction mise en pause à la demande de l'utilisateur | Recette navigateur du 26/10/2026 : 1) clic simple sur le SubProcess replié : OK ; 2) double-clic sur le SubProcess replié : NOK ; 3) double-clic sur la Call Activity : OK ; 4) réactivité/sélection : jugée acceptable (« ça va ») | ⏸️ **Mis en pause — ne pas poursuivre cette correction pour le moment**. Conserver le constat du double-clic SubProcess NOK pour reprise ultérieure ; ne pas engager de nouvelle modification maintenant | Difficile | Moyen — plusieurs IHM / navigation |
| 11 | Flèche bleue de lien externe ou d'appel visible uniquement après clic sur l'élément concerné ; curseur cohérent avec une cible réellement navigable | Style commun et position bas-droite appliqués aux flèches URL/appel ; masquage CSS renforcé pour la flèche native fantôme | Retour utilisateur du 25/10/2026 : « OK pour le moment » pour les flèches ; régression de navigation SubProcess suivie séparément au point 10 | 🟡 **À surveiller — pas de nouvelle retouche immédiate**. Conserver les styles actuels et ajouter une vérification de non-régression en corrigeant le point 10 | Moyenne | Faible — IHM |
| 13 | Navigation entre processus sans rechargement complet de la page et sans clignotement non nécessaire | Le voile de chargement a été ajusté, mais cela ne corrige pas nécessairement les rechargements complets | Confirmation utilisateur du 25/10/2026 : « toujours des rechargements de page » | 🔴 **À diagnostiquer/corriger** : déterminer pourquoi la navigation déclenche un rechargement complet du document (navigation navigateur / routeur / liens / remount du shell) ; ajouter un test qui vérifie que le document ne recharge pas lors du passage d'un processus à l'autre. Ne pas considérer le seul masquage du voile comme une résolution | Difficile | Fort — navigation centrale / architecture Viewer |

## C. Référentiel et explorateur en arborescence graphique

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 23 | Dans le conteneur gauche `/html/body/div[1]/div/div[1]`, conserver un seul explorateur avec Arborescence, Récents et Favoris ; retirer la liste séparée « Processus et activités » | Partiel | Explorateur repositionné, ancienne navigation encore accessible dans certains cas | **À terminer** avec les points 6 à 8 ; éviter deux arbres/listes concurrents | Moyenne | Moyen — plusieurs IHM |
| 24 | Mettre le panneau explorateur à gauche au même niveau visuel que le panneau de détail droit, avec une structure et un style cohérents | Partiel | Position de l'explorateur déclarée correcte ; cohérence complète à retester | **À retester** : alignement, bordures, hauteur, largeur, coins carrés et états repliés | Facile | Faible — IHM |

## D. Hiérarchie des processus, rôles et responsabilités

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 29 | Dans l'explorateur, placer sous chaque processus parent les processus référencés par ses Call Activities et SubProcess BPMN repliés | Correction de l'extraction : les SubProcess repliés sont détectés via les références `BPMNShape@isExpanded=false` vers `bpmnElement`; résolution non ambiguë, déduplication et construction acyclique incrémentale conservées | Contrats source mis à jour ; CI à vérifier ; recette navigateur requise sur appels simples, plusieurs parents, références inconnues et cycles | 🟡 **Correctif candidat** : vérifier que les liens SubProcess apparaissent et s'ouvrent, que chaque processus n'apparaît qu'une fois et que les cycles ne masquent pas les liens valides | Difficile | Moyen — plusieurs IHM / backend |

## E. Couleurs BPMN, recherche et données

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 35 | Colorer les événements de début/Start en vert et les événements de fin/End en rouge | Oui : marqueurs Viewer/éditeur et styles dédiés ; contrat de non-régression vérifie les marqueurs Start/End et leurs contours colorés | Tests de non-régression et CI Validate verts sur `2a8a8101` ; recette navigateur multi-événements/thèmes encore nécessaire | 🟡 **Code et contrats automatisés validés — recette visuelle requise**. Vérifier le rendu réel et le contraste avant fermeture | Facile | Faible — IHM |
| 36 | Colorer les Data Store et Data Object Reference en orange et permettre de les lier ou pointer vers l'outil associé | Oui : marqueurs Viewer/éditeur, styles orange, champ URL et flèche sur l'élément sélectionné ; contrat de non-régression vérifie les deux types et la position de la flèche | Tests de non-régression et CI Validate verts sur `2a8a8101` ; persistance après sauvegarde/rechargement et ouverture réelle du lien encore à tester dans Coolify | 🟡 **Code et contrats automatisés validés — recette navigateur requise**. La flèche reste positionnée à droite ; ne pas déplacer | Moyenne | Moyen — IHM / données |

## F. Modèles BPMN et export documentaire

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 42 | Donner aux gateways BPMN (Exclusive, Parallel, Inclusive, Complex et Event-Based) un contour et un motif intérieur violets cohérents ; badge du panneau droit violet également, sans modifier les remplissages existants | Style commun présent, mais le symbole intérieur de Parallel Gateway reste noir dans la recette utilisateur | NOK signalé le 25/10/2026 : Parallel Gateway noire, Event-Based Gateway correcte | 🔴 **À corriger** : cibler le chemin SVG du symbole intérieur de Parallel Gateway et ajouter un test dédié au remplissage violet du motif, sans changer le remplissage du losange | Facile | Faible — IHM |
| 43 | Afficher dans le panneau droit, juste sous l’identifiant de l’élément sélectionné, un descriptif pédagogique du rôle de son type BPMN (ex. passerelle exclusive : choisir un seul chemin selon une condition) | Code candidat ajouté pour les principaux types BPMN : tâches, passerelles, événements, sous-processus, flux et données | Contrat source ajouté et réussi sur `035ac68` : présence des descriptions et placement sous l’identifiant ; recette navigateur non exécutée | 🟡 **Tests automatisés verts — recette navigateur requise** : vérifier le texte pour plusieurs types, notamment les différentes gateways, sans remplacer la documentation propre à l’élément | Facile | Faible — IHM |
| 46 | Recherche d'annotations BPMN : afficher « Description » pour une annotation, rechercher son texte et sélectionner/surligner l'élément BPMN correspondant au clic, dans le processus courant ou après navigation vers un autre processus | Correctif candidat présent : libellé « Description », indexation du texte des TextAnnotation et résolution des IDs dans le registre du diagramme courant | La recette utilisateur précédente signalait encore un libellé « Annotation » et une sélection qui ne fonctionnait pas ; la correction doit être vérifiée sur la version exacte testée | 🔴 **À valider / corriger si nécessaire** : identifier la version testée, reproduire le clic sur un résultat « Description », confirmer sélection et surlignage ; tester aussi les résultats inter-processus | Moyenne | Moyen — recherche / navigation BPMN |

## Identifiant de version déployée

| N° | Point / résultat attendu | Traité dans le code ? | Test fonctionnel | Statut / prochaine action | Facilité | Impact |
|---:|---|---|---|---|---|---|
| 49 | Afficher un identifiant unique et fiable de la version réellement déployée, afin de distinguer sans ambiguïté les builds testés dans l'instance | À analyser et corriger sur la branche de travail | Pas encore testé après correction | 🔴 **À corriger puis valider** : afficher un identifiant de build unique (au minimum SHA court du commit, idéalement accompagné de la date de build), injecté au build et consultable clairement dans l'application ; vérifier qu'un nouveau déploiement affiche bien le nouvel identifiant et qu'il correspond au commit déployé | Moyenne | Faible — IHM / configuration de build |


## Règles de suivi

- Conserver les numéros de tickets existants.
- Indiquer le commit et le résultat concret du test lors de chaque mise à jour.
- Ne pas déclarer un point validé sur la seule base de la CI.
