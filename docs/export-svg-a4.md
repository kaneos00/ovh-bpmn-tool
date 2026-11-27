# Export SVG BPMN paginé A4

## Utilisation

Dans le modeleur, ouvrir **Export** puis choisir **SVG A4 (portrait)** ou **SVG A4 (paysage)**. Chaque page est téléchargée comme un fichier SVG autonome, nommé avec la ressource, la version, l'orientation et le numéro de page.

L'export SVG classique et l'export BPMN XML restent disponibles indépendamment.

## Moteur V1

Le moteur est dans `frontend/src/shared/utils/paginatedBpmnSvg.ts`.

- `orientation` détermine les dimensions A4 et le nombre de tuiles ;
- `fontFamily` et `fontSizeMm` règlent la typographie des en-têtes, numéros de page et repères ;
- les dimensions du `viewBox`, l’orientation et les options typographiques sont validées avant génération ;
- un plafond de 500 pages par export évite les allocations démesurées et les centaines de téléchargements accidentels ; au-delà, le diagramme doit être exporté par sections ;
- le SVG du modeleur est découpé par viewBox en pages, sans modifier le XML BPMN source ;
- le moteur cherche à déplacer les limites de page vers un espace libre proche, afin d'éviter autant que possible de couper une activité, un événement ou une passerelle ;
- les pools et les lanes très larges ne bloquent pas la pagination ;
- les pages affichent un titre, leur numéro et des indications de reprise/continuation sur les bords concernés.

Les repères de continuation sont des annotations éditoriales dans les SVG exportés, pas des événements BPMN ajoutés au processus. Les flux qui traversent une coupure restent issus du diagramme d'origine.

## Vérifications

Les tests unitaires couvrent le calcul du nombre de pages en portrait/paysage, les diagrammes courts, larges et multi-pages, ainsi que le rejet de dimensions invalides. Les workflows GitHub Actions couvrent aussi lint, build frontend, tests backend, régressions frontend et images de déploiement Coolify.

## Limites connues de la V1

- Le découpage est géométrique ; il n'effectue pas encore de re-layout du processus pour réorganiser les activités entre les pages.
- Les limites évitent les formes BPMN quand une coupure sûre est trouvée à proximité ; un diagramme dense peut encore imposer une coupure traversant un élément ou un flux.
- Chaque page est un téléchargement séparé. Selon le navigateur, les téléchargements multiples peuvent devoir être autorisés.
- L'aperçu de toutes les pages avant téléchargement reste hors périmètre V1 (P2).
- Les règles fines de lisibilité et de choix automatique de l'orientation restent des paramètres/décisions à affiner après retour sur des processus réels.
