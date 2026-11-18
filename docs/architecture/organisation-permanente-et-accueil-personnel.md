# Organisation permanente, responsabilités projet et accueil personnel

## 1. Objectif

Cette évolution complète Job Architecture par une représentation de l'organisation permanente de l'entreprise, puis relie cette organisation aux postes propres aux projets, aux responsabilités RACI et aux activités BPMN.

Première approche : un organigramme permanent unique pour l'entreprise. Les projets précisent ou complètent les responsabilités opérationnelles sans créer un second organigramme ni modifier la structure permanente.

Résultat attendu : une vue Organisation graphique et navigable, ainsi qu'une page d'accueil personnelle réunissant poste, rattachement, projets et responsabilités.

## 2. Principes structurants

1. La fiche de fonction reste un référentiel générique, indépendant des personnes et des projets.
2. Le poste permanent représente une place durable dans l'organisation.
3. Le poste projet est la déclinaison d'un poste permanent dans un projet, ou un rôle spécifique sans équivalent permanent.
4. L'affectation d'une personne à un poste est datée et historisée.
5. Les relations hiérarchiques relient des postes, jamais directement des personnes.
6. Les acteurs et lignes RACI restent la propriété de ProjectContext ; les XML BPMN et processus restent la propriété de leurs modules.
7. Les liens vers RACI et BPMN réutilisent les mappings explicites de Job Architecture.
8. Remplacer un titulaire ne modifie ni RACI, ni processus, ni XML BPMN.
9. Les responsabilités projet complètent l'organisation permanente sans modifier l'organigramme.
10. Les administrations restent ciblées par domaine, avec grilles éditables, filtres et opérations groupées adaptées.

## 3. Objets métier

| Objet | Portée | Rôle |
|---|---|---|
| Fiche de fonction (JobFunction) | Référentiel | Missions, activités et compétences de référence |
| Poste permanent | Entreprise | Place dans l'organisation, fonction de référence et rattachement |
| Affectation | Entreprise / période | Personne affectée à un poste, avec dates et statut |
| Fiche de poste individuelle | Personne / période | Objectifs, compétences détenues/évaluées, conditions et délégations |
| Poste projet (ProjectJobPosition) | Projet | Déclinaison d'un poste permanent ou rôle spécifique |
| Acteur RACI (ProjectRaciActor) | Projet | Rôle fonctionnel, jamais un titulaire |
| Ligne RACI (ProjectRaciEntry) | Projet / activité | Responsabilité R, A, C ou I |
| Mapping RACI (PositionRaciActorMapping) | Projet | Correspondance poste projet ↔ acteur RACI existant |
| Mapping activité (PositionActivityMapping) | Projet / BPMN | Correspondance poste projet ↔ activité BPMN ↔ bloc de compétence |

Les objets techniques existants sont conservés. Les nouveaux objets permanents doivent être isolés dans un bounded context Organisation, après vérification de la structure du dépôt.

## 4. Modèle relationnel cible

~~~text
JobFunction (référentiel)
      |
      +------------------------------+
      |                              |
      v                              v
Poste permanent A               Poste permanent B
      |                              |
      +--- rattachement hiérarchique-+
      |
      +--- Affectation personne (début / fin / statut)
      |          |
      |          +--- Fiche de poste individuelle
      |
      +--- Déclinaison dans projet A
      |          |
      |          +--- ProjectJobPosition
      |                    |
      |                    +--- mapping vers acteur RACI
      |                    |        -> ProjectRaciActor
      |                    |        -> ProjectRaciEntry (R/A/C/I)
      |                    |
      |                    +--- mapping vers activités BPMN publiées
      |
      +--- Déclinaison dans projet B

Poste projet spécifique sans poste permanent : reste possible.
~~~

### 4.1 Poste permanent

Attributs minimaux : identifiant stable, intitulé, description/périmètre, référence facultative à une fiche de fonction, état actif/inactif et ordre d'affichage. Un poste n'est pas une personne ; plusieurs postes peuvent référencer la même fiche de fonction.

### 4.2 Hiérarchie

La hiérarchie relie des postes permanents. Première version : zéro ou un responsable hiérarchique direct par poste ; un poste peut encadrer plusieurs postes. Refuser l'auto-rattachement et les cycles. Les changements de rattachement doivent être traçables. Les liens fonctionnels transverses sont distincts et pourront être ajoutés plus tard.

