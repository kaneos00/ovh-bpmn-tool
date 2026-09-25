/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

import { useContext } from 'react';
import { BpmnToolOptionsContext } from './BpmnToolOptions.provider';

export const useBpmnToolOptions = () => {
  const { modelerOptions } = useContext(BpmnToolOptionsContext);

  const getModelerExtensions = () => modelerOptions?.extensions ?? {};

  const getModelerModules = (forViewer: boolean = false) => {
    let modules = modelerOptions?.modules ?? [];
    if (forViewer) {
      modules = modules.filter(({ disabledInViewer }) => !disabledInViewer);
    }
    return modules.map(({ declaration }) => declaration);
  };

  const getModelerProviders = () => {
    return (modelerOptions?.providers ?? []).map(provider => ({
      priority: 500,
      ...provider,
    }));
  };

  const getModelerDiffChangeHandler = () => {
    return modelerOptions?.diff?.changeHandler;
  };

  const getRechercheProvider = () => modelerOptions?.rechercheProvider;

  const getModelerLinting = () => (
    modelerOptions?.linting || { active: false }
  );

  return {
    getModelerExtensions,
    getModelerModules,
    getModelerProviders,
    getModelerDiffChangeHandler,
    getModelerLinting,
    getRechercheProvider,
  };
};

============================================================
FIN ANCIENNE VERSION
============================================================
*/

import { useCallback, useContext } from 'react';
import { BpmnToolOptionsContext } from './BpmnToolOptions.provider';

export const useBpmnToolOptions = () => {
  const { modelerOptions } = useContext(BpmnToolOptionsContext);

  const getModelerExtensions = () => modelerOptions?.extensions ?? {};

  const getModelerModules = (forViewer: boolean = false) => {
    let modules = modelerOptions?.modules ?? [];
    if (forViewer) {
      modules = modules.filter(({ disabledInViewer }) => !disabledInViewer);
    }
    return modules.map(({ declaration }) => declaration);
  };

  const getModelerProviders = () => {
    return (modelerOptions?.providers ?? []).map(provider => ({
      priority: 500,
      ...provider,
    }));
  };

  const getModelerDiffChangeHandler = () => {
    return modelerOptions?.diff?.changeHandler;
  };

  const getRechercheProvider = useCallback(
    () => modelerOptions?.rechercheProvider,
    [modelerOptions?.rechercheProvider],
  );

  const getModelerLinting = () => (
    modelerOptions?.linting || { active: false }
  );

  return {
    getModelerExtensions,
    getModelerModules,
    getModelerProviders,
    getModelerDiffChangeHandler,
    getModelerLinting,
    getRechercheProvider,
  };
};
