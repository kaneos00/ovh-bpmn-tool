/* eslint-disable no-nested-ternary */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
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
  Delete,
  DescriptionOutlined,
  CreateNewFolder,
  AddCircleOutline,
  Edit,
  OpenInNew,
  Share,
  FolderOutlined,
  ChevronRight,
  ExpandMore,
  Star,
  StarBorder,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ControlledTreeEnvironment, Tree } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

import { useFolderTree } from './hooks/useFolderTree';

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
  const { dataTree, expandedNodes, setExpandedNodes, isLoading } = useFolderTree(selectedId);
  const navigate = useNavigate();
  const [sessionRole, setSessionRole] = useState<'admin' | 'modeler' | 'viewer' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; anchorEl: HTMLElement } | null>(null);
  const canModifyBpmn = sessionRole === 'admin' || sessionRole === 'modeler';

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
  const [view, setView] = useState<ExplorerView>(readView);
  const [search, setSearch] = useState('');
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
    setRecent(current => [processId, ...current.filter(id => id !== processId)].slice(0, 12));
  }, [selectedId, nodeById, flatNodes]);
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

  const visibleNodes = useMemo(() => {
    const ids = view === 'favorites' ? favorites : recent;
    const term = search.trim().toLocaleLowerCase('fr');
    return ids
      .map(id => nodeById.get(id) ?? flatNodes.find(node => node.targetId === id))
      .filter((node): node is RenderTree => Boolean(node))
      .filter((node, index, all) => all.findIndex(candidate => candidate.id === node.id) === index)
      .filter(node => view !== 'recent' || node.type === 'process' || node.type === 'linked-process')
      .filter(node => !term || node.name.toLocaleLowerCase('fr').includes(term));
  }, [view, favorites, recent, nodeById, flatNodes, search]);

  const toggleFavorite = (event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setFavorites(current =>
      current.includes(nodeId)
        ? current.filter(id => id !== nodeId)
        : [nodeId, ...current],
    );
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

  const handleTreeSelection = (items: (string | number)[]) => {
    const selected = items.length ? String(items[0]) : '';
    if (!selected || selected === 'root') return;
    const node = nodeById.get(selected);
    if (!node) return;

    // Folder labels expand in place. The dedicated chevron is the only control
    // that collapses a branch; opening one folder never resets sibling branches.
    if (node.type === 'folder') {
      if (node.children?.length) {
        setExpandedNodes(current => current.includes(node.id) ? current : [...current, node.id]);
      }
      return;
    }
    onNodeClick(node.targetId ?? selected);
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
      <Input
        size="sm"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Rechercher une ressource…"
        startDecorator={<Search fontSize="small" />}
        sx={{ mb: 1, borderRadius: '7px', bgcolor: 'background.surface' }}
        slotProps={{ input: { 'aria-label': 'Rechercher dans l’arborescence, les récents et les favoris' } }}
      />

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
              viewState={{
                'repository-tree': {
                  focusedItem: selectedTreeNodeId || 'root',
                  expandedItems: search.trim() ? searchExpandedNodes : expandedNodes,
                  selectedItems: selectedTreeNodeId ? [selectedTreeNodeId] : [],
                },
              }}
              onExpandItem={item => setExpandedNodes(current => current.includes(String(item.index)) ? current : [...current, String(item.index)])}
              onCollapseItem={item => setExpandedNodes(current => current.filter(id => id !== String(item.index)))}
              onSelectItems={handleTreeSelection}
              renderItemArrow={() => null}
              renderItemTitle={({ item, title }) => {
                const nodeId = String(item.index);
                const node = nodeById.get(nodeId);
                const isFavorite = favorites.includes(nodeId);
                return (
                  <Box
                    component="span"
                    onContextMenu={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      setContextMenu({ nodeId, anchorEl: event.currentTarget as HTMLElement });
                    }}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, width: '100%', minWidth: 0 }}
                  >
                    {node?.type === 'folder' ? <FolderOutlined fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                    <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Box>
                    {Boolean(node?.children?.length) && (
                      <IconButton
                        size="sm"
                        variant="plain"
                        color="neutral"
                        title={expandedNodes.includes(nodeId) ? 'Replier les éléments' : 'Développer les éléments'}
                        aria-label={expandedNodes.includes(nodeId) ? `Replier ${node?.name}` : `Développer ${node?.name}`}
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          setExpandedNodes(current => current.includes(nodeId)
                            ? current.filter(id => id !== nodeId)
                            : [...current, nodeId]);
                        }}
                        sx={{ minWidth: 24, minHeight: 24, p: 0.25, flexShrink: 0 }}
                      >
                        {expandedNodes.includes(nodeId) ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                      </IconButton>
                    )}
                    {node && nodeId !== 'root' && (
                      <IconButton
                        size="sm"
                        variant="plain"
                        color={isFavorite ? 'warning' : 'neutral'}
                        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        aria-label={isFavorite ? `Retirer ${node.name} des favoris` : `Ajouter ${node.name} aux favoris`}
                        onClick={event => toggleFavorite(event, nodeId)}
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
            const isFavorite = favorites.includes(node.id);
            const isSelected = (node.targetId ?? node.id) === selectedId;
            return (
              <Box key={node.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderRadius: '8px', bgcolor: isSelected ? '#eaf1ff' : 'transparent', '&:hover': { bgcolor: isSelected ? '#eaf1ff' : 'background.level1' } }}>
                <Button
                  variant="plain"
                  color={isSelected ? 'primary' : 'neutral'}
                  onClick={() => onNodeClick(node.targetId ?? node.id)}
                  startDecorator={view === 'recent' ? <AccessTime fontSize="small" /> : node.type === 'folder' ? <FolderOutlined fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                  sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', fontWeight: isSelected ? 700 : 500, overflow: 'hidden', '& .MuiButton-startDecorator': { flexShrink: 0 }, '& > span:last-of-type': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                >
                  {node.name}
                </Button>
                <IconButton
                  size="sm"
                  variant="plain"
                  color={isFavorite ? 'warning' : 'neutral'}
                  title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-label={isFavorite ? `Retirer ${node.name} des favoris` : `Ajouter ${node.name} aux favoris`}
                  onClick={event => toggleFavorite(event, node.id)}
                  sx={{ flexShrink: 0 }}
                >
                  {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
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
      {contextMenu && nodeById.get(contextMenu.nodeId) && (() => {
        const node = nodeById.get(contextMenu.nodeId)!;
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
              onNodeClick(resourceId);
            }}>
              <OpenInNew fontSize="small" />
              Ouvrir
            </MenuItem>
            {isBpmn && canModifyBpmn && (
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
                navigate(`/${resourceId}/delete`);
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
