# Check V2.1 — état d'avancement des corrections

Dernière mise à jour : 23 octobre 2026  
Dépôt : [kaneos00/ovh-bpmn-tool](https://github.com/kaneos00/ovh-bpmn-tool)  
Branche de référence : `work/v2.1-reprise-2026-10-21`

## Légende

- **Traité** : une modification de code a été poussée.
- **Testé** : un test fonctionnel a été explicitement rapporté comme effectué.
- **À reprendre** : comportement encore incorrect, validation incomplète ou test de non-régression nécessaire.

Ce tableau distingue volontairement l'existence d'un correctif de sa validation fonctionnelle. Une CI verte valide les contrôles automatisés exécutés, pas tous les parcours dans le navigateur.

## Tableau de suivi

| Point | Traité dans le code ? | Correction testée ? | État actuel / reste à faire |
|---|---|---|---|
| **Minimap BPMN** | **Oui, retouchée plusieurs fois** : ouverture après import, fermeture par défaut, synchronisation du bouton, puis commit `37575a4` qui retire un effet de synchronisation. | **Partiellement** : le commit `37575a4` a été signalé comme testé. Pas de preuve que tous les scénarios sont couverts. | **À revalider** : ouverture d'un processus = minimap fermée ; import = minimap fermée ; boutons +/- ou commande prévue = affichage/masquage manuel fonctionnel. Vérifier qu'aucune ouverture automatique ni désynchronisation du bouton n'a été réintroduite. |
| **Hauteur et alignement des trois panneaux** | **Oui, retouches successives** dans plusieurs commits et PR #26 (`fix/v2.1-viewer-panels`). | **Partiellement** : la version a été jugée globalement correcte, mais le débordement inférieur du panneau central a été signalé. | **À traiter** : corriger/diagnostiquer le léger débordement du diagramme central. Recontrôler l'alignement gauche/centre/droite, l'utilisation de la hauteur disponible, l'espace maximal pour le BPMN et la persistance des panneaux après reconnexion. PR #26 ouverte, non fusionnée au dernier contrôle. |
| **Explorateur et navigation** | **Oui** : retrait de l'ancienne zone et retouches du parcours explorateur/racine/fil d'Ariane dans la branche de reprise et la PR #25. | **Partiellement** : emplacement de l'explorateur jugé correct ; le bouton Home vers le Référentiel fonctionne. | **À traiter** : clic sur un dossier/référentiel sous un dossier renvoie encore vers l'ancienne page de liste de processus au lieu de développer/replier les enfants. Tester aussi les dossiers vides, le fil d'Ariane et le retour à la racine. PR #25 ouverte et en brouillon, non fusionnée au dernier contrôle. |
| **Activités d'appel BPMN** | **Oui, retouchées plusieurs fois** : simple clic/sélection, double-clic/navigation, curseur et indicateur bleu. | **Partiellement / non concluante** : les changements existent, mais les derniers retours signalent des processus appelés en double et des clignotements/rechargements. | **À diagnostiquer** : confirmer simple clic = sélection sans navigation ; second clic/désélection selon le comportement attendu ; double-clic = ouverture de la cible ; indicateur bleu seulement sur l'activité sélectionnée. Vérifier surtout la résolution de `calledElement` vers l'identifiant de ressource : le hook de navigation utilise actuellement directement `calledElement` comme ID de ressource, ce qui reste à confirmer. |
| **Récents et Favoris / doublons** | **Oui** : commits `c5ce338` et `4d095fe` ajoutent/corrigent la résolution des processus appelés dans la liste. | **Partiellement** : le commit `4d095fe` a été testé, mais des doublons de processus appelés ont ensuite été signalés. | **À traiter** : identifier l'origine des doublons, distinguer les identifiants de nœuds de l'arbre et les identifiants de ressources, puis vérifier que les processus appelés attendus apparaissent une seule fois. |
| **CI de la branche de reprise** | **Oui** : le commit de documentation `4c39aea` a également une exécution Validate réussie. Le commit de code `4d095fe` avait aussi une CI réussie. | **Oui pour les contrôles automatisés** ; cela ne remplace pas les tests navigateur/Coolify. | **Ne pas confondre avec une recette complète** : les vérifications fonctionnelles encore listées ci-dessus restent nécessaires. Pas de fusion ni de déploiement demandé par ce fichier. |

## Liens de référence

- [Note d'audit détaillée](docs/audits/audit-v2.1-points-a-revoir-2026-10-23.md)
- [PR #25 — explorateur du Viewer](https://github.com/kaneos00/ovh-bpmn-tool/pull/25)
- [PR #26 — panneaux du Viewer](https://github.com/kaneos00/ovh-bpmn-tool/pull/26)
- [Commit `37575a4` — comportement de la minimap](https://github.com/kaneos00/ovh-bpmn-tool/commit/37575a4e54d7b2eabeb37bcf4ab9bdbe731b8ee3)
- [CI Validate — commit `4c39aea`](https://github.com/kaneos00/ovh-bpmn-tool/actions/runs/39934036308)

## Ordre conseillé pour la reprise

1. Reproduire et corriger le clic dossier / navigation vers l'ancienne page.
2. Résoudre les doublons et confirmer la correspondance `calledElement` → ressource.
3. Corriger le débordement du panneau central et vérifier la persistance des panneaux.
4. Refaire la recette minimap, puis exécuter la recette de non-régression complète.
5. Mettre à jour ce tableau avec la date, le commit testé et le résultat concret de chaque scénario.

**Règle de suivi :** ne marquer une ligne « testée » comme validée que si le scénario a été exécuté dans l'application et que son résultat est explicitement confirmé. Ne pas fusionner ni déployer sur la seule base d'une CI verte.
