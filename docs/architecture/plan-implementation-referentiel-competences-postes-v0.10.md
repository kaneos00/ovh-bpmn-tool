# Préparation de l’implémentation — référentiel commun des compétences et fiches de poste V0.10

**Branche de cadrage :** `planning/admin-ux-v0.10`  
**Statut :** analyse technique préparatoire — aucun changement de code ni de schéma dans cette tranche.  
**Dépendance UI :** les grilles métier devront réutiliser le composant DataGrid commun après sa validation ; ne pas créer de grille parallèle.

## 1. Résultat de l’inspection du code existant

L’inspection a porté sur les modules backend `JobArchitecture` et `Organization`, leurs entités et migrations, les contrôleurs, ainsi que les écrans `JobFunctions` et `OrganizationPositions`.

### 1.1 Objets réutilisables

| Besoin | Existant | Décision préparatoire |
|---|---|---|
| Fiche/fonction de référence | `JobFunction` | Conserver comme document de référence, clarifier son intitulé métier et son lien aux postes |
| Poste permanent | `OrganizationPosition` | Conserver ; il porte déjà `functionId` nullable vers `JobFunction` |
| Affectation d’une personne à un poste | `OrganizationAssignment` | Conserver ; dates, intérim et historique sont déjà gérés |
| Hiérarchie permanente | `OrganizationPositionRelation` | Conserver |
| Sections descriptives de la fiche | `JobFunctionActivitySection` | Réutiliser pour les activités descriptives après clarification ; le champ actuel `tasks: string[]` ne doit pas devenir un second catalogue BPMN |
| Sections personnalisées | `JobFunctionCustomSection` | Conserver pour les sections complémentaires réellement nécessaires, sans les détourner pour les quatre blocs de missions |
| Référentiel de compétences | `Competency` | Réutiliser le concept, mais son modèle actuel doit évoluer pour devenir global et réutilisable |
| Blocs de compétences actuels | `CompetencyBlock` | Ne pas les assimiler automatiquement aux blocs de missions du poste : leur sémantique actuelle est celle d’un conteneur de compétences |
| Association fonction/bloc | `JobFunctionCompetencyBlock` | Réexaminer : elle associe aujourd’hui une fonction à un bloc de compétences, pas une fiche de poste à un bloc de missions contenant activités et compétences |
| Besoins de compétences d’un poste projet | `PositionCompetencyRequirement` | Conserver pour les exigences/overrides projet ; ne pas le détourner comme association permanente poste ↔ compétence |

### 1.2 Écarts confirmés dans le modèle actuel des compétences

L’entité `Competency` et la migration `20261110_v3_job_architecture.sql` confirment les limites suivantes :

1. Une compétence porte obligatoirement un `blockId` : elle appartient donc à un bloc et n’est pas aujourd’hui une définition globale indépendante.
2. Son unicité est définie par `(blockId, code)`, ce qui autorise la répétition du même code dans plusieurs blocs et ne garantit pas une compétence partagée unique.
3. Sa famille actuelle est limitée à `technical`, `methodological`, `behavioral` : la famille **Fonctionnelle** manque.
4. Le niveau `referenceLevel` est porté par la définition de compétence. Or la décision métier place le niveau attendu sur chaque association compétence ↔ bloc de missions ou compétence transversale ↔ poste.
5. Les contraintes de suppression actuelles peuvent supprimer en cascade des exigences projet liées à la compétence ou au bloc. Il faudra revoir les règles de conservation avant de permettre la désactivation d’une compétence globale.

**Conclusion :** le modèle actuel ne permet pas de réaliser fidèlement le référentiel global demandé. Il faut une évolution ciblée du modèle, pas simplement ajouter un écran de gestion.

### 1.3 Écrans existants

