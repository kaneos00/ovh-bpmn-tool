export const expandTreeNode = (expandedNodes: string[], nodeId: string): string[] =>
  expandedNodes.includes(nodeId) ? expandedNodes : [...expandedNodes, nodeId];

export const toggleTreeNode = (expandedNodes: string[], nodeId: string): string[] =>
  expandedNodes.includes(nodeId)
    ? expandedNodes.filter(id => id !== nodeId)
    : [...expandedNodes, nodeId];
