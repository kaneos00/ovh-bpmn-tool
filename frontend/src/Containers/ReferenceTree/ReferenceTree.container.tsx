import React, { useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Divider, Stack, Typography } from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { apiClient } from '../../queryClient';
import { resourcesQuery } from '../../api/resources/resources.queries';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';

import './ReferenceTree.scss';

type TreeNode = Resource & {
  kind: 'root' | 'folder' | 'process';
  children: TreeNode[];
};

type Session = { role?: string };

const ROOT_ID = 'reference-root';

export const Component = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: resources = [], isLoading, isError } = useQuery<Resource[]>(resourcesQuery());
  const { data: session } = useQuery<Session>(
    ['auth-session'],
    () => apiClient.get('/auth/session'),
    { retry: false },
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const canManage = ['editor', 'modeler', 'admin'].includes((session?.role ?? '').toLowerCase());

  const cloneResource = useMutation(
    (resourceId: string) => apiClient.post(`/resources/${resourceId}/clone`, {
      name: `${resources.find(resource => resource.id === resourceId)?.name ?? 'Processus'} (copie)`,
    }),
    {
      onSuccess: async (result: { id?: string; resource?: { id: string } }) => {
        setActionError(null);
        setContextMenu(null);
        await queryClient.invalidateQueries(['resources']);
        const clonedId = result.id ?? result.resource?.id;
        if (clonedId) navigate(`/${clonedId}/edit`);
      },
      onError: (error: Error) => setActionError(error.message || 'La duplication a échoué.'),
    },
  );

  const roots = useMemo<TreeNode[]>(() => {
    const byId = new Map<string, TreeNode>();
    resources.forEach(resource => {
      byId.set(resource.id, {
        ...resource,
        kind: resource.type === ResourceType.Folder ? 'folder' : 'process',
        children: [],
      });
    });
    const topLevel: TreeNode[] = [];
    resources.forEach(resource => {
      const node = byId.get(resource.id);
      if (!node) return;
      const parent = resource.parentId ? byId.get(resource.parentId) : undefined;
      if (parent && parent.id !== resource.id) parent.children.push(node);
      else topLevel.push(node);
    });
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name, 'fr');
      });
      nodes.forEach(node => sortNodes(node.children));
    };
    sortNodes(topLevel);
    return [{
      id: ROOT_ID,
      name: 'Référentiel',
      description: 'Tous les processus et dossiers',
      depth: 0,
      type: ResourceType.Folder,
      kind: 'root',
      children: topLevel,
    }];
  }, [resources]);

  const toggle = (id: string, defaultExpanded: boolean) => {
    setExpanded(current => ({ ...current, [id]: !(current[id] ?? defaultExpanded) }));
  };

  const openNode = (node: TreeNode) => {
    setContextMenu(null);
    if (node.kind !== 'root') navigate(`/${node.id}`);
    else navigate('/root');
  };

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const defaultExpanded = depth < 2;
    const isExpanded = expanded[node.id] ?? defaultExpanded;
    let disclosureSymbol = '·';
    if (hasChildren) disclosureSymbol = isExpanded ? '−' : '+';
    const isRoot = node.kind === 'root';
    const isFolder = node.kind === 'folder' || isRoot;
    return (
      <li className={`referenceTreeItem referenceTreeItem-${node.kind}`} key={node.id} role="treeitem" aria-selected={false} aria-expanded={hasChildren ? isExpanded : undefined}>
        <div className="referenceTreeNodeRow">
          <button
            type="button"
            className={`referenceTreeDisclosure ${hasChildren ? '' : 'isLeaf'}`}
            aria-label={isExpanded ? `Replier ${node.name}` : `Déplier ${node.name}`}
            aria-expanded={hasChildren ? isExpanded : undefined}
            disabled={!hasChildren}
            onClick={() => toggle(node.id, defaultExpanded)}
          >
            {disclosureSymbol}
          </button>
          <button
            type="button"
            className={`referenceTreeNodeCard ${isFolder ? 'isFolder' : 'isProcess'}`}
            onClick={() => openNode(node)}
            onContextMenu={event => {
              if (!canManage || isRoot) return;
              event.preventDefault();
              setContextMenu({ id: node.id, x: Math.min(event.clientX, window.innerWidth - 210), y: Math.min(event.clientY, window.innerHeight - 230) });
            }}
            title={node.description || node.name}
          >
            <span className="referenceTreeNodeIcon" aria-hidden="true">{isFolder ? '▰' : '◇'}</span>
            <span className="referenceTreeNodeText">
              <span className="referenceTreeNodeName">{node.name}</span>
              {node.description && <span className="referenceTreeNodeDescription">{node.description}</span>}
            </span>
            <span className="referenceTreeNodeCount">{hasChildren ? node.children.length : null}</span>
          </button>
          {canManage && !isRoot && (
            <button
              type="button"
              className="referenceTreeMore"
              aria-label={`Actions pour ${node.name}`}
              title="Actions"
              onClick={event => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
                setContextMenu({ id: node.id, x: Math.min(rect.left, window.innerWidth - 210), y: Math.min(rect.bottom, window.innerHeight - 230) });
              }}
            >⋯</button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <ul className="referenceTreeChildren" role="group">
            {node.children.map(child => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const selectedResource = resources.find(resource => resource.id === contextMenu?.id);

  return (
    <Box className="referenceTreePage" onClick={() => contextMenu && setContextMenu(null)}>
      <WorkspaceNavigation />
      <Box className="referenceTreeContent">
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Box>
            <Typography level="h2">Arborescence du référentiel</Typography>
            <Typography level="body-sm" textColor="neutral">
              Explorez les dossiers et processus. Utilisez les flèches pour développer ou replier chaque branche.
            </Typography>
          </Box>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" color="neutral" onClick={() => setExpanded(Object.fromEntries([ROOT_ID, ...resources.map(resource => resource.id)].map(id => [id, false])))}>Replier les branches</Button>
            <Button variant="outlined" color="neutral" onClick={() => setExpanded(Object.fromEntries([ROOT_ID, ...resources.map(resource => resource.id)].map(id => [id, true])))}>Développer tout</Button>
            <Button variant="outlined" onClick={() => navigate('/root')}>Retour au référentiel</Button>
          </Stack>
        </Stack>
        {actionError && <Typography color="danger" role="alert">{actionError}</Typography>}
        <Card variant="outlined" className="referenceTreeCard">
          {isLoading && <Typography>Chargement de l’arborescence…</Typography>}
          {!isLoading && isError && <Typography color="danger">Impossible de charger les ressources du référentiel.</Typography>}
          {!isLoading && !isError && (
            <Box className="referenceTreeCanvas">
              <Box className="referenceTreeLegend">
                <Chip size="sm" variant="soft" color="success">Dossier</Chip>
                <Chip size="sm" variant="soft" color="primary">Processus BPMN</Chip>
                <Typography level="body-xs" textColor="neutral">{resources.length} ressource(s)</Typography>
              </Box>
              {resources.length === 0 ? (
                <Typography>Aucune ressource à afficher.</Typography>
              ) : (
                <ul className="referenceTreeRoot" role="tree" aria-label="Arborescence du référentiel">
                  {roots.map(node => renderNode(node))}
                </ul>
              )}
            </Box>
          )}
        </Card>
      </Box>
      {contextMenu && canManage && selectedResource && (
        <div
          className="referenceTreeContextMenu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          tabIndex={-1}
          aria-label={`Actions pour ${selectedResource.name}`}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => { if (event.key === 'Escape') setContextMenu(null); }}
        >
          <div className="referenceTreeContextHeading">{selectedResource.name}</div>
          <Divider />
          <button role="menuitem" onClick={() => { setContextMenu(null); navigate(`/${selectedResource.id}/edit`); }}>Modifier</button>
          {selectedResource.type !== ResourceType.Folder && (
            <button role="menuitem" onClick={() => { setContextMenu(null); cloneResource.mutate(selectedResource.id); }} disabled={cloneResource.isLoading}>Dupliquer</button>
          )}
          <button role="menuitem" onClick={() => { setContextMenu(null); navigate(`/${selectedResource.id}/share`); }}>Partager</button>
          <button role="menuitem" className="isDanger" onClick={() => { setContextMenu(null); navigate(`/${selectedResource.id}/delete`); }}>Supprimer</button>
        </div>
      )}
    </Box>
  );
};

Component.displayName = 'ReferenceTreeContainer';
