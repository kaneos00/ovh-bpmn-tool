# Refonte UX de l'administration — préparation V0.10

**Statut :** cadrage uniquement — aucun développement fonctionnel engagé.

**Priorité actuelle :** fiabilisation de la V0.8. Cette préparation ne doit ni modifier ni retarder la stabilisation.

## Objectif
Simplifier l'administration de KHI Flows en clarifiant les périmètres, en regroupant les fonctions cohérentes et en proposant une navigation orientée tâches. Il s'agit d'abord d'une refonte de l'information et des parcours, pas d'une réécriture métier.

## Principes
- Séparer explicitement administration générale et administration d'un projet.
- Conserver la distinction entre droits globaux, rôles projet et affectations/postes organisationnels.
- Regrouper les écrans par domaine métier plutôt que présenter toutes les rubriques au même niveau.
- Réutiliser autant que possible routes, API, données et contrôles d'accès existants.
- Préserver les liens profonds utiles par compatibilité ou redirection.
- Ne pas modifier le modèle de données sans besoin démontré.

## Architecture cible proposée

### Administration générale
- **Vue d'ensemble** : indicateurs et raccourcis.
- **Utilisateurs et accès** : comptes connus, accès globaux et accès aux projets. Ne pas présenter les seuls utilisateurs connus via les adhésions projet comme un annuaire exhaustif.
- **Organisation** : organigramme, postes permanents, affectations et fiches de fonction, regroupés dans un même espace.
- **Portefeuille de projets** : projets, responsables, membres et accès.
- **Référentiel commun** : processus communs, variantes, usages transverses et gouvernance, sous réserve de confirmer le périmètre fonctionnel exact.

### Administration d'un projet
Toujours afficher clairement le projet concerné.
- Présentation et paramètres du projet.
- Membres et rôles du projet.
- Organisation propre au projet et rôles spécifiques.
- Acteurs et RACI.
- Processus du projet, références communes et variantes.

Les rôles projet ne sont pas des rôles globaux. Les postes permanents de l'organisation ne doivent pas être dupliqués ni modifiés implicitement par une configuration projet.

## Principes d'ergonomie
- Un accueil d'administration avec des domaines clairement nommés et décrits.
- Une navigation secondaire limitée au domaine courant.
- Un indicateur de contexte persistant : administration générale ou nom du projet.
- Des parcours homogènes : liste, recherche/filtres adaptés, détail, actions.
- Des états vides, chargements, erreurs et refus d'accès explicites.
- Des actions sensibles clairement identifiées et confirmées.
- Une interface utilisable au clavier et sur petits écrans.

## Travaux à réaliser après stabilisation de la V0.8
1. Inventorier les routes, pages, actions et permissions existantes.
2. Cartographier chaque fonction existante vers la future architecture et repérer les doublons ou lacunes.
3. Concevoir des maquettes basse fidélité : accueil général, espace Organisation, administration d'un projet.
4. Décrire les principaux parcours et états particuliers.
5. Valider la matrice des droits global/projet.
6. Définir les correspondances anciennes/nouvelles routes.
7. Découper l'implémentation en lots avec tests de non-régression.

## Hors périmètre
- Aucun changement de code applicatif dans cette phase.
- Aucun changement de modèle de données ou de règles métier.
- Aucune refonte du viewer ou du modeleur BPMN.
- Aucun déploiement ni migration.
- Aucun démarrage du chantier avant validation de la V0.8.

## Critères d'acceptation de la future refonte
- La distinction entre administration générale et administration projet est immédiatement compréhensible.
- Chaque fonction existante a une destination identifiée ; aucune capacité n'est supprimée silencieusement.
- Les rôles globaux, rôles projet et affectations organisationnelles restent distincts.
- Les permissions restent contrôlées côté API.
- Les anciennes URL utiles sont compatibles ou redirigées et testées.
- Les parcours principaux et les états vides/erreurs/absence de droits sont couverts par des tests.

## Stratégie de versionnement
- La branche de préparation V0.10 conserve uniquement ce cadrage.
- La V0.8 continue sur sa branche de stabilisation, sans cherry-pick de ce chantier.
- Après validation de la V0.8, reprendre ce cadrage, créer les tickets détaillés puis une branche de développement V0.10 depuis la base stabilisée.
- Intégrer les évolutions via PR et CI ; aucun déploiement sans demande explicite.


## Cadrages fonctionnels associés

- [Postes, fiches de poste, rôles, activités, tâches et RACI](../functional/postes-roles-activites-raci.md) : définitions, articulation des notions et exemple détaillé de chef de projet, notamment la séparation entre pilotage projet et avant-vente.
