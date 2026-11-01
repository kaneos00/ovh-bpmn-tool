export type ProcessDataUsage = {
  id: string;
  bpmnType?: string;
  associations?: ReadonlyArray<{ direction: 'input' | 'output' }>;
};

export type ProcessDataSummary = {
  sourceCount: number;
  inputCount: number;
  outputCount: number;
};

/**
 * Summarizes the existing BPMN data inventory without changing or duplicating
 * its source records. A source can be both an input and an output.
 */
export const summarizeProcessData = (
  sources: readonly ProcessDataUsage[],
): ProcessDataSummary => {
  const sourceIds = new Set<string>();
  const inputIds = new Set<string>();
  const outputIds = new Set<string>();

  sources.forEach(source => {
    if (!source.id) return;
    sourceIds.add(source.id);

    if (
      source.bpmnType === 'dataInput' ||
      source.associations?.some(association => association.direction === 'input')
    ) {
      inputIds.add(source.id);
    }

    if (
      source.bpmnType === 'dataOutput' ||
      source.associations?.some(association => association.direction === 'output')
    ) {
      outputIds.add(source.id);
    }
  });

  return {
    sourceCount: sourceIds.size,
    inputCount: inputIds.size,
    outputCount: outputIds.size,
  };
};
