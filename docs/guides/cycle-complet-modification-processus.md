# Cycle complet de modification d’un processus

> Guide utilisateur et fonctionnel — branche `refactor/issue-162-unified-viewer`.
>
> Ce guide décrit le circuit de proposition, de revue et de publication d’une évolution. Il distingue une demande de modification complète d’une simple remarque contextuelle déposée depuis le Viewer.

## 1. Principe général

Une version publiée n’est pas modifiée directement dans le cadre du circuit de validation. Une évolution est préparée dans un **espace de travail distinct**, initialisé à partir de la dernière version publiée du processus source.

Le processus source reste consultable et inchangé pendant la préparation et la revue. La publication intervient uniquement après approbation et crée une nouvelle version publiée du processus source. La demande conserve son historique et passe à l’état **Publiée**.

Chaque demande est rattachée :
- au projet dans lequel elle a été créée ;
- au processus source ;
- à l’identifiant précis de la version publiée qui a servi de référence ;
- à son espace de travail de proposition ;
- à son auteur, à son validateur éventuel, aux remarques et aux événements du circuit.

Cette référence à la version source est importante : si le processus source est publié entre-temps, l’ancienne demande ne peut pas être soumise ou publiée sur la nouvelle version. Il faut repartir d’une proposition basée sur la version publiée courante.

## 2. Acteurs et responsabilités

| Acteur | Responsabilité dans le circuit |
|---|---|
| Auteur / contributeur | Crée une proposition, prépare le brouillon et répond aux demandes de précision. |
| Membre autorisé à déposer des remarques | Signale un point depuis le Viewer, sur un élément BPMN précis. Le droit de remarque est distinct du droit de modélisation. |
| Modélisateur du projet | Prépare ou reprend le brouillon, le soumet à validation et effectue les corrections demandées. |
| Validateur désigné | Compare les versions, traite les remarques et prend la décision de validation lorsqu’il dispose toujours des droits requis. |
| Gestionnaire du projet | Peut assurer la revue en remplacement du validateur désigné, dans les limites des droits du projet. |
| Administrateur global du référentiel | Assure la revue, la décision et la publication lorsqu’une évolution porte sur un processus du référentiel commun. |

Les droits sont contrôlés côté serveur à chaque action. Une personne qui pouvait agir au début du circuit peut perdre ce droit si son rôle ou son accès au projet change.

## 3. Démarrer une proposition de modification complète

1. Ouvrir le projet concerné et entrer dans son espace de processus.
2. Ouvrir le processus à faire évoluer et vérifier qu’il s’agit bien de la version publiée courante.
3. Dans le Viewer, utiliser l’action **Proposer une modification**.
4. L’application crée une demande et un espace de travail privé distinct du processus source. Le contenu initial de cet espace est une copie de la version publiée courante.
5. L’application ouvre le Modeleur sur ce brouillon. Effectuer les changements BPMN dans cet espace de travail, puis enregistrer le brouillon.
6. Retrouver la demande dans **Mon espace → Mes demandes de modification**.

Si une demande est déjà ouverte pour cette version du processus, l’application ne crée pas une seconde demande concurrente : elle propose de reprendre la demande existante lorsque son brouillon est modifiable, ou d’en consulter le suivi lorsqu’elle est déjà soumise.

## 4. Préparer et soumettre le brouillon

Depuis **Mes demandes de modification**, ouvrir la demande à l’état **Brouillon** ou **Modifications demandées**. Le Modeleur s’ouvre sur l’espace de travail de la demande, et non sur le processus source.

Avant soumission :
- vérifier le diagramme et les éléments BPMN modifiés ;
- enregistrer les changements ;
- vérifier le pilote / validateur proposé dans les métadonnées du processus ou choisir le validateur autorisé lorsque l’interface le demande ;
- préparer un commentaire de soumission expliquant l’objet et la portée de l’évolution.

L’action de soumission exige un commentaire. Elle fige le brouillon soumis comme instantané de revue et fait passer la demande à **En attente** (*submitted*). Le contenu BPMN reste techniquement un brouillon dans l’espace de proposition : c’est l’état de la demande qui interdit sa modification pendant la revue.

Le système vérifie également que la version publiée du processus source est toujours celle qui avait été copiée au démarrage. Si elle a changé, la soumission est bloquée : il faut créer une nouvelle proposition à partir de la version publiée courante.

