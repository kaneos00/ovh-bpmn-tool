export type FolderHierarchyIssue = {
  type: 'missing-parent' | 'cycle' | 'depth-mismatch';
  resourceId: string;
  parentId?: string;
  expectedDepth?: number;
  actualDepth: number;
};

type FolderLike = {
  id: string;
  parentId?: string | null;
  depth: number;
};

/**
 * Read-only integrity audit for the folder list used by the explorer.
 * It deliberately does not repair or mutate resources.
 */
export const auditFolderHierarchy = (folders: FolderLike[]): FolderHierarchyIssue[] => {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const issues: FolderHierarchyIssue[] = [];

  folders.forEach(folder => {
    let parentId = folder.parentId || 'root';
    let expectedDepth = 1;
    let canCompareDepth = true;
    const visited = new Set([folder.id]);

    while (parentId && parentId !== 'root') {
      if (visited.has(parentId)) {
        issues.push({
          type: 'cycle',
          resourceId: folder.id,
          parentId,
          actualDepth: folder.depth,
        });
        canCompareDepth = false;
        break;
      }

      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) {
        issues.push({
          type: 'missing-parent',
          resourceId: folder.id,
          parentId,
          actualDepth: folder.depth,
        });
        canCompareDepth = false;
        break;
      }

      expectedDepth += 1;
      parentId = parent.parentId || 'root';
    }

    if (canCompareDepth && folder.depth !== expectedDepth) {
      issues.push({
        type: 'depth-mismatch',
        resourceId: folder.id,
        expectedDepth,
        actualDepth: folder.depth,
      });
    }
  });

  return issues;
};
