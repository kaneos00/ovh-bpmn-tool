import React, { useState } from 'react';
import { Box, Link, Sheet, Skeleton, Table } from '@mui/joy';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { type Cell, flexRender } from '@tanstack/react-table';
import { Link as RouterLink } from 'react-router-dom';

import { useResourceExplorer } from './hooks/useResourceExplorer';
import { ResourceActions } from './components/ResourceActions';
import { ResourceAction } from '../../../shared/types/BpmnResource';
import { ConditionalRender } from '../../../Components/GenericComponents/ConditionalRender/ConditionalRender';

import type { Resource } from '../../../Types';

import './resourceExplorer.scss';
import { getResourceIcon } from '../../../shared/helpers/resource';

type ResourceExplorerProps = {
  parentId: string;
  getActionLink: (id: string, action: ResourceAction) => string;
  getResourceLink: (id: string) => string;
};

export const ResourceExplorer = ({
  parentId,
  getActionLink,
  getResourceLink,
}: ResourceExplorerProps) => {
  const { table, columns, isLoading } = useResourceExplorer(parentId);
  const [contextMenuResourceId, setContextMenuResourceId] = useState<string | null>(null);

  const getCellContent = (cell: Cell<Resource, unknown>) => {
    switch (cell.column.id) {
      case 'actions':
        return (
          <ResourceActions
            resource={cell.row.original}
            getActionLink={getActionLink}
            openContextMenu={contextMenuResourceId === cell.row.original.id}
            onContextMenuClosed={() => setContextMenuResourceId(null)}
          />
        );
      case 'name':
        return (
          <>
            <Link
              className="resource-name-link ellipsis"
              underline="none"
              component={RouterLink}
              to={getResourceLink(cell.row.original.id)}
              title={cell.row.original.name}
            >
              <span>{getResourceIcon(cell.row.original.type)}</span>
              <span className="resource-name">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            </Link>
          </>
        );
      default:
        return flexRender(cell.column.columnDef.cell, cell.getContext());
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 1 }}>
        {isLoading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : (
          <Sheet
            variant="outlined"
            sx={{
              width: '100%',
              borderRadius: 'md',
              overflow: 'visible',
              minHeight: 0,
            }}
          >
            <Table
            stickyHeader
            hoverRow
            sx={{
              '--TableCell-headBackground': theme =>
                theme.vars.palette.background.level1,
              '--Table-headerUnderlineThickness': '1px',
              '--TableRow-hoverBackground': theme =>
                theme.vars.palette.background.level1,
            }}
            className="fileExplorer"
          >
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <>
                          <ConditionalRender
                            condition={header.column.getCanSort()}
                          >
                            <Link
                              underline="none"
                              onClick={header.column.getToggleSortingHandler()}
                              endDecorator={
                                <>
                                  {(header.column.getIsSorted() as string) ===
                                    'asc' && <ArrowUpward />}
                                  {(header.column.getIsSorted() as string) ===
                                    'desc' && <ArrowDownward />}
                                </>
                              }
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </Link>
                          </ConditionalRender>
                          <ConditionalRender
                            condition={!header.column.getCanSort()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </ConditionalRender>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {!table.getRowModel().rows.length && (
              <tbody>
                <tr>
                  <td colSpan={columns.length}>
                    <em>This folder is empty</em>
                  </td>
                </tr>
              </tbody>
            )}
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onContextMenu={event => {
                    event.preventDefault();
                    setContextMenuResourceId(row.original.id);
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as Record<string, unknown>)
                          ?.ellipsis
                          ? 'ellipsis'
                          : ''
                      }
                    >
                      {getCellContent(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            </Table>
          </Sheet>
        )}
      </Box>
    </Box>
  );
};
