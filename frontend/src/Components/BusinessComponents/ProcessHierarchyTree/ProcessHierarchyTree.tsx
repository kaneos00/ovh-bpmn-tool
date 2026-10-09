import React, { useEffect, useMemo, useState } from 'react';
import {
  List,
  ListItem,
  ListItemContent,
  ListSubheader,
  Typography,
} from '@mui/joy';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import {
  AccountTreeOutlined,
  CallSplitOutlined,
  ChevronRight,
  ExpandMore,
  TaskAltOutlined,
} from '@mui/icons-material';

import { FolderTreeItem } from '../FolderTree/components/FolderTreeItem';

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const DEBUG_PREFIX = '[ProcessHierarchyTree]';

// Temporary diagnostics: warn-level logs remain visible when Debug is filtered out.
console.warn('[NAV-DIAG] ProcessHierarchyTree module loaded');

type HierarchyNodeType = 'process' | 'subProcess' | 'activity';

type HierarchyNode = {
  id: string;
  name: string;
  type: HierarchyNodeType;
  children: HierarchyNode[];
};

type ProcessHierarchyTreeProps = {
  xmlContent: string;
  selectedElementId?: string | null;
  onElementClick: (elementId: string) => void;
};

const isSubProcess = (element: Element) =>
  element.localName.toLowerCase().includes('subprocess');

const isActivity = (element: Element) => {
  const localName = element.localName.toLowerCase();
  return (
    localName.endsWith('task') ||
    localName.endsWith('activity') ||
    localName === 'transaction'
  );
};

const getFlowElements = (parent: Element) =>
  Array.from(parent.children).filter(
    element => isSubProcess(element) || isActivity(element),
  );

const buildFlowNodes = (parent: Element): HierarchyNode[] =>
  getFlowElements(parent).map(element => {
    const id = element.getAttribute('id') || element.localName;
    const name = element.getAttribute('name')?.trim() || id;
    const type: HierarchyNodeType = isSubProcess(element)
      ? 'subProcess'
      : 'activity';

    return {
      id,
      name,
      type,
      children: type === 'subProcess' ? buildFlowNodes(element) : [],
    };
  });

export const parseProcessHierarchy = (xmlContent: string): HierarchyNode[] => {
  if (!xmlContent.trim() || typeof DOMParser === 'undefined') {
    console.debug(DEBUG_PREFIX, 'Parsing skipped', {
      hasXml: Boolean(xmlContent.trim()),
      domParserAvailable: typeof DOMParser !== 'undefined',
    });
    return [];
  }

  const document = new DOMParser().parseFromString(
    xmlContent,
    'application/xml',
  );
  if (document.getElementsByTagName('parsererror').length > 0) {
    console.warn(DEBUG_PREFIX, 'BPMN XML parsing failed');
    return [];
  }

  const processes = Array.from(
    document.getElementsByTagNameNS(BPMN_MODEL_NS, 'process'),
  ).filter(
    process => !process.parentElement || !isSubProcess(process.parentElement),
  );

  const nodes = processes.map(process => {
    const id = process.getAttribute('id') || 'process';
    return {
      id,
      name: process.getAttribute('name')?.trim() || id,
      type: 'process' as const,
      children: buildFlowNodes(process),
    };
  });

  console.debug(DEBUG_PREFIX, 'Hierarchy parsed', {
    xmlLength: xmlContent.length,
    processCount: nodes.length,
    processes: nodes.map(node => ({
      id: node.id,
      name: node.name,
      childCount: node.children.length,
      childTypes: node.children.reduce<Record<string, number>>((counts, child) => {
        counts[child.type] = (counts[child.type] ?? 0) + 1;
        return counts;
      }, {}),
    })),
  });

  return nodes;
};

const findNode = (
  nodes: HierarchyNode[],
  id: string,
): HierarchyNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }

  return undefined;
};

const getNodeIcon = (type: HierarchyNodeType) => {
  switch (type) {
    case 'process':
      return <AccountTreeOutlined fontSize="small" />;
    case 'subProcess':
      return <CallSplitOutlined fontSize="small" />;
    default:
      return <TaskAltOutlined fontSize="small" />;
  }
};