## 5. Revue et traitement des remarques

Le validateur désigné, ou un gestionnaire du projet autorisé, retrouve la demande dans le bloc **Demandes à traiter** de **Mes demandes de modification**.

Il peut :
1. consulter le processus source et la version proposée ;
2. utiliser **Comparer les versions** pour examiner les différences ;
3. ouvrir **Traiter dans le modeleur** pour consulter le contenu soumis et les remarques associées ;
4. examiner chaque remarque, rattachée à un identifiant d’élément BPMN ;
5. accepter ou refuser chaque remarque.

Une remarque refusée doit comporter un motif. L’auteur d’une remarque ne peut pas décider de sa propre remarque.

### Demander une précision

Si une remarque n’est pas suffisamment claire, le validateur peut demander une précision. La remarque reste en attente de décision.

- Seul l’auteur de cette remarque peut répondre.
- Tant que la réponse n’a pas été apportée, la remarque ne peut pas recevoir de décision finale.
- Après la réponse, le validateur peut accepter ou refuser la remarque.

L’historique des demandes de précision et des réponses est conservé dans les événements de la demande.

### Condition préalable à l’approbation

Toutes les remarques doivent avoir reçu une décision (acceptée ou refusée). L’approbation globale est bloquée tant qu’il reste au moins une remarque en attente.

## 6. Décision sur la proposition

Après la revue, le validateur prend l’une des décisions suivantes :

| Décision | Effet | Étape suivante |
|---|---|---|
| **Approuver** (*approved*) | La proposition est approuvée, sans encore modifier le processus source. | Un acteur habilité procède à la publication. |
| **Demander des corrections** (*changes_requested*) | La proposition revient dans un état permettant de reprendre le brouillon. Un commentaire est obligatoire. | L’auteur / modélisateur corrige, enregistre et soumet à nouveau. |
| **Refuser** (*rejected*) | La demande est clôturée. Un commentaire est obligatoire. | Une nouvelle proposition est nécessaire pour repartir sur une autre évolution. |

L’auteur de la dernière soumission ne peut pas approuver ou refuser sa propre demande. Le validateur désigné ou un administrateur du projet peut prendre la décision, selon les droits applicables.

Après une demande de corrections, ouvrir la demande depuis **Mes demandes de modification**, reprendre le brouillon, appliquer les corrections, puis le soumettre à nouveau avec un nouveau commentaire de soumission. Le cycle de revue recommence.

## 7. Publier la proposition approuvée

L’approbation et la publication sont deux étapes distinctes.

Pour publier, l’acteur habilité ouvre la proposition approuvée et utilise l’action de publication. La publication exige :
- une prévisualisation PNG du processus ;
- un commentaire général de validation / publication ;
- l’état **Approuvée** de la demande ;
- l’absence de remarque encore en attente ;
- des droits de publication toujours valides ;
- une version source qui n’a pas changé depuis la création de la demande.

La publication est réalisée dans une transaction : le contenu soumis dans l’espace de proposition est publié sur le **processus source**, la version publiée précédente est remplacée selon les règles de versionnement, et la demande passe à **Publiée** (*published*). L’historique conserve la trace de la publication et la synthèse des remarques et de leurs décisions.

L’espace de proposition n’est donc pas promu automatiquement en nouveau processus projet : c’est bien le processus source qui reçoit la nouvelle version publiée.

## 8. Déposer une remarque depuis le Viewer

Une remarque contextuelle n’est pas une proposition complète rédigée par son auteur. Elle permet à un membre autorisé de signaler un point précis sans lui donner nécessairement le droit de modifier le BPMN.

1. Ouvrir le processus dans le Viewer.
2. Sélectionner l’activité ou l’élément BPMN concerné.
3. Cliquer sur **Ajouter une remarque**.
4. Rédiger le commentaire et le déposer.

L’identifiant de l’élément BPMN et le texte de la remarque sont obligatoires. La demande est créée ou rattachée à la demande déjà ouverte pour cette version du processus. Si nécessaire, un espace de travail privé est créé à partir de la version publiée. La remarque est transmise au circuit de validation et apparaît dans le suivi de la demande.

