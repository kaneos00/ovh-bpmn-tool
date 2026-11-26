# Complément d'audit — périmètre frontend et recherche exhaustive des dépendances compétences (V0.10)

Branche examinée : `planning/admin-ux-v0.10`

## 1. Résultat du contrôle frontend ciblé

Fichiers inspectés :
- `frontend/src/Containers/OrganizationAdmin/OrganizationAdmin.container.tsx`
- `frontend/src/Containers/OrganizationPositions/index.tsx`
- `frontend/src/Components/BusinessComponents/ProjectJobPositions/ProjectJobPositions.tsx`

Constats :
- Les deux conteneurs d'administration permanente consultés ne contiennent pas de référence directe à `competency`, `blockId` ou `competencyId`.
- `ProjectJobPositions.tsx` consomme explicitement `competencyBlocks`, `blockId`, les exigences de compétences et les mappings d'activités BPMN.
- Ce composant permet notamment de qualifier l'applicabilité d'un bloc au poste projet et d'associer une tâche BPMN à un bloc applicable.
- Ces usages relèvent du modèle projet existant. Ils ne doivent pas être redirigés vers les futurs blocs de missions des fiches de poste.

Contrôleur backend inspecté :
- `backend/src/modules/JobArchitecture/infrastructure/controllers/jobArchitecture.controller.ts`
- La création actuelle d'une compétence est encore imbriquée sous `competency-blocks/:blockId/competencies`.
- Les routes projet de qualification des blocs, exigences de compétences et mappings BPMN restent distinctes.

## 2. Décision de migration à préserver

Ne pas renommer ni réaffecter globalement `CompetencyBlock` ou `blockId` au concept métier de « bloc de mission ».

Le modèle actuel `CompetencyBlock` est déjà consommé par :
- les associations fonction ↔ blocs de compétences ;
- les blocs applicables aux postes projet ;
- les exigences de compétences des postes projet ;
- les associations poste projet ↔ tâche BPMN ↔ bloc ;
- les diagnostics de couverture et d'obsolescence des mappings.

La cible « compétence globale réutilisable » doit donc être introduite par une migration explicite et progressive. Elle ne doit pas casser ces consommateurs. Les blocs de mission des fiches de poste doivent être un concept distinct.

## 3. Limite de l'audit réalisé

Cet examen a couvert le contrôleur, le service, les entités et migration SQL déjà identifiés, ainsi que les trois composants frontend listés ci-dessus et le composant projet détaillé. Il ne constitue pas encore une recherche exhaustive de toutes les références dans les 2 978 entrées de l'arbre Git.

Le moteur de recherche de code GitHub n'ayant pas fourni de résultats exploitables lors des recherches précédentes, une recherche locale indexée sur l'ensemble du dépôt est nécessaire avant toute migration destructive.

## 4. Protocole de recherche exhaustive à exécuter sur un clone local

Depuis la racine du dépôt, sur la branche concernée :

```bash
git switch planning/admin-ux-v0.10
git pull --ff-only
```

Rechercher les noms métier et les variantes SQL/DTO/API :

```bash
rg -n --hidden \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/build/**' \
  --glob '!**/.git/**' \
  'CompetencyBlock|competency_blocks|competencyBlock|competencyBlocks|blockId|block_id|competencyId|competency_id|competency_requirements|position_activity_mappings|job_function_competency_blocks' .
```

Rechercher également les routes et libellés de l'API :

```bash
rg -n --hidden \
  --glob '!**/node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/build/**' \
  --glob '!**/.git/**' \
  'competency-blocks|competency-requirements|job-architecture|Compétence|compétence|competenc' .
```

Contrôler séparément :
1. entités ORM et relations TypeORM ;
2. migrations SQL, contraintes FK, index, vues et seeds ;
3. services, contrôleurs, DTO, validations et tests backend ;
4. clients API, hooks, composants et tests frontend ;
5. exports, imports, génération documentaire et éventuels scripts ;
6. fixtures, données de démonstration et documentation opérationnelle.

Pour chaque occurrence, classer :
- **à conserver** : dépendance projet existante ;
- **à adapter** : API ou interface de gestion du référentiel global ;
- **à migrer** : ancienne compétence attachée à un bloc, à rattacher au nouveau référentiel global ;
- **à supprimer** : uniquement après preuve qu'aucun consommateur ni donnée historique ne dépend du lien.

## 5. Conditions préalables à une migration applicative

Avant d'écrire la migration :
- produire le décompte SQL des compétences, blocs, associations fonction/bloc, exigences poste/compétence et mappings BPMN ;
- identifier les doublons potentiels de code et de libellé entre blocs ;
- définir une règle déterministe de fusion des compétences identiques, sans fusion automatique sur le seul libellé ;
- préserver les identifiants historiques ou établir une table de correspondance ;
- vérifier les FK et cascades, en particulier les cascades qui pourraient effacer des exigences projet ;
- prévoir une migration réversible ou, à défaut, une stratégie de sauvegarde et de restauration documentée ;
- exécuter les tests backend/frontend et contrôler les données après migration.

Aucune requête sur une base réelle, migration ou validation runtime n'a été exécutée dans le cadre de cet audit.

## 6. Prochaine étape recommandée

Obtenir le résultat des deux recherches `rg` sur le clone local, puis compléter la matrice des consommateurs. Ensuite seulement, arrêter le schéma cible et préparer une migration additive : référentiel global de compétences, familles exclusives (méthodologique, technique, fonctionnelle, savoir-être), statut actif/inactif, puis associations compétence ↔ bloc de mission et compétence transversale ↔ poste avec niveau attendu porté par l'association.
