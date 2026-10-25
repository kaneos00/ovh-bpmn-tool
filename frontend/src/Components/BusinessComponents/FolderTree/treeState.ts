export const EXPANDED_NODES_STORAGE_KEY = 'bpmn-tool:expanded-nodes';

type StorageReader = Pick<Storage, 'getItem'>;

export const addExpandedNode = (expandedNodes: readonly string[], nodeId: string): string[] =>
  expandedNodes.includes(nodeId) ? [...expandedNodes] : [...expandedNodes, nodeId];

export const removeExpandedNode = (expandedNodes: readonly string[], nodeId: string): string[] =>
  expandedNodes.filter(id => id !== nodeId);

export const mergeExpandedNodes = (
  expandedNodes: readonly string[],
  ancestors: readonly string[],
): string[] => Array.from(new Set([...expandedNodes, ...ancestors]));

export const readExpandedNodeIds = (storage: StorageReader): string[] => {
  try {
    const value = storage.getItem(EXPANDED_NODES_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((id): id is string => typeof id === 'string')))
      : [];
  } catch {
    return [];
  }
};
