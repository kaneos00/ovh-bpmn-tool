/*
============================================================
CONFIGURATION ACTUELLE DE LA BRANCHE — conservée pour comparaison / retour arrière
============================================================

La configuration Recherche / extensions ajoutée par cette branche est conservée
ci-dessous. Pour ce diagnostic, on revient volontairement au bootstrap fonctionnel
historique afin d'isoler le problème de navigation / création des ressources.

import UrlModel from './extensions/url-model';
import UrlPropertiesProvider from './extensions/url-properties-provider';
import { createRepositoryRechercheProvider } from './extensions/recherche/recherche-repository-provider';
import LaneOrientationPropertiesProvider from './extensions/lane-orientation-properties-provider';

// ... configuration modelerOptions ajoutée par la branche ...

============================================================
FIN CONFIGURATION ACTUELLE
============================================================
*/

import React from 'react';
import { createRoot } from 'react-dom/client';

import { MainContainer } from './MainContainer';
import { BpmnToolOptions } from './Providers/BpmnToolOptions';

export const bootstrapBpmnTool = (options: BpmnToolOptions = {}) => {
  createRoot(document.getElementById('root')!).render(
    <MainContainer options={options} />,
  );
};
