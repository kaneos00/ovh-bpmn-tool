/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import React from 'react';
import { createRoot } from 'react-dom/client';

import { MainContainer } from './MainContainer';
import { BpmnToolOptions } from './Providers/BpmnToolOptions';

import UrlModel from './extensions/url-model';
import UrlPropertiesProvider from './extensions/url-properties-provider';

// AJOUT : module qui détecte le clic sur un élément BPMN
import UrlClickModule from './extensions/url-click-module';

export const bootstrapBpmnTool = (options: BpmnToolOptions = {}) => {
  createRoot(document.getElementById('root')!).render(
    <MainContainer
      options={{
        ...options,
        modelerOptions: {
          ...options.modelerOptions,

          extensions: {
            ...options.modelerOptions?.extensions,
            ...UrlModel,
          },

          providers: [
            ...(options.modelerOptions?.providers ?? []),
            {
              priority: 500,
              instance: UrlPropertiesProvider,
            },
          ],

          modules: [
            ...(options.modelerOptions?.modules ?? []),
            {
              declaration: MinimapModule,
            },
            {
              disabledInViewer: true,
              declaration: GridModule,
            },
            {
              disabledInViewer: true,
              declaration: BpmnColorPickerModule,
            },
            {
              disabledInViewer: true,
              declaration: CommentsModule,
            },
            {
              declaration: UrlClickModule,
            },
          ],
        },
      }}
    />
  );
};

============================================================
FIN ANCIENNE VERSION
============================================================
*/

import React from 'react';
import { createRoot } from 'react-dom/client';

import { MainContainer } from './MainContainer';
import { BpmnToolOptions } from './Providers/BpmnToolOptions';

import UrlModel from './extensions/url-model';
import UrlPropertiesProvider from './extensions/url-properties-provider';
import { createRepositoryRechercheProvider } from './extensions/recherche/recherche-repository-provider';
import LaneOrientationPropertiesProvider from './extensions/lane-orientation-properties-provider';

export const bootstrapBpmnTool = (options: BpmnToolOptions = {}) => {
  createRoot(document.getElementById('root')!).render(
    <MainContainer
      options={{
        ...options,
        modelerOptions: {
          ...options.modelerOptions,

          extensions: {
            ...options.modelerOptions?.extensions,
            ...UrlModel,
          },

          providers: [
            ...(options.modelerOptions?.providers ?? []),
            {
              priority: 500,
              instance: UrlPropertiesProvider,
            },
            {
              priority: 501,
              instance: LaneOrientationPropertiesProvider,
            },
          ],

          rechercheProvider:
            options.modelerOptions?.rechercheProvider ??
            createRepositoryRechercheProvider(),

          /*
          TEST DIAGNOSTIQUE : tous les modules ajoutés par cette branche
          sont temporairement désactivés pour vérifier l'éditabilité native
          du Modeler. Les modules éventuellement fournis par l'intégration
          hôte restent conservés.

          ANCIENNE CONFIGURATION ACTIVE :
          modules: [
            ...(options.modelerOptions?.modules ?? []),
            { declaration: UrlClickModule },
            { declaration: RechercheModule },
            { disabledInViewer: true, declaration: MinimapModule },
            { declaration: NavigationControlsModule },
          ],
          */
          modules: [...(options.modelerOptions?.modules ?? [])],
        },
      }}
    />,
  );
};
