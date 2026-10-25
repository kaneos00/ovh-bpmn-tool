export type FolderRecord = {
  id: string;
  name: string;
  type: string;
  depth: number;
  parentId?: string | null;
};

export type FolderHierarchyIssue = {
  code: 'cycle' | 'missing-folder' | 'missing-parent' | 'parent-not-folder' | 'depth-mismatch';
  resourceId: string;
  parentId?: string;
  expectedDepth?: number;
  actualDepth?: number;
};

export type FolderHierarchyResult = {
  hierarchy: FolderRecord[];
  issues: FolderHierarchyIssue[];
};

/**
 * Resolves ancestry from parentId, not from the stored depth field.
 * Stored depth is diagnostic only and is checked against the structural
 * root-to-leaf position once the complete ancestry has been resolved.
 */
export const resolveFolderHierarchy = (
  folders: FolderRecord[],
  folderId?: string | null,
): FolderHierarchyResult => {
  const resourcesById = new Map(folders.map(resource => [resource.id, resource]));
  const hierarchy: FolderRecord[] = [];
  const issues: FolderHierarchyIssue[] = [];
  const visited = new Set<string>();
  let currentId = folderId ?? undefined;
  let reachedRoot = !currentId || currentId === 'root';

  while (currentId && currentId !== 'root') {
    if (visited.has(currentId)) {
      issues.push({ code: 'cycle', resourceId: currentId });
      hierarchy.length = 0;
      reachedRoot = false;
      break;
    }
    visited.add(currentId);

    const current = resourcesById.get(currentId);
    if (!current) {
      issues.push({ code: 'missing-folder', resourceId: currentId });
      reachedRoot = false;
      break;
    }
    if (current.type !== 'folder') {
      issues.push({ code: 'parent-not-folder', resourceId: currentId });
      reachedRoot = false;
      break;
    }

    hierarchy.push(current);
    const parentId = current.parentId ?? undefined;

    if (!parentId || parentId === 'root') {
      reachedRoot = true;
      break;
    }

    const parent = resourcesById.get(parentId);
    if (!parent) {
      issues.push({
        code: 'missing-parent',
        resourceId: current.id,
        parentId,
      });
      reachedRoot = false;
      break;
    }
    if (parent.type !== 'folder') {
      issues.push({
        code: 'parent-not-folder',
        resourceId: current.id,
        parentId,
      });
      reachedRoot = false;
      break;
    }
    if (visited.has(parentId)) {
      issues.push({ code: 'cycle', resourceId: parentId });
      hierarchy.length = 0;
      reachedRoot = false;
      break;
    }

    currentId = parentId;
  }

  const orderedHierarchy = hierarchy.reverse();
  if (reachedRoot) {
    orderedHierarchy.forEach((folder, index) => {
      if (folder.depth !== index) {
        issues.push({
          code: 'depth-mismatch',
          resourceId: folder.id,
          expectedDepth: index,
          actualDepth: folder.depth,
        });
      }
    });
  }

  return { hierarchy: orderedHierarchy, issues };
};
