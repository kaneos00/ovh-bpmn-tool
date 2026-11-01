import type Modeler from 'camunda-bpmn-js/lib/base/Modeler';

// Keep one import queue per live Modeler. Independent editor workflows can
// request imports, but bpmn-js must never process two importXML calls on
// the same instance concurrently.
const importQueues = new WeakMap<Modeler, Promise<void>>();

export const enqueueModelerImport = (
  modeler: Modeler,
  operation: () => Promise<void>,
): Promise<void> => {
  const previous = importQueues.get(modeler) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);

  importQueues.set(modeler, current);
  void current.then(
    () => {
      if (importQueues.get(modeler) === current) importQueues.delete(modeler);
    },
    () => {
      if (importQueues.get(modeler) === current) importQueues.delete(modeler);
    },
  );

  return current;
};
