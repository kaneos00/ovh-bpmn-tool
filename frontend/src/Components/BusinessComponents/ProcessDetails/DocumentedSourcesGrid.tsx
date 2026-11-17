import React, { useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AddOutlined } from '@mui/icons-material';
import { Box, Button, Stack } from '@mui/joy';

ModuleRegistry.registerModules([AllCommunityModule]);

type Props<T extends object> = {
  rowData: T[];
  columnDefs: ColDef<T>[];
  getRowId: (row: T) => string;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  selectedRowId?: string | null;
  height?: number;
};

export const DocumentedSourcesGrid = <T extends object,>({
  rowData,
  columnDefs,
  getRowId,
  onAdd,
  addLabel = 'Ajouter',
  addDisabled = false,
  selectedRowId,
  height = 520,
}: Props<T>) => {
  const gridApiRef = useRef<GridApi<T> | null>(null);

  const revealSelectedRow = (api: GridApi<T>) => {
    if (!selectedRowId) return;
    const node = api.getRowNode(selectedRowId);
    if (!node) return;
    if (node.rowIndex !== null && node.rowIndex !== undefined) {
      api.paginationGoToPage(Math.floor(node.rowIndex / 20));
    }
    api.ensureNodeVisible(node, 'middle');
    api.flashCells({ rowNodes: [node] });
  };

  useEffect(() => {
    if (!gridApiRef.current) return;
    revealSelectedRow(gridApiRef.current);
  }, [selectedRowId, rowData]);

  const handleGridReady = (event: GridReadyEvent<T>) => {
    gridApiRef.current = event.api;
    revealSelectedRow(event.api);
  };

  return (
  <Box sx={{ width: '100%', minWidth: 0 }}>
    {onAdd && (
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Button size="sm" startDecorator={<AddOutlined />} disabled={addDisabled} onClick={onAdd}>{addLabel}</Button>
      </Stack>
    )}
    <Box sx={{ width: '100%', height, minWidth: 0 }}>
      <AgGridReact<T>
        theme={themeQuartz}
        rowData={rowData}
        columnDefs={columnDefs}
        getRowId={params => getRowId(params.data)}
        onGridReady={handleGridReady}
        getRowStyle={params => params.data && selectedRowId && getRowId(params.data) === selectedRowId
          ? { backgroundColor: 'rgba(25, 118, 210, 0.14)', borderLeft: '3px solid #1976d2' }
          : undefined}
        defaultColDef={{ sortable: true, filter: true, resizable: true, minWidth: 110, flex: 1, wrapText: true, autoHeight: true }}
        // Editing starts on double-click; Escape cancels the active editor.
        singleClickEdit={false}
        suppressClickEdit={false}
        suppressCellFocus
        animateRows={false}
        pagination
        paginationPageSize={20}
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