### 4.3 Affectation nominative

L'affectation relie une clé utilisateur fiable à un poste permanent pour une période : date de début, date de fin facultative, statut et historique. Les règles de chevauchement doivent être explicites.

Il faut distinguer identité authentifiée, membre d'un projet et personne du référentiel Organisation. L'administration actuelle agrège des identifiants connus via les adhésions projet, mais cela ne constitue pas un annuaire global. Avant l'affectation nominative en production, choisir une source d'identité de référence (SSO/OIDC ou référentiel utilisateur applicatif) et une clé stable. Ne pas créer de personnes à partir d'un simple nom affiché.

### 4.4 Fiche de poste individuelle

Elle référence une affectation et peut contenir objectifs individuels, période d'évaluation, compétences détenues/évaluées, conditions particulières, délégations, aménagements, responsable de suivi et dates de validation. Elle ne constitue pas un SIRH complet. Paie, congés et données médicales sont hors périmètre.

### 4.5 Pont vers les postes projet

Ajouter une référence facultative du poste projet vers un poste permanent. Un poste permanent peut être décliné dans plusieurs projets ; plusieurs postes projet peuvent dériver du même poste permanent ; un poste projet spécifique peut n'avoir aucun poste permanent. Le titre et le périmètre restent contextualisables. Les mappings RACI/BPMN restent attachés au poste projet.

Ne pas remplacer ProjectJobPosition, PositionRaciActorMapping ou PositionActivityMapping par des objets concurrents.

## 5. Chaîne de responsabilité et accueil personnel

~~~text
Utilisateur authentifié
  -> affectation active
  -> poste permanent
  -> déclinaisons ProjectJobPosition
  -> acteurs RACI mappés
  -> lignes RACI R/A/C/I
  -> activités BPMN / tâches pertinentes
  -> cartes et raccourcis de l'accueil
~~~

L'accueil présente :
- **Mes tâches / responsabilités** : activités issues des lignes RACI, en distinguant R, A, C et I ;
- **Mes projets** : projets accessibles et rôle projet ;
- **Mon organisation** : poste permanent, responsable et équipe ;
- **Ma fiche de poste** : missions, objectifs et compétences si une fiche individuelle existe.

Ne pas afficher comme tâche personnelle une activité sans chaîne explicite affectation → poste permanent → poste projet → acteur RACI → ligne RACI. Distinguer R/A de C/I. Prévoir des états vides explicites. Respecter les droits projet lors de toute agrégation et navigation. Si plusieurs affectations actives sont permises, rendre le contexte visible.

## 6. Expérience utilisateur

### 6.1 Vue Organisation

Vue graphique de l'organigramme permanent avec des nœuds compacts affichant intitulé du poste, titulaire ou « Poste vacant », et éventuellement la fonction. Navigation vers le poste, la fiche de fonction, le titulaire et les projets associés. Prévoir zoom, déplacement, recentrage et ajustement à l'écran. Distinguer visuellement poste occupé, vacant et inactif ; les liens hiérarchiques doivent être distincts des futurs liens fonctionnels.

React Flow est proposé pour le graphe interactif et ELK.js pour la disposition hiérarchique automatique. Vérifier leur compatibilité avec les versions React/build existantes avant d'ajouter les dépendances. Le placement automatique doit être déterministe.

### 6.2 Administration

Prévoir des écrans séparés pour postes permanents, affectations, hiérarchie et fiches individuelles. Préférer des grilles AG Grid éditables, filtres intégrés, sélection multiple et opérations groupées (affecter, désactiver, réorganiser, supprimer uniquement si autorisé). Le détail s'ouvre dans un panneau latéral, pas dans une longue page sous la liste.

Ne pas ajouter la création de projets ni des champs hors sujet dans la gestion des postes. La gestion des projets reste dans son écran existant.

## 7. Propriété des données

