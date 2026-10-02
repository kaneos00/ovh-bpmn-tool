import React from 'react';
import { createRoot } from 'react-dom/client';

import { MainContainer } from './MainContainer';
import { BpmnToolOptions } from './Providers/BpmnToolOptions';

import UrlModel from './extensions/url-model';
import UrlPropertiesProvider from './extensions/url-properties-provider';
import UrlClickModule from './extensions/url-click-module';
import LaneOrientationPropertiesProvider from './extensions/lane-orientation-properties-provider';
import './raci.css';
import RaciModel from './extensions/raci-model.json';
import RaciPropertiesProvider from './extensions/raci-properties-provider';

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
            RaciModel,
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
            {
              priority: 502,
              instance: RaciPropertiesProvider,
            },
          ],
          modules: [
            ...(options.modelerOptions?.modules ?? []),
            {
              declaration: UrlClickModule,
            },
          ],
        },
      }}
    />,
  );
};
