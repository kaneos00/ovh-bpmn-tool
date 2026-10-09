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
type HierarchyNodeType = 'process' | 'subProcess' | 'activity';

type HierarchyNode = {
  id: string;
  name: string;
  type: HierarchyNodeType;
  canvasElementId?: string;
  children: HierarchyNode[];
};

type ProcessHierarchyTreeProps = {
  xmlContent: string;
  selectedElementId?: string | null;
  onElementClick: (elementId: string) => void;
};

const isSubProcess = (element: Element) =>
  element.localName.toLowerCase().includes('subprocess');

const getFlowElements = (parent: Element) =>
  Array.from(parent.children).filter(isSubProcess);

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
    return [];
  }

  const document = new DOMParser().parseFromString(
    xmlContent,
    'application/xml',
  );
  if (document.getElementsByTagName('parsererror').length > 0) {
    return [];
  }

  const processes = Array.from(
    document.getElementsByTagNameNS(BPMN_MODEL_NS, 'process'),
  ).filter(
    process => !process.parentElement || !isSubProcess(process.parentElement),
  );

  const participants = Array.from(
    document.getElementsByTagNameNS(BPMN_MODEL_NS, 'participant'),
  );

  const nodes = processes.map(process => {
    const id = process.getAttribute('id') || 'process';
    const participant = participants.find(
      candidate => candidate.getAttribute('processRef') === id,
    );
    return {
      id,
      name: process.getAttribute('name')?.trim() || id,
      type: 'process' as const,
      // A BPMN process is metadata, not a drawable canvas element. When it
      // has a pool/participant, use that visible participant for canvas focus.
      canvasElementId: participant?.getAttribute('id') || undefined,
      children: buildFlowNodes(process),
    };
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
    if (!selectedElementId) {
      setSelectedTreeItemId(null);
      return;
    }

    // Canvas IDs (for example, a pool mapped from a process) do not always
    // correspond to tree rows. Only synchronize when the selected ID exists
    // in this hierarchy, otherwise preserve the clicked process row.
    if (findNode(nodes, selectedElementId)) {
      setSelectedTreeItemId(selectedElementId);
    }
  }, [selectedElementId, nodes]);

  useEffect(() => {
    const rootIds = nodes.map(node => node.id);
    setExpandedNodes(rootIds);
  }, [nodes]);

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
              expansionTrigger="iconContainer"
              slots={{ collapseIcon: ExpandMore, expandIcon: ChevronRight }}
              onExpandedItemsChange={(_, itemIds) => {
                setExpandedNodes(itemIds);
              }}
              onSelectedItemsChange={(_, itemId) => {
                setSelectedTreeItemId(itemId ?? null);
              }}
              onItemClick={(_, itemId) => {
                const selectedNode = findNode(nodes, itemId);
                if (!selectedNode) return;

                if (
                  selectedNode.type === 'process' ||
                  selectedNode.type === 'subProcess'
                ) {
                  setExpandedNodes(current =>
                    current.includes(itemId)
                      ? current.filter(id => id !== itemId)
                      : [...current, itemId],
                  );

                  // A process is not normally a drawable BPMN shape, so focus
                  // its participant when available. A subprocess is drawable
                  // and can be focused directly while its children toggle.
                  if (selectedNode.type === 'process') {
                    if (selectedNode.canvasElementId) {
                      onElementClick(selectedNode.canvasElementId);
                    }
                  } else {
                    onElementClick(itemId);
                  }
                  return;
                }

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
