# Audit V2.1 — points à revoir ultérieurement

Date : 23 octobre 2026  
Périmètre : commits de reprise V2.1 des 21, 22 et 23 octobre.  
Statut : **en attente — aucune modification de code demandée par cette note**.

Cette note conserve les points repérés lors d’un premier examen de l’historique Git. Les intitulés des commits indiquent des retouches successives, mais ne prouvent pas à eux seuls qu’une régression s’est produite. Une comparaison détaillée du code et des tests fonctionnels reste nécessaire.

## 1. Minimap BPMN — priorité haute

Commits à examiner notamment :
- `38503b0` — ouverture de la minimap après import du diagramme ;
- `d79370a`, `392aca8` — minimap fermée par défaut ;
- `cd51edf` — synchronisation du bouton avec le service minimap ;
- `37575a4` — préservation du comportement précédemment validé.

À vérifier :
- la minimap reste fermée à l’ouverture d’un processus ou après import ;
- le bouton permet toujours de l’afficher et de la masquer manuellement ;
- aucun changement n’a réintroduit une ouverture automatique.

## 2. Hauteur et alignement des panneaux — priorité haute

Commits à examiner notamment :
- `3cbb4f8` — alignement des panneaux ;
- `11c20d6`, `156c2ae` — hauteur complète et contrainte à la fenêtre ;
- `ca5b70a` — panneaux contenus dans la fenêtre ;
- `db1e46f` — contrainte de hauteur dans la PR #26 ;
- `77a8463` — chaîne Flex de hauteur du Viewer.

À vérifier :
- explorateur gauche, diagramme central et fiche de tâche droite restent alignés ;
- le diagramme central ne déborde pas en bas ;
- la zone BPMN conserve l’espace disponible ;
- les règles CSS et Flex successives ne se contredisent pas.

## 3. Explorateur et navigation — priorité moyenne à haute

Commits à examiner notamment :
- `c3f0981` et `c59cb8d` — retrait de l’ancienne zone « Processus et activités » ;
- `c59afd8`, `05c2941` et les commits de refactor navigation du 23 octobre — explorateur racine, fil d’Ariane et ancienne page Arborescence.

À vérifier :
- un seul parcours cohérent vers le référentiel reste actif ;
- cliquer sur un dossier développe/replie ses enfants sans changer de page ;
- le fil d’Ariane et le retour à la racine mènent au bon explorateur ;
- aucune ancienne route ne réintroduit la liste historique.

## 4. Activités d’appel BPMN — priorité moyenne à haute

Commits à examiner notamment :
- `c6cf2d4` — sélection au simple clic ;
- `4ec6460` — distinction simple clic / double-clic ;
- `486a08f`, `155b6f3`, `4c7c3a3` — indicateur de lien et curseur.

À vérifier :
- le simple clic sélectionne l’activité sans naviguer ;
- le double-clic ouvre le processus appelé ;
- l’indicateur bleu apparaît uniquement pour l’activité cliquée ;
- le curseur indique correctement les activités réellement navigables ;
- la résolution de la cible évite les doublons et fonctionne aussi depuis Récents/Favoris.

## 5. Récents et favoris

Commits à examiner :
- `c5ce338`, `4d095fe` — résolution des processus appelés dans la liste Récents/Favoris.

À vérifier :
- les processus appelés apparaissent quand ils sont attendus ;
- un même processus n’apparaît pas en double ;
- les identifiants d’élément d’arbre et de ressource sont traités correctement.

## Méthode de reprise

Pour chaque sujet :
1. comparer le code avant et après les commits concernés ;
2. déterminer si les changements sont **redondants**, **contradictoires** ou **complémentaires** ;
3. identifier le dernier comportement fonctionnel validé ;
4. ne modifier le code qu’en présence d’un problème confirmé ;
5. relancer le CI et tester les interactions concernées dans le navigateur.

**Décision actuelle :** pause du développement. Cette note sert de liste de contrôle pour une reprise ultérieure ; elle ne demande ni fusion ni déploiement.