- `/organization/functions` affiche les fonctions et permet de modifier leur document, leurs sections d’activités, leurs sections personnalisées, leurs blocs de compétences et de créer des compétences à l’intérieur d’un bloc.
- Cet écran ne propose pas de liste globale indépendante des compétences, ni de recherche anti-doublon transversale.
- Les familles affichées sont actuellement Technique, Méthodologique et Savoir-être. La famille Fonctionnelle n’existe pas.
- `/organization/positions` gère les postes permanents avec une grille AG Grid, la modification en cellule, la sélection multiple, l’affectation des titulaires et la désactivation.
- Cet écran ne constitue pas l’administration de la fiche de poste : il gère les postes et leurs titulaires. Il devra être complété pour naviguer vers la fiche de référence liée, sans fusionner les deux responsabilités.
- Le backend expose actuellement la création de fonctions, blocs et compétences, mais pas un CRUD global complet des compétences (liste, détail, modification, désactivation/réactivation, suppression contrôlée).

## 2. Modèle métier cible à préparer

Le modèle doit distinguer quatre objets :

1. **Compétence** : définition globale unique, avec intitulé, description courte, famille unique et statut actif/inactif.
2. **Bloc de missions de fiche de poste** : bloc descriptif propre à une fiche de poste, avec code stable, intitulé, description et activités descriptives.
3. **Association bloc de missions ↔ compétence** : référence vers la compétence globale et niveau attendu de 1 à 5.
4. **Association poste ↔ compétence transversale** : référence vers la compétence globale et niveau attendu de 1 à 5, distincte des associations aux blocs.

Une compétence peut être utilisée dans plusieurs blocs et plusieurs postes sans duplication. Elle possède exactement une famille : **Méthodologique**, **Technique**, **Fonctionnelle** ou **Savoir-être**. Aucune étiquette secondaire ni famille multiple.

Le niveau attendu ne doit jamais être stocké uniquement sur la compétence globale. Il appartient à chaque association.

### 2.1 Conservation des quatre blocs de missions

La fiche de poste de référence peut présenter jusqu'à quatre blocs de missions (sans obligation de remplir les quatre). Chaque bloc comporte au maximum quatre activités et les compétences associées. Les codes sont attribués aux seuls blocs effectivement créés ; leur convention définitive reste à harmoniser avec le point non arbitré fonction-type/poste/fiche.

Les activités actuelles peuvent fournir une base de migration ou de reprise, mais il faudra vérifier leur rattachement à la bonne fiche et leur granularité. Ne pas renommer aveuglément les sections existantes en blocs de missions : leur sémantique et leurs cardinalités ne sont pas identiques.

### 2.2 Lien fiche de poste / poste permanent

`OrganizationPosition.functionId` fournit déjà un lien vers `JobFunction`. Le comportement actuel est à confirmer lorsque :
- plusieurs postes permanents réutilisent la même fiche de fonction ;
- un poste permanent n’a pas encore de fiche liée ;
- le code et l’intitulé du poste diffèrent du code et du nom de la fiche de référence ;
- une fiche est modifiée alors que plusieurs postes l’utilisent.

Principe recommandé : une fiche de référence peut être réutilisée par plusieurs postes permanents ; les données de titulaire et de hiérarchie restent sur `OrganizationPosition` et `OrganizationAssignment`. Les adaptations éventuelles propres à un poste doivent être explicites et ne pas modifier silencieusement la référence commune.

## 3. Écrans et parcours à préparer

### 3.1 Référentiel des compétences

Écran indépendant accessible depuis l’administration du référentiel commun.

Grille à réutiliser via le composant DataGrid commun :
- intitulé ;
- famille ;
- description courte ;
- nombre d’utilisations ;
- statut ;
- actions.

Parcours :
- recherche par intitulé et description ;
- filtre famille et statut ;
- création avec intitulé, description et famille obligatoire ;
- contrôle de doublons potentiels avant confirmation ;
- consultation/modification ;
- désactivation/réactivation ;
- aucune suppression physique depuis l'API ; une compétence utilisée est désactivée.

La désactivation ne retire pas la compétence des fiches existantes. Une compétence inactive reste lisible dans les historiques et n’est plus proposée par défaut dans les nouveaux rattachements.

### 3.2 Liste des postes et fiches

