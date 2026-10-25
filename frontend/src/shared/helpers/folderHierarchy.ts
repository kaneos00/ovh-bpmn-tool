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
 * Resolves folder ancestry from parentId, not from the stored depth field.
 * The depth field is checked as a diagnostic only: parent links are the
 * authoritative structure used by both the tree and the breadcrumb.
 */
export const resolveFolderHierarchy = (
  folders: FolderRecord[],
  folderId?: string | null,
): FolderHierarchyResult => {
  const foldersById = new Map(folders.map(folder => [folder.id, folder]));
  const hierarchy: FolderRecord[] = [];
  const issues: FolderHierarchyIssue[] = [];
  const visited = new Set<string>();
  let currentId = folderId ?? undefined;

  while (currentId && currentId !== 'root') {
    if (visited.has(currentId)) {
      issues.push({ code: 'cycle', resourceId: currentId });
      // A cyclic ancestry has no valid breadcrumb order. Do not fabricate one.
      hierarchy.length = 0;
      break;
    }
    visited.add(currentId);

    const current = foldersById.get(currentId);
    if (!current) {
      issues.push({ code: 'missing-folder', resourceId: currentId });
      break;
    }
    if (current.type !== 'folder') {
      issues.push({ code: 'parent-not-folder', resourceId: currentId });
      break;
    }

    hierarchy.push(current);
    const parentId = current.parentId ?? undefined;

    if (!parentId || parentId === 'root') {
      if (current.depth !== 0) {
        issues.push({
          code: 'depth-mismatch',
          resourceId: current.id,
          expectedDepth: 0,
          actualDepth: current.depth,
        });
      }
      break;
    }

    const parent = foldersById.get(parentId);
    if (!parent) {
      issues.push({
        code: 'missing-parent',
        resourceId: current.id,
        parentId,
      });
      break;
    }
    if (parent.type !== 'folder') {
      issues.push({
        code: 'parent-not-folder',
        resourceId: current.id,
        parentId,
      });
      break;
    }

    // Prefer reporting a structural cycle over secondary depth mismatches.
    // The parent will be visited on the next iteration, but checking here avoids
    // reporting a misleading depth warning first.
    if (visited.has(parentId)) {
      issues.push({ code: 'cycle', resourceId: parentId });
      hierarchy.length = 0;
      break;
    }

    const expectedDepth = parent.depth + 1;
    if (current.depth !== expectedDepth) {
      issues.push({
        code: 'depth-mismatch',
        resourceId: current.id,
        parentId,
        expectedDepth,
        actualDepth: current.depth,
      });
    }

    currentId = parentId;
  }

  return { hierarchy: hierarchy.reverse(), issues };
};
