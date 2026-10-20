import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../api/resources/resources.queries';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';

import './ReferenceTree.scss';

type TreeNode = {
  id: string;
  name: string;
  type: 'root' | 'folder' | 'process';
  parentId: string | null;
  depth: number;
};

type Point = { x: number; y: number };
type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startOffset: Point;
};

const ROOT_ID = 'root';
const NODE_WIDTH = 180;
const NODE_HEIGHT = 48;
const LEVEL_HEIGHT = 125;
const MIN_NODE_SPACING = 210;

export const Component = () => {
  const navigate = useNavigate();
  const { data: resources = [], isLoading, isError } = useQuery<Resource[]>(resourcesQuery());
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedDuringDragRef = useRef(false);
  const [viewport, setViewport] = useState({ width: 900, height: 620 });
  const [offsets, setOffsets] = useState<Record<string, Point>>({});

  useEffect(() => {
    const element = canvasRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setViewport(current => (
        Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1
          ? current
          : { width: rect.width, height: rect.height }
      ));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nodes = useMemo<TreeNode[]>(() => {
    const ids = new Set(resources.map(resource => resource.id));
    const childrenByParent = new Map<string, Resource[]>();

    resources.forEach(resource => {
      const parentId = resource.parentId && ids.has(resource.parentId)
        ? resource.parentId
        : ROOT_ID;
      const children = childrenByParent.get(parentId) ?? [];
      children.push(resource);
      childrenByParent.set(parentId, children);
    });

    childrenByParent.forEach(children => children.sort((a, b) => {
      if (a.type !== b.type) return a.type === ResourceType.Folder ? -1 : 1;
      return a.name.localeCompare(b.name, 'fr');
    }));

    const result: TreeNode[] = [{
      id: ROOT_ID,
      name: 'Référentiel',
      type: 'root',
      parentId: null,
      depth: 0,
    }];
    const visited = new Set<string>();

    const append = (resource: Resource, parentId: string, depth: number) => {
      if (visited.has(resource.id)) return;
      visited.add(resource.id);
      result.push({
        id: resource.id,
        name: resource.name,
        type: resource.type === ResourceType.Folder ? 'folder' : 'process',
        parentId,
        depth,
      });
      (childrenByParent.get(resource.id) ?? []).forEach(child => append(child, resource.id, depth + 1));
    };

    (childrenByParent.get(ROOT_ID) ?? []).forEach(resource => append(resource, ROOT_ID, 1));
    // Keep orphaned resources visible rather than silently dropping them.
    resources.forEach(resource => {
      if (!visited.has(resource.id)) append(resource, ROOT_ID, 1);
    });

    return result;
  }, [resources]);

  const maxDepth = Math.max(0, ...nodes.map(node => node.depth));
  const maxNodesAtLevel = Math.max(1, ...Array.from(
    { length: maxDepth + 1 },
    (_, depth) => nodes.filter(node => node.depth === depth).length,
  ));
  const graphWidth = Math.max(viewport.width, maxNodesAtLevel * MIN_NODE_SPACING + NODE_WIDTH + 40);
  const graphHeight = Math.max(viewport.height, (maxDepth + 1) * LEVEL_HEIGHT + 80);

  const basePositions = useMemo<Record<string, Point>>(() => {
    const positions: Record<string, Point> = {};
    const byDepth = new Map<number, TreeNode[]>();
    nodes.forEach(node => {
      const level = byDepth.get(node.depth) ?? [];
      level.push(node);
      byDepth.set(node.depth, level);
    });

    byDepth.forEach((level, depth) => {
      const margin = NODE_WIDTH / 2 + 12;
      const availableWidth = Math.max(0, graphWidth - margin * 2);
      level.forEach((node, index) => {
        positions[node.id] = {
          x: level.length === 1
            ? graphWidth / 2
            : margin + (availableWidth * index) / (level.length - 1),
          y: 45 + depth * LEVEL_HEIGHT,
        };
      });
    });

    return positions;
  }, [nodes, graphWidth]);

  const getPosition = (id: string): Point => {
    const base = basePositions[id] ?? { x: graphWidth / 2, y: 45 };
    const offset = offsets[id] ?? { x: 0, y: 0 };
    return { x: base.x + offset.x, y: base.y + offset.y };
  };

  const handleNodeOpen = (node: TreeNode) => {
    if (movedDuringDragRef.current) {
      movedDuringDragRef.current = false;
      return;
    }
    if (node.id !== ROOT_ID) navigate(`/${node.id}`);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaX = event.clientX - drag.startClientX;
    const deltaY = event.clientY - drag.startClientY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) movedDuringDragRef.current = true;

    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width > 0 ? graphWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? graphHeight / rect.height : 1;
    setOffsets(current => ({
      ...current,
      [drag.id]: {
        x: drag.startOffset.x + deltaX * scaleX,
        y: drag.startOffset.y + deltaY * scaleY,
      },
    }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <Box className="referenceTreePage">
      <WorkspaceNavigation />
      <Box className="referenceTreeContent">
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Box>
            <Typography level="h2">Arborescence du référentiel</Typography>
            <Typography level="body-sm" textColor="neutral">
              Cliquez sur un dossier ou un processus pour l’ouvrir. Faites glisser un nœud pour le repositionner.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate('/root')}>Retour au référentiel</Button>
        </Stack>
        <Card variant="outlined" className="referenceTreeCard">
          {isLoading && <Typography>Chargement de l’arborescence…</Typography>}
          {!isLoading && isError && <Typography color="danger">Impossible de charger les ressources du référentiel.</Typography>}
          {!isLoading && !isError && nodes.length > 1 && (
            <Box ref={canvasRef} className="referenceTreeCanvas">
              <svg
                className="referenceTreeSvg"
                width={graphWidth}
                height={graphHeight}
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                role="tree"
                aria-label="Arborescence interactive du référentiel"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {nodes.filter(node => node.parentId).map(node => {
                  const parent = getPosition(node.parentId as string);
                  const child = getPosition(node.id);
                  const middleY = (parent.y + child.y) / 2;
                  return (
                    <path
                      key={`link-${node.id}`}
                      className="referenceTreeLink"
                      d={`M ${parent.x} ${parent.y + NODE_HEIGHT / 2} V ${middleY} H ${child.x} V ${child.y - NODE_HEIGHT / 2}`}
                    />
                  );
                })}
                {nodes.map(node => {
                  const point = getPosition(node.id);
                  const colors = node.type === 'folder'
                    ? { fill: '#e5f4e8', stroke: '#72b58a' }
                    : node.type === 'process'
                      ? { fill: '#e7efff', stroke: '#7da3e8' }
                      : { fill: '#f1f5f9', stroke: '#94a3b8' };

                  return (
                    <g
                      key={node.id}
                      className={`referenceTreeNode referenceTreeNode-${node.type}`}
                      transform={`translate(${point.x}, ${point.y})`}
                      role="treeitem"
                      tabIndex={0}
                      aria-label={node.name}
                      onPointerDown={event => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        event.stopPropagation();
                        movedDuringDragRef.current = false;
                        dragRef.current = {
                          id: node.id,
                          startClientX: event.clientX,
                          startClientY: event.clientY,
                          startOffset: offsets[node.id] ?? { x: 0, y: 0 },
                        };
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onClick={() => handleNodeOpen(node)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleNodeOpen(node);
                        }
                      }}
                    >
                      <rect
                        x={-NODE_WIDTH / 2}
                        y={-NODE_HEIGHT / 2}
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx={9}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={1.5}
                      />
                      <text textAnchor="middle" dy="4" fontSize="12" fill="#1e293b">
                        {node.name.length > 23 ? `${node.name.slice(0, 20)}…` : node.name}
                      </text>
                      <title>{node.name}</title>
                    </g>
                  );
                })}
              </svg>
            </Box>
          )}
          {!isLoading && !isError && nodes.length <= 1 && (
            <Typography>Aucune ressource à afficher.</Typography>
          )}
        </Card>
      </Box>
    </Box>
  );
};

Component.displayName = 'ReferenceTreeContainer';
