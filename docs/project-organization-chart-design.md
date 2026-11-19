# Organigramme par projet — décision d'architecture

## Décision

Oui, une vue d'organigramme par projet est pertinente, à condition qu'elle soit une **composition du socle organisationnel commun et des rôles du projet**, et non une copie de l'organigramme de l'entreprise.

## Modèle cible

- **Socle commun** : les postes permanents restent définis une seule fois dans `organization_positions` et reliés dans `organization_position_relations`. Les postes transverses (DG, DO, DT, etc.) gardent donc une identité et une fiche uniques.
- **Composition projet** : un projet réutilise un poste commun via `project_job_positions.organizationPositionId`. Le rôle projet conserve son identité projet, ses responsabilités RACI et ses liens BPMN.
- **Postes propres au projet** : les `project_job_positions` sans `organizationPositionId` restent spécifiques au projet.
- **Hiérarchie projet** : elle doit être portée par des relations propres au projet entre rôles projet, jamais par la hiérarchie globale. Cela permet à un même poste commun (par exemple DO) d'avoir des rattachements différents selon le projet.
- **Affichage** : la vue projet présente les postes communs réellement mobilisés par le projet, puis les rôles projet et les postes spécifiques. Les éléments communs sont clairement identifiés comme tels et ouvrent la fiche du poste permanent.

## Règles à préserver

1. Ne pas recopier les données d'un poste commun dans chaque projet.
2. Une modification de l'intitulé ou de la fiche d'un poste commun est visible dans toutes les vues projet qui le référencent.
3. Une relation hiérarchique créée dans un projet ne modifie jamais l'organigramme permanent.
4. Les rôles RACI et les responsabilités BPMN restent la source de vérité du projet ; l'organigramme ne les remplace pas.
5. Un projet peut réutiliser un poste commun sans devoir afficher toute la hiérarchie de l'entreprise : seules les fonctions pertinentes sont incluses.

## Évolution technique nécessaire

Ajouter une hiérarchie projet dédiée aux `project_job_positions` (relation parent/enfant, ordre d'affichage, unicité du parent par rôle et contrôle anti-cycle). L'API de lecture devra renvoyer une composition projet avec, pour chaque nœud, le type (commun ou spécifique), le poste permanent lié le cas échéant, le rôle projet, le titulaire éventuel et les responsabilités RACI associées.

Cette évolution est volontairement séparée du correctif de l'organigramme permanent et de la gestion des affectations : elle évite de modifier les contraintes globales existantes et doit faire l'objet d'un lot fonctionnel dédié.
