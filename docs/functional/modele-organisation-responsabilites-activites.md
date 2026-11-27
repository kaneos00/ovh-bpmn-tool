Dans ce cas, je ferais évoluer légèrement le modèle : il ne s'agit plus seulement de construire un organigramme avec des fiches de poste, mais un **référentiel organisationnel qui relie la structure de l'entreprise à ses processus et aux activités réellement réalisées par les collaborateurs**.

C'est une approche particulièrement intéressante, car elle permet de répondre à quatre questions différentes :

1. Comment l'entreprise est-elle organisée ?
2. Quelles responsabilités sont attachées à chaque poste ?
3. Dans quels processus ces responsabilités sont-elles exercées ?
4. Qui réalise effectivement les activités au quotidien ?

Je conserverais néanmoins une règle fondamentale : **la personne ne définit jamais l'organisation ; elle est affectée à une partie de l'organisation et de ses responsabilités.**

# 1. Le modèle cible : 5 niveaux

Je te propose cette architecture :

1. **ORGANISATION**
   - Directions, services, unités
2. **POSTES**
   - Positions indépendantes des personnes
3. **RESPONSABILITÉS**
   - Maximum 4 par poste
4. **ACTIVITÉS / TÂCHES**
   - Maximum 4 par responsabilité
5. **AFFECTATIONS**
   - Personnes réalisant tout ou partie des activités

Les processus BPMN viennent se rattacher aux activités et responsabilités concernées.

# 2. Le point essentiel : ne pas confondre responsabilité et activité BPMN

Il faut maintenir deux référentiels distincts, mais reliés.

**Le référentiel organisationnel** décrit ce que l'entreprise doit faire et qui en porte la responsabilité.

**Le référentiel des processus** décrit comment le travail est effectivement réalisé.

Prenons un exemple.

**Poste : Directeur commercial**

**Responsabilité R2 : Piloter le développement commercial et la cellule BizDev**

| Activités rattachées à R2 | Processus concernés |
|---|---|
| A1. Identifier les opportunités | Prospection commerciale |
| A2. Qualifier les opportunités | Qualification des affaires |
| A3. Piloter la réalisation des POC | Réalisation des POC |
| A4. Évaluer les résultats et décider des suites | Validation des POC |

**Dans les processus BPMN :**

- Le commercial réalise la qualification.
- Le responsable BizDev coordonne le POC.
- Le responsable technique contribue à sa réalisation.
- Le directeur commercial supervise.
- Le directeur général valide les engagements qui relèvent de son autorité.

Tu remarqueras que le directeur commercial reste responsable de son domaine, même s'il ne réalise pas personnellement toutes les activités.

C'est exactement la distinction qu'il faut préserver.

# 3. Comment gérer le lien entre postes et processus ?

Je recommande une relation plusieurs-à-plusieurs.

- Un poste peut contribuer à plusieurs processus.
- Un processus peut mobiliser plusieurs postes.
- Une activité organisationnelle peut être mobilisée dans plusieurs processus.
- Une tâche BPMN peut être rattachée à une activité organisationnelle.

C'est important : il ne faut surtout pas recopier les activités dans chaque processus.

Voici le fonctionnement :

**Référentiel organisationnel**

Poste : Directeur commercial

Responsabilité : Piloter le développement commercial

Activité : Qualifier les opportunités

**Association réutilisable**

- **Processus A** : Prospection commerciale
  - Tâche BPMN : Qualifier une opportunité
- **Processus B** : Gestion d'une demande entrante
  - Tâche BPMN : Qualifier une opportunité

Les deux tâches BPMN peuvent pointer vers la même activité du référentiel organisationnel.

Ainsi, si la responsabilité évolue, tu ne dois pas réécrire tous les processus.

# 4. Comment gérer les personnes qui réalisent réellement le travail ?

C'est là que je ferais une distinction supplémentaire entre deux notions :

- **Le poste responsable** : celui qui porte la responsabilité organisationnelle.
- **Le contributeur opérationnel** : la personne qui réalise tout ou partie de l'activité.

Par exemple :

| Activité | Poste responsable | Personnes contributrices |
|---|---|---|
| Identifier les opportunités | Directeur commercial | Commercial A, Commercial B |
| Qualifier les opportunités | Directeur commercial | Commercial A |
| Piloter les POC | Directeur commercial | Responsable BizDev |
| Réaliser les POC | Responsable technique | Technicien A, Technicien B |
| Valider les engagements | Directeur général | Directeur général |

Il faut pouvoir affecter plusieurs personnes à une activité, mais aussi plusieurs activités à une personne.

Une personne peut donc travailler sur plusieurs domaines sans que cela implique de créer plusieurs postes dans l'organigramme.

Je recommande également de distinguer :

- Le responsable de l'activité.
- Le ou les réalisateurs.
- Les contributeurs ponctuels.
- Les personnes qui valident.

On retrouve ainsi une logique proche du RACI, mais avec un avantage : les responsabilités sont d'abord définies au niveau organisationnel, puis les personnes sont affectées.

**Attention :** je ne ferais pas une matrice RACI complète pour chaque tâche de chaque processus dès le départ. Ce serait beaucoup trop lourd pour 50 personnes.