La grille des postes permanents doit conserver ses fonctions de gestion des titulaires et de la structure. Elle doit ajouter une navigation explicite vers la fiche de référence associée (ou signaler l’absence de fiche). La fiche consultable est une vue de synthèse en lecture seule ; la saisie s’effectue dans une seule page d’administration.

### 3.3 Administration d’une fiche de poste

Un écran unique doit regrouper :
- informations générales et finalité ;
- au maximum quatre blocs de missions ;
- activités descriptives dans chaque bloc ;
- compétences associées et niveau attendu par association ;
- compétences transversales du poste et leur niveau attendu ;
- sauvegarde globale et erreurs de validation contextualisées.

La sélection d’une compétence ouvre une recherche dans le référentiel global. Une création rapide est possible depuis la fiche, mais elle crée une compétence globale et applique le même contrôle anti-doublon.

## 4. Évolution de données à instruire — sans migration prématurée

Les points suivants sont des besoins à concevoir et valider avant d’écrire la migration de remplacement :

- rendre la compétence indépendante d’un bloc ;
- introduire les quatre familles exclusives, dont Fonctionnelle ;
- déplacer le niveau attendu de la définition globale vers les associations ;
- créer ou clarifier le modèle des quatre blocs de missions de fiche de poste ;
- créer les associations bloc de missions ↔ compétence avec niveau attendu ;
- créer l’association poste/fonction ↔ compétence transversale avec niveau attendu ;
- définir les règles de suppression, désactivation, réactivation et conservation des associations ;
- remplacer le modèle des compétences sur la base de test, sans préserver les identifiants, codes ou définitions historiques ;
- remettre à zéro les anciennes lignes de compétences et les exigences individuelles de compétences projet ;
- créer l'association explicite compétence globale ↔ bloc de compétences projet ;
- conserver les blocs projet, les liens fonction ↔ blocs, les applicabilités des blocs, les mappings d'activités BPMN et les correspondances RACI ;
- conserver la distinction entre niveau du bloc projet et niveau d'une compétence individuelle.

La migration peut être destructive pour les données de compétences de la base de test, après sauvegarde et avec une garde empêchant l'exécution en production. L'inventaire doit surtout confirmer les FK et consommateurs à préserver. Aucune remise à zéro ne doit toucher les données projet/BPMN sans dépendance directe démontrée.

## 5. Séquencement proposé

1. **Modèle et stratégie de remplacement** : valider la séparation compétence globale / blocs de compétences projet / blocs de missions, puis inventorier les dépendances à préserver.
2. **Référentiel des compétences** : modèle, API CRUD, contrôle anti-doublon, désactivation et tests.
3. **Fiche de poste** : quatre blocs, activités, associations compétences/niveaux et compétences transversales.
4. **Liste des postes** : liaison explicite vers la fiche de référence et accès à la fiche consultable.
5. **Intégration UI** : réutiliser le DataGrid commun validé ; ne pas réimplémenter tri, sélection, ordre des colonnes ou sélecteur de champs.
6. **Validation** : tests backend, migrations sur base représentative, tests UI des parcours et CI.

## 6. Critères d’acceptation préparatoires

- Une compétence n’existe qu’une fois dans le référentiel global, même si elle est associée à plusieurs blocs ou postes.
- Une compétence a une seule famille parmi les quatre familles décidées.
- Une compétence utilisée peut être désactivée sans perdre les associations ni les affichages historiques.
- Une compétence inactive n’est pas proposée par défaut pour un nouvel usage.
- Le niveau attendu est indépendant pour chaque association compétence ↔ bloc et compétence transversale ↔ poste.
- La fiche de poste contient au maximum quatre blocs ; chaque bloc contient au maximum quatre activités. Les cardinalités de compétences restent celles du référentiel de compétences.
- Les tâches opérationnelles et le RACI restent dans leurs modules existants.
- La grille métier utilise le composant DataGrid commun validé, sans copie locale de ses fonctionnalités.
- Les postes permanents, titulaires et relations hiérarchiques existants ne sont pas régressés.

