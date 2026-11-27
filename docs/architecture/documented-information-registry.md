# Informations documentées — référentiel au niveau projet

> **Décision fonctionnelle :** une information documentée est unique au niveau projet. Elle peut être utilisée par plusieurs éléments BPMN, dans plusieurs processus du même projet.

## 1. Principes

1. Chaque projet dispose d'un référentiel unique d'informations documentées.
2. Une fiche appartient au projet, jamais à un processus particulier.
3. Une fiche peut exister sans association BPMN.
4. Une fiche peut être associée à plusieurs éléments BPMN de plusieurs processus.
5. Un élément BPMN ne peut être associé qu'à une seule fiche à la fois.
6. La vue projet affiche toutes les fiches du projet sans doublon.
7. La vue d'un processus affiche les fiches ayant au moins une association avec un élément de ce processus.
8. Le nom de l'élément BPMN et le nom de la fiche documentaire sont distincts : l'un ne remplace pas l'autre.
9. Les métadonnées (description, lien, emplacement, accès, conservation, validité, données personnelles, personnes autorisées et restrictions) sont portées par la fiche unique.
10. Délier un objet BPMN retire uniquement son association. La fiche reste dans le référentiel projet.
11. Supprimer une fiche est interdit tant qu'elle possède au moins une association BPMN.
12. Un nouvel objet BPMN de type Data Object Reference ou Data Store Reference reçoit automatiquement une fiche s'il n'est pas déjà associé.

## 2. Création et association automatiques

À l'enregistrement du BPMN, le serveur synchronise les objets de données pris en charge :

- `dataStoreReference` : création par défaut d'une fiche de type `database`.
- `dataObjectReference` : création par défaut d'une fiche de type `file`.

La synchronisation est idempotente : un même objet BPMN ne crée jamais plusieurs fiches à chaque sauvegarde. Chaque création automatique crée simultanément la fiche projet et son association BPMN.

Si l'objet est déjà associé à une fiche existante, aucune nouvelle fiche n'est créée.

## 3. Réutilisation d'une fiche existante

Depuis le référentiel projet, un utilisateur peut associer une fiche existante à tout objet Data Object ou Data Store non encore associé, quel que soit le processus du projet.

La fiche est partagée : une modification de ses métadonnées est visible dans toutes les vues processus qui l'utilisent. Les noms des objets BPMN restent indépendants de son nom documentaire.

## 4. Modèle de données

- `project_documented_sources` : fiche documentaire unique, rattachée au `projectId`.
- `project_documented_source_processes` : appartenance d'une fiche à un processus, indépendante de tout lien BPMN. Elle permet notamment de conserver dans un processus une information documentée sans objet BPMN associé.
- `project_documented_source_references` : associations entre une fiche et un élément BPMN, avec `projectId`, `sourceId`, `resourceId` (processus), `elementId`, `elementName` et `elementType`.

Le processus est donc porté par deux liens distincts : l'appartenance à la liste documentaire du processus et, si elle existe, l'association à un objet BPMN. Une fiche peut être présente dans plusieurs processus sans être dupliquée. La vue processus affiche l'union des fiches explicitement présentes dans ce processus et des fiches utilisées par ses objets BPMN.

## 5. Déliaison et suppression

- Délier un élément supprime uniquement sa référence.
- Si une fiche n'a plus aucune référence, elle reste disponible dans le référentiel projet comme information indépendante.
- La suppression d'une fiche est autorisée uniquement lorsqu'elle n'a plus aucune référence.
- La suppression d'un processus retire ses références BPMN, sans supprimer automatiquement les fiches projet qui peuvent rester utiles.

## 6. Migration et conservation

La migration vers le modèle projet doit préserver les fiches existantes, y compris celles qui ont été archivées lors de l'introduction temporaire de la propriété par processus. Les anciennes appartenances `resourceId` sont converties en lignes `project_documented_source_processes` ; les associations BPMN restent rattachées à leur processus via `project_documented_source_references.resourceId`.

Aucune donnée documentaire ne doit être supprimée ou fusionnée automatiquement sur la seule base du nom.

## 7. Critères de validation

- La liste projet affiche chaque fiche une seule fois.
- La vue processus affiche les fiches appartenant à ce processus, même sans association BPMN, ainsi que les fiches liées à ses objets BPMN.
- Une fiche peut être présente sans objet BPMN dans plusieurs processus, sans être dupliquée.
- Une fiche peut être reliée à des objets BPMN de plusieurs processus.
- Un Data Object Reference et un Data Store Reference non associés génèrent chacun une fiche automatique.
- Une sauvegarde répétée ne crée aucun doublon.
- Une association manuelle à une fiche existante ne crée pas de nouvelle fiche.
- Un même objet BPMN ne peut pas être associé à deux fiches.
- La déliaison ne supprime pas la fiche.
- Une fiche sans association peut être créée, modifiée et conservée au niveau projet.
- Les données historiques et leurs associations sont préservées par migration.
