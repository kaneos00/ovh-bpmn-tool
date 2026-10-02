# V0.2 — Base fonctionnelle de référence

## Référence

V0.2 est la nouvelle base fonctionnelle de référence du projet.

- Commit de départ : `496e1a551473d2d23cc3331afd30e5f88657446f`
- Ancienne référence Search : `6cce15d00961e30f21769acd6cc731a43fd138ff`
- Branche : `v0.2`

Cette version est retenue comme base de travail pour les prochaines évolutions. Elle n'est pas une fusion de `6cce15d` et `496e1a5` : elle correspond exactement à l'état de `496e1a5`.

## Pourquoi V0.2 ?

Les tests fonctionnels ont montré que `496e1a5` constitue actuellement la base la plus cohérente pour poursuivre le développement.

Elle intègre notamment plusieurs corrections liées au Viewer et à la sélection des éléments :

- activation de la sélection des éléments dans le Viewer ;
- résolution de l'import du module de sélection ;
- utilisation du module de sélection intégré au Viewer ;
- arrêt des boucles de retry lorsque l'identifiant d'un élément recherché est invalide ;
- conservation de la navigation vers l'élément recherché.

## Écarts connus à traiter après V0.2

Deux problèmes de sélection restent identifiés et constituent les prochains sujets de diagnostic :

1. **Viewer lancé directement**
   - le diagramme est affiché ;
   - les éléments ne sont pas immédiatement sélectionnables ;
   - après passage par le Modeler puis retour au Viewer, la sélection fonctionne.

2. **Sélection après une recherche**
   - la navigation vers le bon processus et le bon élément fonctionne ;
   - l'élément cible n'est pas toujours sélectionné visuellement/fonctionnellement.

Ces problèmes ne sont pas corrigés dans V0.2. Ils doivent être traités par diagnostic de la cause racine, sans réintroduire de boucles de retry arbitraires.

## Évolution par rapport à 6cce15d

`6cce15d` reste conservé comme référence historique validée du plugin Recherche.

V0.2 privilégie cependant l'état de `496e1a5`, qui contient les corrections Viewer introduites dans son historique et qui s'est montré plus fonctionnel lors des tests.

Les deux références ne doivent pas être fusionnées sans analyse préalable.

## Règle de développement à partir de V0.2

Les prochaines évolutions doivent partir de cette base de référence et être réalisées dans des branches dédiées.

Avant toute modification fonctionnelle importante :

1. vérifier le commit de base ;
2. identifier précisément le comportement à modifier ;
3. éviter les mécanismes de retry destinés à masquer un problème de cycle de vie ou d'initialisation ;
4. valider le comportement du Viewer et du Modeler séparément ;
5. documenter chaque évolution dans son commit.

## Historique court

```text
1d95b2b
   ├── 6cce15d  → ancienne référence Search validée
   └── 496e1a5  → V0.2 / nouvelle base fonctionnelle
```

V0.2 sert désormais de point de départ pour la suite du développement du dépôt.
