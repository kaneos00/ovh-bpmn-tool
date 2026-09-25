/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import React, { createContext, ReactElement } from 'react';
import { ModdleExtensions } from 'bpmn-js/lib/BaseViewer';
import { ModuleDeclaration } from 'camunda-bpmn-js/lib/base/Modeler';

export type BpmnToolOptions = {
  modelerOptions?: {
    extensions?: ModdleExtensions;
    modules?: {
      disabledInViewer?: boolean;
      declaration: ModuleDeclaration;
    }[];
    providers?: {
      priority?: number;
      instance: new () => unknown;
    }[];
    diff?: {
      changeHandler?: unknown;
    };
    linting?: {
      active?: boolean;
      bpmnlint: unknown;
    };
  };
};

export const BpmnToolOptionsContext = createContext<BpmnToolOptions>(
  {} as BpmnToolOptions,
);

export const BpmnToolOptionsProvider = ({
  children,
  options,
}: {
  children: ReactElement;
  options: BpmnToolOptions;
}) => {
  return (
    <BpmnToolOptionsContext.Provider value={options}>
      {children}
    </BpmnToolOptionsContext.Provider>
  );
};


============================================================
FIN ANCIENNE VERSION
============================================================
*/

import React, { createContext, ReactElement } from 'react';
import { ModdleExtensions } from 'bpmn-js/lib/BaseViewer';
import { ModuleDeclaration } from 'camunda-bpmn-js/lib/base/Modeler';
import type { RechercheProvider } from '../../extensions/recherche/recherche-service';

export type BpmnToolOptions = {
  modelerOptions?: {
    extensions?: ModdleExtensions;
    modules?: {
      disabledInViewer?: boolean;
      declaration: ModuleDeclaration;
    }[];
    providers?: {
      priority?: number;
      instance: new () => unknown;
    }[];
    diff?: {
      changeHandler?: unknown;
    };
    linting?: {
      active?: boolean;
      bpmnlint: unknown;
    };
    rechercheProvider?: RechercheProvider;
  };
};

export const BpmnToolOptionsContext = createContext<BpmnToolOptions>(
  {} as BpmnToolOptions,
);

export const BpmnToolOptionsProvider = ({
  children,
  options,
}: {
  children: ReactElement;
  options: BpmnToolOptions;
}) => {
  return (
    <BpmnToolOptionsContext.Provider value={options}>
      {children}
    </BpmnToolOptionsContext.Provider>
  );
};
