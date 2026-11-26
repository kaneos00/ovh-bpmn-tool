# Projet de référence KHI-FLOWS — ESN NovaSys

## Finalité

Ce projet est le référentiel métier stable pour les démonstrations, les tests manuels, les tests de non-régression et la validation des nouvelles fonctionnalités KHI-FLOWS. Il est volontairement indépendant des projets de démonstration historiques.

- Projet : **Référence métier — ESN NovaSys**
- Identifiant stable : `8a000000-0000-4000-8000-000000000001`
- Société fictive : ESN NovaSys
- Données : entièrement fictives
- Ressources et identifiants : espace de noms réservé au référentiel
- Aucun lien de partage, de variante ou de processus commun avec les projets existants

## Périmètre métier

| Famille | Processus |
|---|---|
| Gouvernance et pilotage | GOV01 Piloter l'entreprise et les capacités<br>GOV02 Gérer une opportunité et contractualiser<br>GOV03 Piloter un projet client<br>GOV04 Gérer les commandes clients et la facturation |
| Ressources humaines | HR01 Recruter un collaborateur<br>HR02 Établir et signer le contrat de travail<br>HR03 Réaliser l'intégration d'un collaborateur<br>HR04 Commander et attribuer un équipement<br>HR05 Gérer les affectations aux projets<br>HR06 Gérer les absences et congés<br>HR07 Réaliser les entretiens et évaluations<br>HR08 Gérer les formations et compétences |
| Finance et administration | FIN01 Traiter les notes de frais<br>FIN02 Préparer et exécuter la paie<br>FIN03 Acheter un bien ou un service<br>FIN04 Suivre le temps et la rentabilité projet |
| Systèmes d'information internes | IT01 Traiter un ticket de support interne<br>IT02 Gérer le parc et le cycle de vie matériel<br>IT03 Gérer les accès et habilitations<br>IT04 Gérer les sauvegardes et restaurations |
| Conception et réalisation logicielle | DEL01 Recueillir et valider les exigences client<br>DEL02 Concevoir et développer un logiciel<br>DEL03 Réaliser les tests internes<br>DEL04 Organiser la recette et l'acceptation client<br>DEL05 Déployer et livrer une version |
| Maintenance des logiciels livrés | MNT00 Gérer le service et la maintenance du logiciel<br>MNT01 Prendre en charge un logiciel livré<br>MNT02 Traiter les incidents et demandes clients<br>MNT03 Réaliser une maintenance corrective<br>MNT04 Gérer une demande d'évolution<br>MNT05 Gérer une version et une mise en production<br>MNT06 Réaliser la revue périodique de service<br>MNT07 Clôturer la maintenance et organiser la réversibilité |

Le processus parent « Gérer le service et la maintenance du logiciel » appelle explicitement les processus enfants de prise en charge, support client, maintenance corrective, évolutions, mise en production, revue de service et réversibilité.

## Données structurantes

- Arborescence de ressources et processus BPMN publiés avec identifiants stables.
- Projet avec rôle administrateur affecté à `DEMO_AUTH_USER`.
- Acteurs RACI propres au projet et affectations R/A/C par activité, avec une répartition adaptée aux familles de processus.
- Références de données persistantes BPMN (`DataStoreReference`) vers les applications et bases fictives, en plus des objets documentaires (`DataObjectReference`).
- Informations documentées de type fichier, application et base de données, avec métadonnées de conservation, accès et données personnelles.
- Associations BPMN des objets de données au registre des informations documentées.
- Applications fictives : ITSM, ERP, SIRH, CMDB, dépôt Git, CI/CD, supervision et base documentaire.

## Réinitialisation

Ce jeu de données n'est **pas** ajouté au démarrage automatique de la démonstration existante. Il faut l'exécuter explicitement sur la base voulue, après application des migrations.

1. Exécuter `seed.sql` avec la variable psql `demo_user` définie sur l'identifiant de `DEMO_AUTH_USER`.
2. Pour remettre uniquement le référentiel à zéro, exécuter `reset.sh` avec `CONFIRM_REFERENCE_PROJECT_RESET=YES`.
3. Réexécuter `seed.sql`.

Le script de remise à zéro cible le seul projet par son UUID stable, ses tables liées, l'arborescence de ressources sous son dossier racine et les ressources actuellement affectées au projet. Il capture aussi les ressources ajoutées pendant les essais. Les ressources encore référencées par un autre projet sont conservées, avec leur contenu ; les ressources non partagées sont supprimées de la feuille vers la racine. Il ne supprime aucun autre projet ni les graines historiques. Toujours vérifier la base ciblée avant confirmation.

## Contrat de non-régression

Toute évolution fonctionnelle importante doit être vérifiée au minimum sur :

- ouverture du projet, navigation dans l'arborescence et affichage des processus ;
- ouverture, édition et publication des BPMN ;
- appels de processus parent/enfant et résolution des références ;
- RACI : acteurs, activités et rôles ;
- informations documentées : création, affichage, association BPMN, fusion, mise à jour des liens et suppression uniquement si non référencée ;
- gestion des membres et des rôles projet ;
- cohérence après réinitialisation et réensemencement ;
- absence de modification des autres projets.

## Règles de maintenance du référentiel

- Ne pas utiliser ce projet pour des essais exploratoires destructifs persistants.
- Ne pas modifier les identifiants stables sans procédure de migration documentée.
- Toute nouvelle fonctionnalité à tester doit être ajoutée au contrat de non-régression.
- Les données réelles ou sensibles sont interdites.
- Une évolution du jeu de données doit mettre à jour simultanément le seed, le présent document et les tests de validation.
