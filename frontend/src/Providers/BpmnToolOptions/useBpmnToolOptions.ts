import { useCallback, useContext } from 'react';
import { BpmnToolOptionsContext } from './BpmnToolOptions.provider';

export const useBpmnToolOptions = () => {
  const { modelerOptions } = useContext(BpmnToolOptionsContext);

  const getModelerExtensions = useCallback(
    () => modelerOptions?.extensions ?? {},
    [modelerOptions?.extensions],
  );

  const getModelerModules = useCallback(
    (forViewer: boolean = false) => {
      let modules = modelerOptions?.modules ?? [];
      if (forViewer) {
        modules = modules.filter(({ disabledInViewer }) => !disabledInViewer);
      }
      return modules.map(({ declaration }) => declaration);
    },
    [modelerOptions?.modules],
  );

  const getModelerProviders = useCallback(
    () =>
      (modelerOptions?.providers ?? []).map(provider => ({
        priority: 500,
        ...provider,
      })),
    [modelerOptions?.providers],
  );

  const getModelerDiffChangeHandler = useCallback(
    () => modelerOptions?.diff?.changeHandler,
    [modelerOptions?.diff?.changeHandler],
  );

  const getRechercheProvider = useCallback(
    () => modelerOptions?.rechercheProvider,
    [modelerOptions?.rechercheProvider],
  );

  const getModelerLinting = useCallback(
    () => modelerOptions?.linting || { active: false },
    [modelerOptions?.linting],
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
