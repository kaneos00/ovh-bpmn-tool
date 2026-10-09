import React, { useEffect, useMemo, useState } from 'react';
import { List, ListItem, ListItemContent, ListSubheader, Typography } from '@mui/joy';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import {
  AccountTreeOutlined,
  CallSplitOutlined,
  ChevronRight,
  DescriptionOutlined,
  ExpandMore,
} from '@mui/icons-material';

import { FolderTreeItem } from '../FolderTree/components/FolderTreeItem';

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

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

const isActivity = (element: Element) =>
  element.localName.endsWith('Task') ||
  element.localName.endsWith('Activity') ||
  element.localName === 'transaction';

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
  if (!xmlContent.trim() || typeof DOMParser === 'undefined') return [];

  const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) return [];

  return Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'process'))
    .filter(process => !process.parentElement || !isSubProcess(process.parentElement))
    .map(process => {
      const id = process.getAttribute('id') || 'process';
      return {
        id,
        name: process.getAttribute('name')?.trim() || id,
        type: 'process' as const,
        children: buildFlowNodes(process),
      };
    });
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

export const ProcessHierarchyTree = ({
  xmlContent,
  selectedElementId,
  onElementClick,
}: ProcessHierarchyTreeProps) => {
  const nodes = useMemo(() => parseProcessHierarchy(xmlContent), [xmlContent]);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  useEffect(() => {
    setExpandedNodes(nodes.map(node => node.id));
  }, [nodes]);

  const renderNode = (node: HierarchyNode): React.ReactNode => {
    const icon =
      node.type === 'process' ? (
        <AccountTreeOutlined fontSize="small" />
      ) : node.type === 'subProcess' ? (
        <CallSplitOutlined fontSize="small" />
      ) : (
        <DescriptionOutlined fontSize="small" />
      );

    return (
      <FolderTreeItem
        key={node.id}
        itemId={node.id}
        label={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
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
        Process hierarchy
      </ListSubheader>
      {nodes.length ? (
        <ListItem>
          <ListItemContent>
            <SimpleTreeView
              selectedItems={selectedElementId ?? ''}
              expandedItems={expandedNodes}
              disabledItemsFocusable
              slots={{ collapseIcon: ExpandMore, expandIcon: ChevronRight }}
              onExpandedItemsChange={(_, itemIds) => setExpandedNodes(itemIds)}
              onSelectedItemsChange={(_, itemId) => {
                if (!itemId) return;
                const selectedNode = findNode(nodes, itemId);
                if (selectedNode && selectedNode.type !== 'process') {
                  onElementClick(itemId);
                }
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
              No BPMN process found in this diagram.
            </Typography>
          </ListItemContent>
        </ListItem>
      )}
    </List>
  );
};
