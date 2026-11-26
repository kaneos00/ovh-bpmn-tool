# Organigramme par projet — décision fonctionnelle et d'architecture

**Statut :** décision de cadrage V0.10  
**Objectif :** permettre à chaque projet de disposer de sa propre organisation graphique, composée à partir du référentiel commun et de postes spécifiques, sans recopier ni modifier l'organisation générale.

## 1. Principe

L'organisation projet est une **composition contextualisée** du socle organisationnel commun. Ce n'est ni une copie de l'organigramme général, ni une nouvelle organisation globale.

Un projet peut :
- mobiliser un poste permanent existant ;
- mobiliser plusieurs postes communs ;
- créer un poste/rôle spécifique au projet ;
- affecter des personnes à ces postes/rôles ;
- attribuer une ou plusieurs missions à chaque personne ;
- définir une hiérarchie ou des liens de coordination propres au projet.

## 2. Les trois niveaux

1. **Commun — référentiel organisationnel :** fonctions et blocs de missions communs, postes types, fiches de poste de référence, compétences et niveaux attendus.
2. **Organisation générale :** directions/services ou unités, postes occupés ou vacants, titulaires et responsables hiérarchiques.
3. **Projet — organisation graphique dédiée :** postes communs mobilisés, postes spécifiques, titulaires, missions projet et relations propres au projet.

## 3. Composition et héritage

- Les postes permanents restent définis une seule fois dans organization_positions et leurs relations générales dans organization_position_relations.
- Un projet réutilise un poste permanent via project_job_positions.organizationPositionId.
- Un poste de projet sans organizationPositionId est spécifique à ce projet.
- Plusieurs projets peuvent référencer le même poste permanent.
- Le titre, la description, les missions confiées et les relations de projet précisent le contexte sans modifier la fiche de référence.
- Les adaptations locales doivent être identifiées comme telles ; elles ne doivent pas réécrire silencieusement le référentiel commun.
- Une personne peut occuper plusieurs postes et recevoir plusieurs missions projet. L'affectation projet doit être explicite, datée et historisable.

## 4. Vue graphique attendue

La vue d'organisation projet est une représentation graphique navigable, pas seulement une liste ou une table.

Chaque nœud représente un poste/rôle projet et peut afficher :
- intitulé du poste ;
- indicateur « commun » ou « spécifique au projet » ;
- personne(s) affectée(s), ou « vacant / non affecté » ;
- missions confiées ;
- éventuellement un résumé des responsabilités RACI après raccordement.

Les liens représentent la hiérarchie ou la coordination dans le projet. Ils sont indépendants des liens hiérarchiques permanents.

Interactions attendues :
- sélectionner un nœud pour ouvrir son panneau de détail ;
- ajouter un poste commun depuis le référentiel ;
- créer un poste spécifique au projet ;
- affecter une personne ;
- attribuer/modifier les missions ;
- créer ou modifier une relation hiérarchique projet ;
- distinguer visuellement les postes communs et spécifiques ;
- filtrer ou replier les branches pour garder une vue lisible.

La vue projet ne doit afficher que les postes réellement mobilisés, pas l'intégralité de l'organigramme de l'entreprise.

## 5. Affectations et missions

Ne pas confondre :
- **affectation organisationnelle** : personne titulaire d'un poste permanent ;
- **affectation projet** : personne mobilisée sur un poste/rôle dans un projet ;
- **mission projet** : contribution ou bloc de missions confié à cette personne ;
- **RACI** : responsabilité effective sur une tâche/activité.

L'affectation projet relie une personne existante (identité ProjectContext) à un ProjectJobPosition, avec dates et statut. Les missions sont rattachées à cette affectation et peuvent référencer un ou plusieurs blocs du référentiel commun, avec possibilité d'une description spécifique au projet.

Un poste projet n'implique pas que son titulaire porte toutes les responsabilités associées à ce poste dans tous les processus. Le RACI demeure explicite.

## 6. Relations hiérarchiques projet

Ajouter des relations propres au projet entre les project_job_positions :
- parent et enfant ;
- ordre d'affichage ;
- unicité du parent hiérarchique selon la règle MVP retenue ;
- contrôle anti-cycle ;
- possibilité d'absence de parent pour un rôle rattaché directement à la gouvernance projet.

Une relation créée dans un projet ne modifie jamais organization_position_relations.

## 7. Articulation future avec BPMN et RACI

- Une Lane BPMN peut être associée à un poste/rôle projet ou à un acteur externe.
- Les tâches de la Lane peuvent être proposées pour rattachement aux blocs de missions compatibles.
- Une Lane peut contenir plusieurs blocs de missions : le rattachement tâche ↔ bloc reste explicite.
- Les processus communs et spécifiques au projet sont tous pris en compte.
- Les mappings doivent référencer les identifiants stables de processus, ressource, élément BPMN et bloc.
- Le RACI existant reste la source de vérité pour R/A/C/I ; il ne doit pas être reconstruit depuis l'organigramme.

## 8. Réutilisation technique V0.10

| Besoin | Existant | Décision |
|---|---|---|
| Poste commun | OrganizationPosition | Réutiliser |
| Lien poste projet → poste commun | ProjectJobPosition.organizationPositionId | Réutiliser |
| Poste spécifique projet | ProjectJobPosition sans lien permanent | Réutiliser |
| Titulaire du poste permanent | OrganizationAssignment | Réutiliser pour l'organisation générale |
| Affectation nominative projet | Pas de lien complet identifié | Ajouter |
| Hiérarchie projet | Non identifiée dans le modèle inspecté | Ajouter une relation dédiée |
| Affichage graphique projet | Design documenté, réalisation à confirmer | Développer en réutilisant la bibliothèque graphique déjà présente |

## 9. Règles de non-régression

1. Une modification de la fiche de poste commune est visible dans les projets qui la référencent, sous réserve de règles de version applicables.
2. Une relation hiérarchique projet ne modifie jamais l'organisation permanente.
3. Un projet ne copie pas les données de référence pour créer un doublon.
4. Un poste spécifique projet ne devient pas automatiquement un poste commun.
5. Les affectations et missions projet sont historisables.
6. Les changements de titulaire ne réécrivent pas les entrées RACI ni les XML BPMN.
7. Le viewer BPMN n'est pas modifié dans la première tranche Organisation.

## 10. Découpage de réalisation

1. Stabiliser le référentiel commun, les blocs de missions, les fiches de poste et les compétences.
2. Finaliser l'organisation générale et ses vues graphiques.
3. Ajouter les affectations nominatives projet et les missions confiées.
4. Ajouter les relations hiérarchiques et l'organigramme graphique projet.
5. Raccorder ultérieurement les Lanes, tâches BPMN et RACI.

**Décision :** l'organisation projet est une composition graphique, héritant du référentiel commun et pouvant accueillir des postes spécifiques. Elle reste indépendante de l'organigramme général.