| Donnée | Module propriétaire | Rôle d'Organisation |
|---|---|---|
| Identité / session | Authentification / fournisseur d'identité | Référence une clé stable |
| Membres et rôles projet | ProjectContext | Lit les droits existants |
| Fiches de fonction et compétences | Job Architecture | Réutilise le référentiel |
| Postes permanents et hiérarchie | Organisation à créer | Source de vérité |
| Affectations nominatives | Organisation à créer | Source de vérité temporelle |
| Postes projet | Job Architecture | Référence facultativement un poste permanent |
| Acteurs et lignes RACI | ProjectContext | Lit et mappe sans réécriture |
| Processus et XML BPMN | Modules existants | Référence les activités stables/publiées |
| Accueil personnel | Frontend / agrégateur | Agrège les données autorisées |

## 8. Phasage recommandé

### Phase 0 — cadrage et contrats
- Confirmer le modèle métier et les frontières entre modules.
- Vérifier la source d'identité stable.
- Inventorier routes, entités et écrans de l'accueil existant.
- Définir les droits d'accès et la conservation.

### Phase 1 — organisation permanente
- Créer le référentiel des postes permanents.
- Créer les relations hiérarchiques avec validation anti-cycle.
- Réaliser la vue organigramme.
- Relier les postes aux fiches de fonction lorsque pertinent.
- Fournir les écrans d'administration ciblés.

### Phase 2 — affectations nominatives
- Choisir la clé d'identité fiable.
- Gérer les affectations datées et leur historique.
- Afficher titulaires et postes vacants.
- Protéger les données personnelles par des permissions explicites.

### Phase 3 — pont projets / RACI / BPMN
- Ajouter la référence facultative poste permanent sur ProjectJobPosition.
- Conserver les postes projet spécifiques.
- Réutiliser les mappings RACI/BPMN existants.
- Compléter les diagnostics sans modifier les sources.

### Phase 4 — accueil personnel
- Construire un agrégateur sécurisé.
- Présenter Mes tâches, Mes projets, Mon organisation et Ma fiche de poste.
- Couvrir états vides et tests de permissions.

### Phase 5 — fiche individuelle enrichie
- Ajouter objectifs, compétences détenues/évaluées, délégations et conditions.
- Ajouter historique, validation et éventuels exports après validation métier.

## 9. Hors périmètre de la première livraison

- Paie, congés, temps de travail et dossier RH complet.
- Données médicales ou sensibles.
- Synchronisation SIRH externe.
- Multi-entités juridiques ou multi-organigrammes.
- Liens fonctionnels complexes et matrice de délégations avancée.
- Réécriture des tables RACI ou des XML BPMN.
- Modification du viewer BPMN.
- Déploiement automatique en production.

## 10. Critères d'acceptation

- [ ] Un poste permanent existe indépendamment de son titulaire.
- [ ] Plusieurs postes peuvent référencer une même fiche de fonction.
- [ ] L'organigramme relie des postes et refuse les cycles.
- [ ] Un poste vacant reste visible et navigable.
- [ ] Les affectations ont une période, un historique et une clé d'identité stable.
- [ ] Un poste projet peut référencer un poste permanent ou rester spécifique.
- [ ] Les données RACI et XML BPMN ne sont ni dupliquées ni réécrites.
- [ ] Le remplacement d'un titulaire ne change aucun mapping RACI/BPMN.
- [ ] L'accueil affiche uniquement les responsabilités issues d'une chaîne explicite.
- [ ] Les permissions projet existantes sont respectées.
- [ ] Les administrations sont ciblées, filtrables et adaptées aux opérations groupées.
- [ ] Tests backend, frontend et migrations réussis avant fusion.
- [ ] Aucun déploiement sans validation explicite.

## 11. Décisions à confirmer avant implémentation

1. **Identité** : quelle source fournit l'identifiant stable des personnes ? Les adhésions projet ne constituent pas un annuaire d'entreprise.
2. **Multi-affectation** : une personne peut-elle occuper plusieurs postes permanents simultanément ?
3. **Hiérarchie** : un poste a-t-il un seul responsable hiérarchique direct dans la première version ?
4. **Droits** : quels groupes peuvent consulter l'organigramme, gérer les postes, affecter des personnes et consulter les fiches individuelles ?
5. **Accueil** : quelles activités R/A/C/I doivent apparaître comme tâches, et quels filtres de statut/date sont disponibles ?

Ces décisions doivent être traitées avant les migrations et l'exposition des données personnelles. La phase 1 peut néanmoins être conçue indépendamment d'une intégration SSO complète.