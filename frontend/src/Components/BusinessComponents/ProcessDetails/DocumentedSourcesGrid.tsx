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

  useEffect(() => {
    if (!selectedRowId || !gridApiRef.current) return;
    const node = gridApiRef.current.getRowNode(selectedRowId);
    if (!node) return;
    gridApiRef.current.ensureNodeVisible(node, 'middle');
    gridApiRef.current.flashCells({ rowNodes: [node] });
  }, [selectedRowId, rowData]);

  const handleGridReady = (event: GridReadyEvent<T>) => {
    gridApiRef.current = event.api;
    if (!selectedRowId) return;
    const node = event.api.getRowNode(selectedRowId);
    if (!node) return;
    event.api.ensureNodeVisible(node, 'middle');
    event.api.flashCells({ rowNodes: [node] });
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