export const ProcessHierarchyTree = ({
  xmlContent,
  selectedElementId,
  onElementClick,
}: ProcessHierarchyTreeProps) => {
  const nodes = useMemo(() => parseProcessHierarchy(xmlContent), [xmlContent]);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  // The BPMN process itself is not usually a drawable shape in the canvas.
  // Keep tree selection separate from canvas selection so process rows can
  // still be visibly selected while they expand/collapse their hierarchy.
  const [selectedTreeItemId, setSelectedTreeItemId] = useState<string | null>(
    selectedElementId ?? null,
  );

  useEffect(() => {
    setSelectedTreeItemId(selectedElementId ?? null);
  }, [selectedElementId]);

  useEffect(() => {
    console.warn('[NAV-DIAG] ProcessHierarchyTree mounted/rendered', {
      hasXml: Boolean(xmlContent.trim()),
      xmlLength: xmlContent.length,
      processCount: nodes.length,
      rootIds: nodes.map(node => node.id),
    });
  }, [xmlContent, nodes]);

  useEffect(() => {
    const rootIds = nodes.map(node => node.id);
    console.debug(DEBUG_PREFIX, 'Root expansion initialized', {
      rootIds,
      selectedElementId,
    });
    setExpandedNodes(rootIds);
  }, [nodes]);

  useEffect(() => {
    console.debug(DEBUG_PREFIX, 'Props/state changed', {
      selectedElementId: selectedElementId ?? null,
      expandedNodeIds: expandedNodes,
      processCount: nodes.length,
    });
  }, [selectedElementId, expandedNodes, nodes.length]);

  const renderNode = (node: HierarchyNode): React.ReactNode => {
    const icon = getNodeIcon(node.type);

    return (
      <FolderTreeItem
        key={node.id}
        itemId={node.id}
        label={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {icon}
            <span>{node.name}</span>
          </span>
        }
        title={node.name}
      >
        {node.children.map(child => renderNode(child))}
      </FolderTreeItem>
    );
  };

  return (
    <List
      sx={{
        '--ListItem-radius': '8px',
        '--ListItem-minHeight': '32px',
        '--List-gap': '4px',
      }}
    >
      <ListSubheader role="presentation" sx={{ color: 'text.primary' }}>
        Processus et activités
      </ListSubheader>
      {nodes.length ? (
        <ListItem>
          <ListItemContent>
            <SimpleTreeView
              selectedItems={selectedTreeItemId}
              expandedItems={expandedNodes}
              disabledItemsFocusable
              slots={{ collapseIcon: ExpandMore, expandIcon: ChevronRight }}
              onExpandedItemsChange={(_, itemIds) => {
                console.warn('[NAV-DIAG] Tree expansion changed', {
                  expandedNodeIds: itemIds,
                });
                setExpandedNodes(itemIds);
              }}
              onSelectedItemsChange={(_, itemId) => {
                console.warn('[NAV-DIAG] Tree selection event received', {
                  itemId: itemId ?? null,
                  knownNode: itemId ? findNode(nodes, itemId) ?? null : null,
                });

                if (!itemId) {
                  setSelectedTreeItemId(null);
                  console.debug(DEBUG_PREFIX, 'Selection ignored: empty itemId');
                  return;
                }

                const selectedNode = findNode(nodes, itemId);
                if (!selectedNode) {
                  console.warn(DEBUG_PREFIX, 'Selection ignored: node not found', {
                    itemId,
                    knownRootIds: nodes.map(node => node.id),
                  });
                  return;
                }

                setSelectedTreeItemId(itemId);

                if (selectedNode.type === 'process') {
                  setExpandedNodes(current =>
                    current.includes(itemId)
                      ? current.filter(id => id !== itemId)
                      : [...current, itemId],
                  );
                  return;
                }

                console.debug(DEBUG_PREFIX, 'Calling onElementClick', {
                  itemId,
                  type: selectedNode.type,
                  name: selectedNode.name,
                });
                onElementClick(itemId);
              }}
            >
              {nodes.map(node => renderNode(node))}
            </SimpleTreeView>
          </ListItemContent>
        </ListItem>
      ) : (
        <ListItem>
          <ListItemContent>
            <Typography level="body-sm" textColor="neutral">
              Aucun processus BPMN trouvé dans ce diagramme.
            </Typography>
          </ListItemContent>
        </ListItem>
      )}
    </List>
  );
};
