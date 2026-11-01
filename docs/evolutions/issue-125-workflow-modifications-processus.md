# Évolution #125 — workflow des propositions et modifications de processus

## Décision d'architecture

Le workflow de contribution est distinct du cycle de vie du contenu BPMN. Il ne faut pas ajouter les états de revue à `ContentStatusEnum` : aujourd'hui ce type porte les états techniques `draft`, `published`, `obsolete`, utilisés par les requêtes de lecture, la numérotation et la publication transactionnelle. Mélanger les deux ferait notamment risquer qu'un contenu en revue disparaisse des recherches de brouillons ou perturbe la publication existante.

### États existants à préserver

| État du contenu BPMN | Signification | Traitement |
|---|---|---|
| `draft` | Version de travail non publiée | Conservé comme état technique de contenu |
| `published` | Version de référence publiée | Seul état visible comme référence courante |
| `obsolete` | Ancienne version publiée remplacée | Conservé dans l'historique |

Ces états restent inchangés et rétrocompatibles.

## Nouveovo workflow de contribution

Une entité séparée de demande de modification porte le cycle de revue :

| État | Signification | Transitions autorisées |
|---|---|---|
| `proposed` | Proposition descriptive, sans XML modificato | `in_review`, `rejected`, `withdrawn` |
| `draft` | Contribution de travail modifiable par l'auteur et les éditeurs autorisés | `submitted`, `withdrawn` |
| `in_review` | Contribution soumise, figée pour la revue | `changes_requested`, `approved`, `rejected` |
| `changes_requested` | Le valideur demande des corrections | `draft`, puis nouvelle soumission |
| `approved` | Contribution approuvée, pas encore publiée | `published`, `withdrawn` |
| `rejected` | Contribution refusée avec motif | terminal ; nouvelle demande nécessaire |
| `published` | Contribution publiée comme nouvelle version de référence | terminal |
| `withdrawn` | Demande retirée par son auteur ou un administrateur autorisé | terminal |

Les propositions descriptives peuvent être converties en contribution de travail ; la conversion conserve l'identifiant, l'auteur, les commentaires et l'historique.

## Statut synthétique du processus

Le statut présenté dans l'explorateur et le Viewer est calculé à partir des contenus et des demandes actives, sans remplacer ni modifier les états techniques historiques :

1. **Non publié** : aucun contenu `published`.
2. **Publié** : contenu de référence publié, aucune contribution active.
3. **Modification en préparation** : au moins une demande `draft` ou `proposed`.
4. **En validation** : au moins une demande `in_review`.
5. **Corrections demandées** : au moins une demande `changes_requested`.
6. **Validation accordée** : demande `approved`, publication distincte encore à effectuer.
7. **Publié — nouvelle version** : après publication, retour au statut **Publié** ; l'historique conserve la demande et sa décision.
8. **Obsolète** : ne s'applique qu'aux versions de contenu remplacées ; ce n'est pas un statut courant du processus.

En présence de plusieurs demandes simultanées, le statut synthétique doit afficher une priorité explicite : En validation > Corrections demandées > Validation accordée > Modification en préparation > Publié > Non publié. Le détail des demandes reste consultable ; une demande refusée ou retirée ne masque pas une autre demande active.

## Modèle de données cible

Table dédiée `process_change_requests` (nom à confirmer lors de l'implémentation) :
- id UUID, resource_id, author_id, type (`proposal` / `content_change`), status ;
- source_content_id et source_version (instantané logique de la référence au dépôt) ;
- working_content_id nullable pour les propositions descriptives, obligatoire pour une contribution éditable ;
- title, description, justification ;
- submitted_at, reviewed_at, decided_at, published_content_id ;
- reviewer_id / assigned_reviewer_id selon les permissions existantes ;
- created_at, updated_at.

Table d'événements `process_change_request_events` :
- request_id, event_type, from_status, to_status, actor_id, comment, created_at ;
- journal append-only des soumissions, retours, décisions, retraits et publications.

Les commentaires de revue sont des événements métier, distincts des commentaires généraux du processus. Les identifiants BPMN sont préservés par copie du XML ; aucune fusion automatique des diagrammi.

## Regole di sicurezza e integrità

- Toute lecture et mutation passe par `ProjectResourceAccessService` et les ACL existantes ; aucun rôle implicite nouveau.
- L'auteur ne peut pas approuver sa propre demande par défaut. Une dérogation doit être explicitement configurée et auditée.
- Une demande soumise devient immuable pour l'auteur jusqu'à une demande de correction.
- À la soumission, conserver l'identifiant et la version du contenu publié de référence.
- À l'approbation puis à la publication, re-vérifier dans une transaction que la référence n'a pas changé. Si elle a changé : conflit explicite, aucune publication.
- L'approbation et la publication sont deux actions séparées. L'approbation ne change jamais la référence publiée.
- La publication réutilise le mécanisme transactionnel existant de `publishAtomically`, avec contrôle de la version source.
- Aucun effacement de l'historique de décision ; refus/retrait restent consultables.
- Les notifications sont hors périmètre du premier incrément, mais événements et destinataires doivent permettre leur ajout ultérieur.

## Incréments de réalisation

1. Modèle de données, migrations, domaine, repository et tests de transitions.
2. API protégée : créer proposition/contribution, soumettre, lister/consulter, demander correction, approuver, refuser, retirer, publier.
3. Interface auteur : liste des demandes, formulaire de proposition, entrée en modeleur pour la contribution, suivi des retours.
4. Interface valideur : file de revue, comparaison BPMN de référence/contribution, commentaire et décision.
5. Statut synthétique dans explorateur et Viewer, filtres et badges cohérents avec les états existants.
6. Tests d'intégration des ACL, des transitions, de concurrence/version, et parcours frontend.

## Critères de non-régression

- `draft`, `published`, `obsolete` conservent exactement leur sens et les API existantes restent compatibles.
- Les parcours actuels de création, édition, publication, comparaison, export, RACI et historique restent fonctionnels.
- Une demande ou une contribution ne peut jamais écraser le XML publié avant l'action explicite de publication.
- Tests backend et frontend existants conservés ; aucun test n'est supprimé ou affaibli.
- CI entièrement verte avant proposition de déploiement. Aucun déploiement Coolify sans demande explicite.
