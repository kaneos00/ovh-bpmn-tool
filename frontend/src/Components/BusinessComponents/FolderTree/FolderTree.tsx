/* eslint-disable no-nested-ternary */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Input,
  List,
  ListItem,
  ListItemContent,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
} from '@mui/joy';
import {
  AccessTime,
  AddCircleOutline,
  CreateNewFolder,
  Delete,
  DescriptionOutlined,
  Edit,
  OpenInNew,
  Share,
  FolderOutlined,
  ChevronRight,
  ExpandMore,
  Star,
  StarBorder,
  Search,
  MoreVert,
  HomeRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ControlledTreeEnvironment, Tree } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

import { useFolderTree } from './hooks/useFolderTree';
import { useActiveProject } from '../../../shared/hooks/useActiveProject';
import { getProjectTrigram } from '../../../shared/helpers/projectTrigram';

import type { RenderTree } from '.';

type FolderTreeProps = {
  selectedId: string;
  onNodeClick: (nodeId: string) => void;
};

type ExplorerView = 'tree' | 'recent' | 'favorites';
const FAVORITES_KEY = 'bpmn-tool:favorite-resources';
const RECENT_KEY = 'bpmn-tool:recent-resources';
const VIEW_KEY = 'bpmn-tool:explorer-view';

const readIds = (key: string): string[] => {
  try {
    const value = window.localStorage.getItem(key);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const readView = (): ExplorerView => {
  try {
    const value = window.localStorage.getItem(VIEW_KEY);
    return value === 'recent' || value === 'favorites' || value === 'tree' ? value : 'tree';
  } catch {
    return 'tree';
  }
};

export const FolderTree = ({ selectedId, onNodeClick }: FolderTreeProps) => {
  const { dataTree, expandedNodes, setExpandedNodes, isLoading, activeProjectId } = useFolderTree(selectedId);
  const { projects, setActiveProject } = useActiveProject();
  const navigate = useNavigate();
  const [sessionRole, setSessionRole] = useState<'admin' | 'modeler' | 'viewer' | null>(null);
  const [projectModelerResourceIds, setProjectModelerResourceIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; anchorEl: HTMLElement } | null>(null);
  const canModifyBpmn = (resourceId: string) => sessionRole === 'admin' || sessionRole === 'modeler' || projectModelerResourceIds.includes(resourceId);

  useEffect(() => { setContextMenu(null); }, [activeProjectId, selectedId]);

  useEffect(() => {
    let mounted = true;
    const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    fetch(`${apiBase}/auth/session`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then(async response => response.ok ? response.json() as Promise<{ role?: 'admin' | 'modeler' | 'viewer' }> : null)
      .then(session => { if (mounted) setSessionRole(session?.role ?? null); })
      .catch(() => { if (mounted) setSessionRole(null); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    let mounted = true;
    const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    fetch(`${apiBase}/projects/me/workspace`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then(async response => response.ok
        ? response.json() as Promise<{ projects?: Array<{ role?: string; processes?: Array<{ resourceId: string }> }> }>
        : null)
      .then(workspace => {
        if (!mounted) return;
        const resourceIds = (workspace?.projects ?? [])
          .filter(project => project.role === 'admin' || project.role === 'modeler')
          .flatMap(project => (project.processes ?? []).map(process => process.resourceId));
        setProjectModelerResourceIds(Array.from(new Set(resourceIds)));
      })
      .catch(() => { if (mounted) setProjectModelerResourceIds([]); });
    return () => { mounted = false; };
  }, []);

  const [view, setView] = useState<ExplorerView>(readView);
  const [search, setSearch] = useState('');
  const [searchCollapsedNodes, setSearchCollapsedNodes] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(readIds(FAVORITES_KEY));
  const [recent, setRecent] = useState<string[]>(readIds(RECENT_KEY));

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
      // The selected explorer view is best-effort when browser storage is disabled.
    }
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // The explorer remains usable when browser storage is disabled.
    }
  }, [favorites]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
      // The explorer remains usable when browser storage is disabled.
    }
  }, [recent]);

  const flatNodes = useMemo(() => {
    const nodes: RenderTree[] = [];
    const visit = (node: RenderTree) => {
      if (node.id !== 'root') nodes.push(node);
      node.children?.forEach(visit);
    };
    visit(dataTree);
    return nodes;
  }, [dataTree]);

  const nodeById = useMemo(() => new Map(flatNodes.map(node => [node.id, node])), [flatNodes]);
  useEffect(() => {
    if (!selectedId || selectedId === 'root') return;
    const selectedNode = nodeById.get(selectedId) ?? flatNodes.find(node => node.targetId === selectedId);
    if (!selectedNode || (selectedNode.type !== 'process' && selectedNode.type !== 'linked-process')) return;
    const processId = selectedNode.targetId ?? selectedNode.id;
    if (!activeProjectId || !projects.some(project => project.id === activeProjectId && project.processes.some(process => process.resourceId === processId))) return;
    const entryId = `${activeProjectId}::${processId}`;
    setRecent(current => [entryId, ...current.filter(id => id !== entryId && id !== processId)].slice(0, 12));
  }, [selectedId, nodeById, flatNodes, activeProjectId, projects]);
  const selectedTreeNodeId = useMemo(() => {
    if (nodeById.has(selectedId)) return selectedId;
    return flatNodes.find(node => node.targetId === selectedId)?.id ?? selectedId;
  }, [nodeById, flatNodes, selectedId]);
  const filteredTree = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    const filterNode = (node: RenderTree): RenderTree | null => {
      const children = (node.children ?? []).map(filterNode).filter((child): child is RenderTree => Boolean(child));
      if (!term || node.name.toLocaleLowerCase('fr').includes(term)) {
        return { ...node, children: node.children };
      }
      return children.length ? { ...node, children } : null;
    };
    return (dataTree.children ?? []).map(filterNode).filter((node): node is RenderTree => Boolean(node));
  }, [dataTree, search]);

  const searchExpandedNodes = useMemo(() => {
    const collect = (nodes: RenderTree[]): string[] =>
      nodes.flatMap(node => node.children?.length ? [node.id, ...collect(node.children)] : []);
    return collect(filteredTree);
  }, [filteredTree]);
  const isSearching = Boolean(search.trim());
  const effectiveExpandedNodes = useMemo(
    () => isSearching
      ? searchExpandedNodes.filter(nodeId => !searchCollapsedNodes.includes(nodeId))
      : expandedNodes,
    [isSearching, searchExpandedNodes, searchCollapsedNodes, expandedNodes],
  );

  useEffect(() => {
    setSearchCollapsedNodes([]);
  }, [search]);

  const toggleNodeExpansion = (nodeId: string) => {
    if (isSearching) {
      setSearchCollapsedNodes(current => current.includes(nodeId)
        ? current.filter(id => id !== nodeId)
        : [...current, nodeId]);
      return;
    }
    setExpandedNodes(current => current.includes(nodeId)
      ? current.filter(id => id !== nodeId)
      : [...current, nodeId]);
  };

  const visibleNodes = useMemo(() => {
    const ids = view === 'favorites' ? favorites : recent;
    const term = search.trim().toLocaleLowerCase('fr');
    return ids.flatMap(entryId => {
      const separator = entryId.indexOf('::');
      let projectId = separator > 0 ? entryId.slice(0, separator) : null;
      const resourceId = separator > 0 ? entryId.slice(separator + 2) : entryId;
      const matchingProjects = projects.filter(project => project.processes.some(process => process.resourceId === resourceId));
      const currentNode = nodeById.get(resourceId) ?? flatNodes.find(node => node.targetId === resourceId);
      if (!projectId) {
        if (activeProjectId && (matchingProjects.some(project => project.id === activeProjectId) || currentNode)) projectId = activeProjectId;
        else if (matchingProjects.length === 1) projectId = matchingProjects[0].id;
      }
      const project = projects.find(item => item.id === projectId);
      const process = project?.processes.find(item => item.resourceId === resourceId);
      const node = currentNode ?? (process ? { id: entryId, targetId: resourceId, name: process.name, type: 'process' } as RenderTree : null);
      if (!node || !projectId) return [];
      return [{ ...node, id: entryId, targetId: resourceId, projectId } as RenderTree & { projectId: string; entryId: string }];
    })
      .filter((node, index, all) => all.findIndex(candidate => candidate.id === node.id) === index)
      .filter(node => view !== 'recent' || node.type === 'process' || node.type === 'linked-process')
      .filter(node => !term || node.name.toLocaleLowerCase('fr').includes(term));
  }, [view, favorites, recent, nodeById, flatNodes, search, projects, activeProjectId]);

  const toggleFavorite = (event: React.MouseEvent, nodeId: string, projectId = activeProjectId) => {
    event.preventDefault();
    event.stopPropagation();
    const entryId = projectId ? `${projectId}::${nodeId}` : nodeId;
    setFavorites(current => current.includes(entryId) || current.includes(nodeId)
      ? current.filter(id => id !== entryId && id !== nodeId)
      : [entryId, ...current.filter(id => id !== nodeId)]);
  };

  const treeItems = useMemo(() => {
    const items: Record<string, { index: string; isFolder: boolean; children?: string[]; data: RenderTree }> = {
      root: {
        index: 'root',
        isFolder: true,
        children: filteredTree.map(node => node.id),
        data: dataTree,
      },
    };
    const addNode = (node: RenderTree) => {
      items[node.id] = {
        index: node.id,
        isFolder: node.type === 'folder' || Boolean(node.children?.length),
        children: node.children?.map(child => child.id) ?? [],
        data: node,
      };
      node.children?.forEach(addNode);
    };
    filteredTree.forEach(addNode);
    return items;
  }, [dataTree, filteredTree]);

  const treeViewState = useMemo(() => ({
    'repository-tree': {
      focusedItem: selectedTreeNodeId || 'root',
      expandedItems: effectiveExpandedNodes,
      selectedItems: selectedTreeNodeId ? [selectedTreeNodeId] : [],
    },
  }), [selectedTreeNodeId, effectiveExpandedNodes]);

  const handleTreeSelection = (items: (string | number)[]) => {
    const selected = items.length ? String(items[0]) : '';
    if (!selected || selected === 'root') return;
    const node = nodeById.get(selected);
    if (!node) return;

    const targetId = node.targetId ?? selected;
    // The controlled tree can emit selection again as its focused/selected state
    // is synchronized after route navigation. Avoid navigating to the same page.
    if (targetId === selectedId) return;

    // Selecting a folder opens its page; the dedicated chevron controls expansion.
    // This keeps folder navigation separate from expanding/collapsing tree branches.
    onNodeClick(targetId);
  };

  return (
    <>
    <List
      sx={{
        '--ListItem-radius': '8px',
        '--ListItem-minHeight': '32px',
        '--List-gap': '4px',
        p: 1,
        minWidth: 0,
      }}
    >
      {!activeProjectId && (
        <Typography level="body-sm" sx={{ px: 1, pb: 1, color: 'warning.700' }}>
          Sélectionnez un projet dans le bandeau pour afficher ses processus.
        </Typography>
      )}
      <Input
        size="sm"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Rechercher une ressource…"
        startDecorator={<Search fontSize="small" />}
        sx={{ mb: 1, borderRadius: '7px', bgcolor: 'background.surface' }}
        slotProps={{ input: { 'aria-label': 'Rechercher dans l’arborescence, les récents et les favoris' } }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0.75 }}>
        <Button
          size="sm"
          variant="plain"
          color="neutral"
          startDecorator={<HomeRounded fontSize="small" />}
          onClick={() => navigate('/projects')}
          sx={{ justifyContent: 'flex-start', fontWeight: 650 }}
        >
          Tous les projets
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, p: 0.5, mb: 1, bgcolor: 'background.level1', borderRadius: '8px' }}>
        {([
          ['tree', 'Arborescence'],
          ['recent', 'Récents'],
          ['favorites', 'Favoris'],
        ] as const).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={view === key ? 'solid' : 'plain'}
            color={view === key ? 'primary' : 'neutral'}
            onClick={() => setView(key)}
            sx={{ flex: 1, minWidth: 0, px: 0.5, fontSize: 11, whiteSpace: 'nowrap' }}
          >
            {label}
            {key === 'favorites' ? ` ★` : ''}
          </Button>
        ))}
      </Box>

      {isLoading ? (
        new Array(8).fill('').map((_, index) => (
          <ListItem key={`skel-${index}`}>
            <ListItemContent>
              <Skeleton animation="wave" sx={{ width: '90%' }} height={24} />
            </ListItemContent>
          </ListItem>
        ))
      ) : view === 'tree' ? (
        <>
        <ListItem sx={{ p: 0, display: 'block', minWidth: 0 }}>
          <ListItemContent sx={{ minWidth: 0, "& .rct-tree-item-arrow": { display: "none !important" } }}>
            <ControlledTreeEnvironment
              items={treeItems}
              getItemTitle={item => item.data.name}
              viewState={treeViewState}
              onExpandItem={item => {
                const nodeId = String(item.index);
                if (isSearching) setSearchCollapsedNodes(current => current.filter(id => id !== nodeId));
                else setExpandedNodes(current => current.includes(nodeId) ? current : [...current, nodeId]);
              }}
              onCollapseItem={item => {
                const nodeId = String(item.index);
                if (isSearching) setSearchCollapsedNodes(current => current.includes(nodeId) ? current : [...current, nodeId]);
                else setExpandedNodes(current => current.filter(id => id !== nodeId));
              }}
              onSelectItems={handleTreeSelection}
              renderItemArrow={() => null}
              renderItemTitle={({ item, title }) => {
                const nodeId = String(item.index);
                const node = nodeById.get(nodeId);
                const favoriteId = activeProjectId ? `${activeProjectId}::${node?.targetId ?? nodeId}` : (node?.targetId ?? nodeId);
                const isFavorite = favorites.includes(favoriteId) || favorites.includes(node?.targetId ?? nodeId) || favorites.includes(nodeId);
                return (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      width: '100%',
                      minWidth: 0,
                      '& .folder-tree-actions': { opacity: 0, transition: 'opacity 120ms ease' },
                      '&:hover .folder-tree-actions, &:focus-within .folder-tree-actions': { opacity: 1 },
                      '@media (hover: none)': { '& .folder-tree-actions': { opacity: 1 } },
                    }}
                  >
                    {node?.type === 'folder' ? <FolderOutlined fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                    <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Box>
                    {Boolean(node?.children?.length) && (
                      <IconButton
                        size="sm"
                        variant="plain"
                        color="neutral"
                        title={effectiveExpandedNodes.includes(nodeId) ? 'Replier les éléments' : 'Développer les éléments'}
                        aria-label={effectiveExpandedNodes.includes(nodeId) ? `Replier ${node?.name}` : `Développer ${node?.name}`}
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleNodeExpansion(nodeId);
                        }}
                        sx={{ minWidth: 24, minHeight: 24, p: 0.25, flexShrink: 0 }}
                      >
                        {effectiveExpandedNodes.includes(nodeId) ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                      </IconButton>
                    )}
                    {node && nodeId !== 'root' && (
                      <IconButton
                        className="folder-tree-actions"
                        size="sm"
                        variant="plain"
                        color="neutral"
                        title={`Actions pour ${node.name}`}
                        aria-label={`Ouvrir les actions de ${node.name}`}
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          setContextMenu({ nodeId, anchorEl: event.currentTarget });
                        }}
                        sx={{ minWidth: 24, minHeight: 24, p: 0.25, flexShrink: 0 }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    )}
                    {node && nodeId !== 'root' && (
                      <IconButton
                        size="sm"
                        variant="plain"
                        color={isFavorite ? 'warning' : 'neutral'}
                        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        aria-label={isFavorite ? `Retirer ${node.name} des favoris` : `Ajouter ${node.name} aux favoris`}
                        onClick={event => toggleFavorite(event, node?.targetId ?? nodeId)}
                        sx={{ minWidth: 24, minHeight: 24, p: 0.25, flexShrink: 0, opacity: isFavorite ? 1 : 0.55 }}
                      >
                        {isFavorite ? <Star fontSize="inherit" /> : <StarBorder fontSize="inherit" />}
                      </IconButton>
                    )}
                  </Box>
                );
              }}
            >
              <Tree treeId="repository-tree" rootItem="root" treeLabel="Arborescence du référentiel" />
            </ControlledTreeEnvironment>
          </ListItemContent>
        </ListItem>
        </>
      ) : (
        <Box sx={{ display: 'grid', gap: 0.5 }}>
          <Typography level="body-xs" sx={{ px: 1, py: 0.5, color: 'text.tertiary', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {view === 'recent' ? 'Consultés récemment' : 'Vos favoris'}
          </Typography>
          {visibleNodes.length === 0 ? (
            <Typography level="body-sm" sx={{ px: 1, py: 2, color: 'text.tertiary' }}>
              {view === 'recent' ? 'Les ressources ouvertes apparaîtront ici.' : 'Ajoutez des ressources avec l’étoile pour les retrouver ici.'}
            </Typography>
          ) : visibleNodes.map(node => {
            const projectId = (node as RenderTree & { projectId?: string }).projectId ?? activeProjectId;
            const project = projects.find(item => item.id === projectId);
            const resourceId = node.targetId ?? node.id;
            const entryId = projectId ? `${projectId}::${resourceId}` : resourceId;
            const isFavorite = favorites.includes(entryId) || favorites.includes(resourceId);
            const isSelected = resourceId === selectedId;
            return (
              <Box key={node.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderRadius: '8px', bgcolor: isSelected ? '#eaf1ff' : 'transparent', '&:hover': { bgcolor: isSelected ? '#eaf1ff' : 'background.level1' }, '& .folder-tree-actions': { opacity: 0, transition: 'opacity 120ms ease' }, '&:hover .folder-tree-actions, &:focus-within .folder-tree-actions': { opacity: 1 }, '@media (hover: none)': { '& .folder-tree-actions': { opacity: 1 } } }}>
                <Button
                  variant="plain"
                  color={isSelected ? 'primary' : 'neutral'}
                  onClick={() => { if (projectId && projectId !== activeProjectId) setActiveProject(projectId); onNodeClick(resourceId); }}
                  startDecorator={view === 'recent' ? <AccessTime fontSize="small" /> : node.type === 'folder' ? <FolderOutlined fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                  sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', fontWeight: isSelected ? 700 : 500, overflow: 'hidden', '& .MuiButton-startDecorator': { flexShrink: 0 }, '& > span:last-of-type': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                >
                  {node.name}
                </Button>
                {project && (
                  <Chip size="sm" variant="solid" title={project.name} sx={{ bgcolor: project.color || '#2864d7', color: '#fff', maxWidth: 160, minWidth: 36, fontWeight: 800, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getProjectTrigram(project.name, project.trigram)}
                  </Chip>
                )}
                <IconButton
                  size="sm"
                  variant="plain"
                  color={isFavorite ? 'warning' : 'neutral'}
                  title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-label={isFavorite ? `Retirer ${node.name} des favoris` : `Ajouter ${node.name} aux favoris`}
                  onClick={event => toggleFavorite(event, resourceId, projectId)}
                  sx={{ flexShrink: 0 }}
                >
                  {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                </IconButton>
                <IconButton
                  className="folder-tree-actions"
                  size="sm"
                  variant="plain"
                  color="neutral"
                  title={`Actions pour ${node.name}`}
                  aria-label={`Ouvrir les actions de ${node.name}`}
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    setContextMenu({ nodeId: node.id, anchorEl: event.currentTarget });
                  }}
                  sx={{ flexShrink: 0 }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}
    </List>
    <Menu
      open={Boolean(contextMenu)}
      anchorEl={contextMenu?.anchorEl ?? null}
      onClose={() => setContextMenu(null)}
      placement="right-start"
      sx={{
        minWidth: 208,
        p: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        bgcolor: 'background.popup',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.08)',
        '--ListItem-radius': '8px',
        '--ListItem-minHeight': '38px',
        zIndex: 1500,
      }}
    >
      {contextMenu && (visibleNodes.find(item => item.id === contextMenu.nodeId) ?? nodeById.get(contextMenu.nodeId)) && (() => {
        const node = (visibleNodes.find(item => item.id === contextMenu.nodeId) ?? nodeById.get(contextMenu.nodeId))!;
        const resourceId = node.targetId ?? node.id;
        const isBpmn = node.type === 'process' || node.type === 'linked-process';
        const isFolder = node.type === 'folder';
        const isAdmin = sessionRole === 'admin';
        const menuItemSx = {
          gap: 1.25,
          px: 1.25,
          py: 0.75,
          fontSize: 13,
          fontWeight: 550,
          color: 'text.primary',
          '& > svg': { color: 'text.secondary', fontSize: 18 },
          '&:hover': { bgcolor: 'background.level1' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.500', outlineOffset: '-2px' },
        };
        return (
          <>
            <MenuItem sx={menuItemSx} onClick={() => {
              setContextMenu(null);
              const projectId = (node as RenderTree & { projectId?: string }).projectId;
              if (projectId && projectId !== activeProjectId) setActiveProject(projectId);
              onNodeClick(resourceId);
            }}>
              <OpenInNew fontSize="small" />
              Ouvrir
            </MenuItem>
            {isBpmn && canModifyBpmn(resourceId) && (
              <MenuItem sx={{ ...menuItemSx, '& > svg': { color: 'primary.600', fontSize: 18 } }} onClick={() => {
                setContextMenu(null);
                navigate(`/${resourceId}/modeler`);
              }}>
                <Edit fontSize="small" />
                Modifier dans le modeleur
              </MenuItem>
            )}
            {isFolder && isAdmin && (
              <>
                <Divider sx={{ my: 0.5, mx: 0.75 }} />
                <MenuItem sx={menuItemSx} onClick={() => {
                  setContextMenu(null);
                  navigate(`/${resourceId}/add?type=folder`);
                }}>
                  <CreateNewFolder fontSize="small" />
                  Créer un répertoire
                </MenuItem>
                <MenuItem sx={menuItemSx} onClick={() => {
                  setContextMenu(null);
                  navigate(`/${resourceId}/add?type=process`);
                }}>
                  <AddCircleOutline fontSize="small" />
                  Créer un processus
                </MenuItem>
              </>
            )}
            {node.type !== 'folder' && (
              <>
                <Divider sx={{ my: 0.5, mx: 0.75 }} />
                <MenuItem sx={menuItemSx} onClick={() => {
                  setContextMenu(null);
                  navigate(`/${resourceId}/share`);
                }}>
                  <Share fontSize="small" />
                  Partager
                </MenuItem>
              </>
            )}
            {isAdmin && (
              <MenuItem sx={{ ...menuItemSx, color: 'danger.600', '& > svg': { color: 'danger.600', fontSize: 18 }, '&:hover': { bgcolor: 'danger.softBg' } }} onClick={() => {
                setContextMenu(null);
                navigate(`/${resourceId}/delete?targetResourceId=${encodeURIComponent(resourceId)}`);
              }}>
                <Delete fontSize="small" />
                Supprimer
              </MenuItem>
            )}
          </>
        );
      })()}
    </Menu>
    </>
  );
};