## 7. Périmètre de cette analyse

Cette analyse est une inspection statique des sources et migrations de la branche. Elle ne constitue pas une validation runtime. Aucun code applicatif, aucune migration et aucun test CI n’ont été exécutés ou modifiés dans cette tranche.


## 8. Précision sur les dépendances projet confirmées

L'inspection ciblée du backend confirme que `JobArchitectureService.listFunctions()` lit `job_function_competency_blocks` et construit les blocs de compétences présentés pour chaque fonction. `createProjectPosition()` reprend ces associations pour initialiser `position_competency_blocks`.

Les tables `competency_blocks`, `job_function_competency_blocks`, `position_competency_blocks` et `position_activity_mappings` sont donc des éléments actifs du flux projet et doivent être conservés. Les mappings d'activités BPMN ne référencent pas directement une compétence ; ils relient un poste projet, une ressource/processus, une tâche BPMN et un bloc applicable.

Deux niveaux de besoin restent distincts :
- `position_competency_blocks.requiredLevel` : niveau demandé pour le bloc ;
- `position_competency_requirements.requiredLevel` : niveau demandé pour une compétence individuelle.

La remise à zéro de la base de test porte sur les définitions de compétences et les exigences individuelles. Elle ne doit pas effacer l'applicabilité ou le niveau des blocs, ni les mappings BPMN ou RACI.

## 9. Stratégie de migration retenue

- Pas de table de correspondance des anciennes compétences.
- Pas de reprise ou de dédoublonnage des anciennes définitions.
- Nouveau catalogue global avec code unique et quatre familles.
- Nouvelle liaison compétence ↔ bloc projet.
- Exigences individuelles projet recréées après la migration ; niveaux portés par ces associations.
- Tables des quatre blocs de missions et de leurs activités/compétences créées séparément.
- Sauvegarde de la base de test, garde anti-production, migration, tests backend/frontend puis CI.


## 10. État de la migration SQL

Le fichier `backend/migrations/20261126_v0_10_competency_catalog_reset.sql` a été ajouté avec garde par marqueur explicite et nom exact de base. Il n'est pas encore exécuté ni intégré au Compose de Coolify : le backend courant dépend toujours de l'ancien modèle. Le branchement de la migration doit accompagner les changements d'entités et de services.


## Addendum de cohérence fonctionnelle — décisions du 27 novembre 2026

Les décisions consolidées dans [le modèle organisationnel responsabilités/activités](../functional/modele-organisation-responsabilites-activites.md#10-décisions-de-cadrage-consolidées--27-novembre-2026) prévalent sur toute formulation antérieure de ce document qui leur serait contraire :

- un poste comporte **au maximum quatre responsabilités** (ou blocs de missions), sans obligation d'en remplir quatre ; chaque responsabilité comporte **au maximum quatre activités** ;
- le référentiel d'activités organisationnelles est unique et les activités sont reliées explicitement aux éléments BPMN ; une même activité de référence peut être utilisée par plusieurs éléments BPMN dans plusieurs processus ;
- la responsabilité organisationnelle est portée par le poste et reste distincte des rôles opérationnels RACI ; aucune entrée RACI n'est déduite automatiquement de la fiche de poste ;
- la structure permanente retenue pour le cadrage est **Directions → Postes → Titulaires** ; les services/unités intermédiaires ne sont pas requis à ce stade ;
- le titulaire structurel n'est pas nécessairement l'unique personne qui réalise le travail : une personne peut réaliser tout ou partie des responsabilités d'un poste et contribuer à plusieurs postes. Les affectations opérationnelles doivent être distinguées de la titularisation ;
- le lien entre fonction-type, poste et fiche de poste reste **non arbitré**. Aucune hypothèse de partage, d'héritage ou de personnalisation ne doit être présentée comme une décision acquise.

Les passages ci-dessus constituent un cadrage fonctionnel et ne décrivent pas des capacités techniques déjà livrées. Aucun audit technique V0.10, aucune modification de code et aucune migration ne sont inclus dans cette harmonisation documentaire.
