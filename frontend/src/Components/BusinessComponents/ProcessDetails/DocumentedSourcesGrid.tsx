import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ColDef, ModuleRegistry } from 'ag-grid-community';
import { AddOutlined, DeleteOutline, EditOutlined } from '@mui/icons-material';
import { Box, Button, IconButton, Stack } from '@mui/joy';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type Props<T extends object> = {
  rowData: T[];
  columnDefs: ColDef<T>[];
  getRowId: (row: T) => string;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  canDelete?: (row: T) => boolean;
  renderExtraActions?: (row: T) => React.ReactNode;
  onRowSelected?: (row: T | null) => void;
  height?: number;
};

export const DocumentedSourcesGrid = <T extends object,>({
  rowData,
  columnDefs,
  getRowId,
  onAdd,
  addLabel = 'Ajouter',
  addDisabled = false,
  onEdit,
  onDelete,
  canDelete,
  renderExtraActions,
  onRowSelected,
  height = 520,
}: Props<T>) => {
  const columns = useMemo<ColDef<T>[]>(() => [
    ...columnDefs,
    {
      headerName: 'Actions',
      colId: 'documentedSourceActions',
      pinned: 'right',
      sortable: false,
      filter: false,
      resizable: false,
      width: 142,
      minWidth: 142,
      cellRenderer: (params: { data?: T }) => {
        if (!params.data) return null;
        return (
          <Stack direction="row" spacing={0.25} alignItems="center">
            {onEdit && (
              <IconButton size="sm" variant="plain" color="primary" title="Modifier" aria-label="Modifier" onClick={() => onEdit(params.data as T)}>
                <EditOutlined />
              </IconButton>
            )}
            {onDelete && (!canDelete || canDelete(params.data as T)) && (
              <IconButton size="sm" variant="plain" color="danger" title="Délier" aria-label="Délier" onClick={() => onDelete(params.data as T)}>
                <DeleteOutline />
              </IconButton>
            )}
            {renderExtraActions?.(params.data as T)}
          </Stack>
        );
      },
    },
  ], [columnDefs, onEdit, onDelete, canDelete, renderExtraActions]);

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {onAdd && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button size="sm" startDecorator={<AddOutlined />} disabled={addDisabled} onClick={onAdd}>{addLabel}</Button>
        </Stack>
      )}
      <Box className="ag-theme-quartz" sx={{ width: '100%', height, minWidth: 0 }}>
        <AgGridReact<T>
          rowData={rowData}
          columnDefs={columns}
          getRowId={params => getRowId(params.data)}
          defaultColDef={{ sortable: true, filter: true, resizable: true, minWidth: 110, flex: 1, wrapText: true, autoHeight: true }}
          rowSelection="single"
          suppressCellFocus
          animateRows={false}
          pagination
          paginationPageSize={20}
          onSelectionChanged={event => onRowSelected?.(event.api.getSelectedRows()[0] ?? null)}
          localeText={{
            page: 'Page',
            to: 'à',
            of: 'sur',
            next: 'Suivant',
            previous: 'Précédent',
            noRowsToShow: 'Aucune information documentée',
            searchOoo: 'Rechercher…',
            selectAll: 'Tout sélectionner',
            blanks: 'Vides',
            filterOoo: 'Filtrer…',
            equals: 'Égal à',
            notEqual: 'Différent de',
            contains: 'Contient',
            notContains: 'Ne contient pas',
            startsWith: 'Commence par',
            endsWith: 'Termine par',
          }}
        />
      </Box>
    </Box>
  );
};
