import React, { useMemo, useState } from 'react';
import { Box, Button, Card, Sheet, Stack, Typography } from '@mui/joy';
import Tree from 'react-d3-tree';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';

import { resourcesQuery } from '../../api/resources/resources.queries';
import { WorkspaceNavigation } from '../../Components/GenericComponents/WorkspaceNavigation/WorkspaceNavigation';
import { ResourceType } from '../../shared/types/BpmnResource';
import type { Resource } from '../../Types';

import './ReferenceTree.scss';

type D3Node = {
  name: string;
  attributes: { resourceId: string; type: string };
  children?: D3Node[];
};

const ROOT_ID = 'root';

export const Component = () => {
  const navigate = useNavigate();
  const { data: resources = [], isLoading, isError } = useQuery<Resource[]>(resourcesQuery());
  const [treeSize, setTreeSize] = useState({ width: 900, height: 620 });

  const treeData = useMemo<D3Node[]>(() => {
    const childrenByParent = new Map<string, Resource[]>();
    resources.forEach(resource => {
      const parentId = resource.parentId || ROOT_ID;
      const children = childrenByParent.get(parentId) ?? [];
      children.push(resource);
      childrenByParent.set(parentId, children);
    });
    childrenByParent.forEach(children => children.sort((a, b) => {
      if (a.type !== b.type) return a.type === ResourceType.Folder ? -1 : 1;
      return a.name.localeCompare(b.name, 'fr');
    }));

    const visited = new Set<string>();
    const makeNode = (resource: Resource): D3Node => {
      visited.add(resource.id);
      const children = (childrenByParent.get(resource.id) ?? [])
        .filter(child => !visited.has(child.id))
        .map(makeNode);
      return {
        name: resource.name,
        attributes: {
          resourceId: resource.id,
          type: resource.type === ResourceType.Folder ? 'folder' : 'process',
        },
        ...(children.length ? { children } : {}),
      };
    };

    return [{
      name: 'Référentiel',
      attributes: { resourceId: ROOT_ID, type: 'root' },
      children: (childrenByParent.get(ROOT_ID) ?? [])
        .filter(resource => !visited.has(resource.id))
        .map(makeNode),
    }];
  }, [resources]);

  const handleNodeClick = (node: D3Node) => {
    const id = node.attributes.resourceId;
    if (id !== ROOT_ID) navigate(`/${id}`);
  };

  return (
    <Box className="referenceTreePage">
      <WorkspaceNavigation />
      <Box className="referenceTreeContent">
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
          <Box>
            <Typography level="h2">Arborescence du référentiel</Typography>
            <Typography level="body-sm" textColor="neutral">
              Vue hiérarchique des dossiers et des processus. Sélectionnez un nœud pour ouvrir la ressource.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate('/root')}>Retour au référentiel</Button>
        </Stack>
        <Card variant="outlined" className="referenceTreeCard">
          {isLoading ? (
            <Typography>Chargement de l’arborescence…</Typography>
          ) : isError ? (
            <Typography color="danger">Impossible de charger les ressources du référentiel.</Typography>
          ) : treeData[0].children?.length ? (
            <Sheet
              className="referenceTreeCanvas"
              ref={element => {
                if (element) {
                  const rect = element.getBoundingClientRect();
                  if (rect.width && rect.height && (rect.width !== treeSize.width || rect.height !== treeSize.height)) {
                    setTreeSize({ width: rect.width, height: rect.height });
                  }
                }
              }}
            >
              <Tree
                data={treeData}
                orientation="vertical"
                translate={{ x: treeSize.width / 2, y: 72 }}
                dimensions={treeSize}
                zoom={0.999}
                scaleExtent={{ min: 0.25, max: 2.5 }}
                separation={{ siblings: 1.1, nonSiblings: 1.3 }}
                nodeSize={{ x: 190, y: 90 }}
                onNodeClick={handleNodeClick}
                pathFunc="step"
                renderCustomNodeElement={({ nodeDatum }) => {
                  const type = nodeDatum.attributes?.type;
                  const fill = type === 'folder' ? '#e5f4e8' : type === 'process' ? '#e7efff' : '#f1f5f9';
                  const stroke = type === 'folder' ? '#72b58a' : type === 'process' ? '#7da3e8' : '#94a3b8';
                  return (
                    <g>
                      <rect x={-82} y={-24} width={164} height={48} rx={9} fill={fill} stroke={stroke} strokeWidth={1.5} />
                      <text textAnchor="middle" dy="4" fontSize="12" fill="#1e293b">
                        {(nodeDatum.name || '').length > 23 ? `${nodeDatum.name.slice(0, 20)}…` : nodeDatum.name}
                      </text>
                      <title>{nodeDatum.name}</title>
                    </g>
                  );
                }}
              />
            </Sheet>
          ) : (
            <Typography>Aucune ressource à afficher.</Typography>
          )}
        </Card>
      </Box>
    </Box>
  );
};

Component.displayName = 'ReferenceTreeContainer';
