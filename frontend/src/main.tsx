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

          // ANCIEN CODE INCORRECT :
          // additionalModules: [
          //   ...(options.modelerOptions?.additionalModules ?? []),
          //   UrlClickModule,
          // ],

          // AJOUT : enregistrement du module personnalisé.
          // BpmnToolOptions utilise "modules".
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
    />,
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
import UrlClickModule from './extensions/url-click-module';
import RechercheModule from './extensions/recherche/recherche-module';
import { createRepositoryRechercheProvider } from './extensions/recherche/recherche-repository-provider';
import LaneOrientationPropertiesProvider from './extensions/lane-orientation-properties-provider';
import BpmnColorPickerModule from 'bpmn-js-color-picker';
import CommentsModule from 'bpmn-js-embedded-comments';
import GridModule from 'diagram-js-grid';
import MinimapModule from 'diagram-js-minimap';

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

          modules: [
            ...(options.modelerOptions?.modules ?? []),
            {
              declaration: UrlClickModule,
            },
            {
              declaration: RechercheModule,
            },
          ],
        },
      }}
    />,
  );
};
