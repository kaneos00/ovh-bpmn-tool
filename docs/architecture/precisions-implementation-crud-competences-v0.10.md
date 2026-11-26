# Précisions d'implémentation — CRUD global des compétences (V0.10)

**Branche :** planning/admin-ux-v0.10  
**Nature :** audit statique du code existant et décisions de préparation.  
**Aucune modification applicative ni migration n'est incluse.**

## 1. État réellement présent dans le code

L'inspection du module backend/src/modules/JobArchitecture confirme :

- Le module enregistre déjà CompetencyTypeOrmEntity et CompetencyBlockTypeOrmEntity.
- Le contrôleur existant expose POST /job-architecture/competency-blocks/:blockId/competencies.
- Cette création est protégée par @UseAcl([UserGroup.Admin]).
- La création exige un bloc actif et enregistre blockId dans chaque compétence.
- Le code est unique uniquement dans le bloc, et non globalement.
- La catégorie actuelle est limitée à technical, methodological, behavioral.
- listFunctions() renvoie les compétences actives imbriquées sous les blocs associés aux fonctions.
- Le README du module indique que les écritures de référentiel sont réservées aux administrateurs globaux dans cette première tranche.
- Le module Organization confirme que les lectures et modifications du répertoire organisationnel sont réservées aux administrateurs globaux.

Ces constats imposent de conserver le contrôle ACL global existant pour le nouveau CRUD. Il ne faut pas inventer une permission projet ou réutiliser UserGroup.RW pour administrer le référentiel commun.

## 2. Contrat API à retenir

Ajouter les routes globales suivantes au contrôleur existant, avec @UseAcl([UserGroup.Admin]) sur toutes les écritures :

- GET /job-architecture/competencies : liste globale, y compris les inactives si le filtre le demande.
- GET /job-architecture/competencies/:competencyId : détail et associations/usages.
- POST /job-architecture/competencies : création globale.
- PATCH /job-architecture/competencies/:competencyId : modification code, intitulé, description et famille.
- PATCH /job-architecture/competencies/:competencyId/status : activation/désactivation.

La route historique POST /job-architecture/competency-blocks/:blockId/competencies doit être conservée pendant la transition pour ne pas casser les écrans et consommateurs existants. Elle devra à terme appeler le même service métier que la création globale, avec association explicite au bloc historique.

La lecture GET /job-architecture/functions doit continuer à fonctionner. Son format imbriqué historique ne doit pas être modifié dans la même livraison que l'ajout du CRUD global.

## 3. Modèle et transition nécessaires avant l'API globale

L'API globale ne peut pas être correctement livrée en se contentant d'enlever blockId du DTO : la colonne est actuellement obligatoire et les contraintes projet reposent sur l'appartenance de la compétence à un bloc.

Le changement de modèle doit donc rester additif :

1. Introduire les quatre valeurs de famille, dont functional, en adaptant les contraintes DB et le type TypeScript.
2. Introduire une table d'association explicite entre compétence et ancien bloc de compétences.
3. Reprendre chaque lien historique competencies.blockId dans cette table sans changer les identifiants de compétence.
4. Adapter les lectures/validations projet pour vérifier l'association explicite.
5. Conserver temporairement blockId en compatibilité jusqu'à preuve que tous les consommateurs ont basculé.
6. Rendre le code globalement unique seulement après inventaire et résolution manuelle des collisions.
7. Ne supprimer la colonne historique et ses contraintes qu'après une étape distincte, testée et réversible.

La définition globale d'une compétence ne doit pas être supprimée quand on retire son association à un bloc.

## 4. Contrat métier des opérations

### Création
- code obligatoire, normalisé selon la convention existante (trim + majuscules) ;
- nom obligatoire ;
- famille obligatoire ;
- description facultative ;
- aucune association implicite à un ancien bloc ;
- niveau de référence historique non repris comme niveau cible global.

### Modification
- identifiant stable ;
- changement de famille autorisé avec confirmation côté UI si la compétence est déjà utilisée ;
- aucune réécriture automatique des niveaux projet ;
- code modifiable uniquement si l'unicité globale peut être garantie.

### Désactivation
- active=false, sans suppression physique ;
- les associations historiques et exigences projet restent lisibles ;
- exclusion par défaut des nouveaux sélecteurs, avec option d'afficher les inactives.

### Suppression
- pas de suppression physique via l'API standard ;
- l'absence d'usage ne suffit pas à autoriser une suppression silencieuse : privilégier la désactivation pour préserver les références et l'auditabilité.

## 5. Contrôles d'accès et non-régression

- Toutes les routes de gestion du référentiel commun : UserGroup.Admin.
- Les utilisateurs projet en lecture ou écriture projet ne reçoivent aucun droit implicite sur le référentiel commun.
- Les routes projet existantes conservent leurs ACL actuelles (Viewer pour lecture et RW pour modifications projet, selon les routes).
- La route historique de création par bloc reste Admin.
- Les tests vérifient explicitement l'accès refusé aux utilisateurs non Admin.

## 6. Tests additionnels spécifiques au code existant

- La liste globale restitue une compétence une seule fois même si elle est associée à plusieurs blocs.
- Le filtre active=false restitue les compétences désactivées.
- La lecture historique des fonctions continue de présenter les compétences par bloc.
- La route historique de création reste fonctionnelle durant la transition.
- L'association à un bloc n'entraîne pas la création d'une seconde compétence.
- La suppression d'une association ne supprime pas la définition globale.
- Une compétence associée à plusieurs blocs reste unique dans la liste globale.
- Les droits Admin, RW et lecteur sont testés séparément.

## 7. Point de décision avant développement

Ne pas commencer la migration destructive ni imposer l'unicité globale du code avant d'avoir :
- les exports de l'inventaire SQL ;
- la revue métier des collisions ;
- la liste des consommateurs de blockId confirmée par recherche dans tout le dépôt ;
- un plan de rollback et une base de test restaurée.

Le CRUD global peut être développé en plusieurs petites PR, mais son activation complète dépend de la migration additive et de la reprise vérifiée.