# 5. La structure de données que je construirais

Je retiendrais finalement six objets métier.

| Objet | Contenu |
|---|---|
| Organisation | Services, directions et rattachements |
| Poste | Mission, rattachement, titulaire théorique |
| Responsabilité | Les 4 responsabilités maximum du poste |
| Activité | Les 4 activités maximum de chaque responsabilité |
| Personne | Collaborateurs de l'entreprise |
| Affectation | Liens entre personnes, postes et activités |

Et deux relations complémentaires :

1. Association activité organisationnelle ↔ tâche BPMN.
2. Association personne ↔ activité, avec son rôle opérationnel.

Cela évite de mélanger les données organisationnelles avec les données des processus.

# 6. Comment représenter cela dans les BPMN ?

Je recommande une règle très importante :

**Les couloirs BPMN représentent les postes ou les rôles organisationnels, jamais les noms des personnes.**

Par exemple :

**Processus : Réaliser un POC commercial**

**Couloir : Directeur commercial**
- Définir les objectifs du POC
- Superviser le POC

**Couloir : Responsable BizDev**
- Organiser le POC
- Suivre sa réalisation

**Couloir : Responsable technique**
- Réaliser les travaux techniques
- Évaluer les résultats techniques

Illustration fonctionnelle simplifiée, pas une notation BPMN complète.

Dans une vue complémentaire, on peut afficher les personnes affectées aux tâches, sans toucher au diagramme de référence.

Cela permet de conserver des processus stables malgré les mouvements de personnel.

# 7. Les indicateurs que le système pourrait produire

C'est là que le modèle devient réellement intéressant pour la direction.

Avec les six objets et les associations proposées, tu peux obtenir automatiquement :

| Indicateur | Question à laquelle il répond |
|---|---|
| Couverture des responsabilités | Toutes les responsabilités ont-elles un porteur ? |
| Couverture des activités | Toutes les activités sont-elles réalisées par quelqu'un ? |
| Surcharge | Certaines personnes cumulent-elles trop d'activités ? |
| Dépendance | Certaines activités reposent-elles sur une seule personne ? |
| Doublons | Plusieurs personnes réalisent-elles la même activité sans justification ? |
| Écart organisationnel | Des activités sont-elles réalisées sans être prévues dans les fiches de poste ? |
| Processus sans responsable | Certaines tâches BPMN ne sont-elles pas rattachées à aucun rôle ? |

Attention : pour mesurer la surcharge, il faudra éventuellement ajouter une estimation de charge ou une quotité d'intervention. Le simple nombre d'activités ne suffit pas.

# 8. Ma proposition d'architecture définitive

Pour éviter de construire une usine à gaz, je retiendrais cette organisation dans ton futur outil :

1. **Organigramme**
   - Visualisation des directions, services et postes.
2. **Référentiel des postes**
   - Fiches de poste, missions et rattachements hiérarchiques.
3. **Responsabilités et activités**
   - Les 4 responsabilités et les 4 activités maximum par responsabilité.
4. **Collaborateurs et affectations**
   - Postes occupés et activités effectivement réalisées par les personnes.
5. **Cartographie des processus**
   - Liens entre responsabilités, activités organisationnelles et tâches BPMN.
6. **Tableau de bord organisationnel**
   - Couverture, répartition, dépendances et écarts.

# 9. Une dernière décision de conception importante

Je te conseille de ne pas confondre les deux affectations suivantes :

- **Affectation structurelle** : Marie occupe le poste de directeur commercial à 100 %.
- **Affectation opérationnelle** : Marie réalise 30 % de l'activité de pilotage des POC, 20 % du développement commercial, etc.

Les deux informations sont complémentaires, mais elles ne sont pas équivalentes.

Il faut aussi permettre à une personne de contribuer à une activité sans en être responsable.

---

**Mon avis :** cette architecture est suffisamment structurée pour une entreprise de 50 personnes et pourra évoluer sans refonte.

Elle apporte surtout une distinction fondamentale : l'entreprise définit les postes, les postes définissent les responsabilités, les responsabilités se déclinent en activités, les processus utilisent ces activités et les collaborateurs sont affectés à leur réalisation.

C'est cette chaîne qui doit constituer le socle du référentiel.

Je ferais de ce modèle le référentiel commun entre l'organigramme, les fiches de poste, la gestion des responsabilités et la cartographie BPMN, plutôt que de développer quatre systèmes indépendants.

## Une dernière question de conception

Il y a deux façons de concevoir les quatre responsabilités de chaque poste :

- **Option A – Responsabilités métier :** elles décrivent les grands domaines dont le poste est responsable. Exemple : développer le portefeuille clients, piloter les POC, gérer les partenariats.
- **Option B – Responsabilités de management :** elles distinguent systématiquement la stratégie, le pilotage, la réalisation et le contrôle.

Je privilégierais nettement **l'option A**, avec les responsabilités adaptées à chaque poste. Les fonctions de management, de pilotage et de contrôle sont intégrées lorsqu'elles correspondent réellement à sa mission.

Cela évite d'avoir des fiches de poste artificiellement standardisées et permet de conserver une organisation lisible.
