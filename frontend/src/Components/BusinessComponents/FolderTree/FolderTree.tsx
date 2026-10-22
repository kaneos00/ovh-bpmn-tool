/* eslint-disable no-nested-ternary */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Input,
  List,
  ListItem,
  ListItemContent,
  Skeleton,
  Typography,
} from '@mui/joy';
import {
  AccessTime,
  DescriptionOutlined,
  FolderOutlined,
  Star,
  StarBorder,
  Search,
} from '@mui/icons-material';
import { ControlledTreeEnvironment, Tree } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

import { useFolderTree } from './hooks/useFolderTree';
import { ProcessHierarchyTree } from '../ProcessHierarchyTree/ProcessHierarchyTree';

import type { RenderTree } from '.';

type FolderTreeProps = {
  selectedId: string;
  onNodeClick: (nodeId: string) => void;
  processXml?: string;
  selectedElementId?: string | null;
  onElementClick?: (elementId: string) => void;
};

type ExplorerView = 'tree' | 'recent' | 'favorites';
const FAVORITES_KEY = 'bpmn-tool:favorite-resources';
const RECENT_KEY = 'bpmn-tool:recent-resources';

const readIds = (key: string): string[] => {
  try {
    const value = window.localStorage.getItem(key);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const FolderTree = ({ selectedId, onNodeClick, processXml, selectedElementId, onElementClick }: FolderTreeProps) => {
  const { dataTree, expandedNodes, setExpandedNodes, isLoading } =
    useFolderTree(selectedId, { onNodeClick });
  const [view, setView] = useState<ExplorerView>('tree');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(readIds(FAVORITES_KEY));
  const [recent, setRecent] = useState<string[]>(readIds(RECENT_KEY));

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

  useEffect(() => {
    if (!selectedId || selectedId === 'root') return;
    setRecent(current => [selectedId, ...current.filter(id => id !== selectedId)].slice(0, 12));
  }, [selectedId]);

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
      .map(id => nodeById.get(id))
      .filter((node): node is RenderTree => Boolean(node))
      .filter(node => !term || node.name.toLocaleLowerCase('fr').includes(term));
  }, [view, favorites, recent, nodeById, search]);

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
        isFolder: Boolean(node.children?.length),
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

    // Folder labels expand/collapse in place; only process rows navigate.
    if (node.type === 'folder') {
      setExpandedNodes(current =>
        current.includes(selected)
          ? current.filter(id => id !== selected)
          : [...current, selected],
      );
      return;
    }

    onNodeClick(node.targetId ?? selected);
  };

  return (
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
          <ListItemContent sx={{ minWidth: 0 }}>
            <ControlledTreeEnvironment
              items={treeItems}
              getItemTitle={item => item.data.name}
              viewState={{
                'repository-tree': {
                  focusedItem: selectedId || 'root',
                  expandedItems: search.trim() ? searchExpandedNodes : expandedNodes,
                  selectedItems: selectedId ? [selectedId] : [],
                },
              }}
              onExpandItem={item => setExpandedNodes(current => current.includes(String(item.index)) ? current : [...current, String(item.index)])}
              onCollapseItem={item => setExpandedNodes(current => current.filter(id => id !== String(item.index)))}
              onSelectItems={handleTreeSelection}
              renderItemTitle={({ item, title }) => {
                const nodeId = String(item.index);
                const node = nodeById.get(nodeId);
                const isFavorite = favorites.includes(nodeId);
                return (
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, width: '100%', minWidth: 0 }}>
                    {node?.type === 'folder' ? <FolderOutlined fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                    <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Box>
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
        {processXml && onElementClick && (
          <ProcessHierarchyTree
            xmlContent={processXml}
            selectedElementId={selectedElementId}
            onElementClick={onElementClick}
          />
        )}
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
            return (
              <Box key={node.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderRadius: '8px', bgcolor: node.id === selectedId ? '#eaf1ff' : 'transparent', '&:hover': { bgcolor: node.id === selectedId ? '#eaf1ff' : 'background.level1' } }}>
                <Button
                  variant="plain"
                  color={node.id === selectedId ? 'primary' : 'neutral'}
                  onClick={() => onNodeClick(node.targetId ?? node.id)}
                  startDecorator={view === 'recent' ? <AccessTime fontSize="small" /> : node.type === 'folder' ? <FolderOutlined fontSize="small" /> : <DescriptionOutlined fontSize="small" />}
                  sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', fontWeight: node.id === selectedId ? 700 : 500, overflow: 'hidden', '& .MuiButton-startDecorator': { flexShrink: 0 }, '& > span:last-of-type': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
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
  );
};