L’auteur reste dans le Viewer : il n’est pas redirigé vers le Modeleur, car le droit de déposer une remarque ne signifie pas qu’il dispose du droit de modifier le processus.

Le modélisateur ou le validateur habilité prend ensuite en charge le traitement dans le circuit décrit aux sections 5 à 7.

## 9. Cas particulier : processus du référentiel commun

Un processus **Commun** peut être utilisé dans plusieurs projets. Une demande issue d’un projet ne doit pas modifier directement ce référentiel partagé.

- Un membre autorisé du projet peut déposer une remarque contextuelle.
- Une proposition de modification utilise un espace de travail privé, distinct du processus commun ; cet espace n’est pas ajouté comme un second processus au projet.
- La revue, les décisions sur les remarques, l’approbation et la publication d’une évolution du référentiel commun relèvent exclusivement d’un administrateur global habilité.
- La publication porte sur le processus commun source. Elle ne transforme pas automatiquement une variante projet en référence commune.

Cette séparation protège les autres projets qui utilisent le même processus.

## 10. Comprendre les états

| État technique | Libellé utilisateur | Signification |
|---|---|---|
| `draft` | Brouillon | Proposition en préparation ; son brouillon peut être repris. |
| `submitted` | En attente | Instantané soumis ; en cours de revue. |
| `approved` | Approuvée | Revue terminée ; publication encore nécessaire. |
| `changes_requested` | Modifications demandées | Corrections attendues ; le brouillon peut être repris. |
| `rejected` | Refusée | Demande clôturée sans publication. |
| `published` | Publiée | Nouvelle version publiée sur le processus source. |

Les remarques ont leur propre état : **En attente**, **Acceptée** ou **Refusée**. Leur état est indépendant de l’état global de la proposition.

## 11. Points de contrôle avant clôture

Avant de considérer une évolution terminée, vérifier que :

- [ ] la bonne version source a été utilisée comme base ;
- [ ] les modifications ont été réalisées dans l’espace de proposition ;
- [ ] le brouillon soumis correspond bien à la version relue ;
- [ ] les différences avec le processus source ont été examinées ;
- [ ] chaque remarque a été acceptée ou refusée, avec motif en cas de refus ;
- [ ] les demandes de précision ont reçu une réponse de leur auteur ;
- [ ] la décision globale a été prise par un acteur habilité et distinct du dernier soumissionnaire ;
- [ ] le commentaire général et la prévisualisation PNG sont présents à la publication ;
- [ ] la demande est à l’état **Publiée** et la nouvelle version est visible dans l’historique du processus source.

## 12. Repères techniques

Les principales routes API du circuit sont regroupées dans `ProcessChangeProposalController` :

- création / remarque : `POST /projects/:projectId/processes/:resourceId/change-proposals` ;
- soumission : `POST /projects/process-change-proposals/:proposalId/submit` ;
- décision globale : `POST /projects/process-change-proposals/:proposalId/decision` ;
- publication : `POST /projects/process-change-proposals/:proposalId/publish` ;
- consultation du contenu soumis : `GET /projects/process-change-proposals/:proposalId/content` ;
- consultation des remarques : `GET /projects/process-change-proposals/:proposalId/comments` ;
- décision sur une remarque : `POST /projects/process-change-proposals/:proposalId/comments/:commentId/decision` ;
- demande de précision : `POST /projects/process-change-proposals/:proposalId/comments/:commentId/clarification` ;
- réponse de l’auteur : `POST /projects/process-change-proposals/:proposalId/comments/:commentId/response` ;
- demandes de l’utilisateur : `GET /projects/me/process-change-proposals` ;
- demandes à traiter : `GET /projects/me/process-change-proposals/to-review`.

Fichiers de référence :
- `backend/src/modules/ProjectContext/infrastructure/controllers/process-change-proposal.controller.ts`
- `backend/src/modules/ProjectContext/infrastructure/services/process-change-proposal-content.service.ts`
- `backend/src/modules/ProjectContext/infrastructure/entities/processChangeProposal.ormEntity.ts`
- `backend/src/modules/ProjectContext/infrastructure/entities/processChangeProposalComment.ormEntity.ts`
- `frontend/src/Containers/MyProcessChangeProposals/MyProcessChangeProposals.container.tsx`
- `frontend/src/Components/BusinessComponents/ProcessDetails/ProcessDetails.tsx`
