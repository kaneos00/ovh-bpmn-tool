import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community';
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
  onRowSelected?: (row: T | null) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  selectedRowId?: string;
  multiSelect?: boolean;
  onSelectionChanged?: (rows: T[]) => void;
  height?: number;
};

export const DocumentedSourcesGrid = <T extends object,>({
  rowData,
  columnDefs,
  getRowId,
  onAdd,
  addLabel = 'Ajouter',
  addDisabled = false,
  onRowSelected,
  onCellValueChanged,
  selectedRowId,
  multiSelect = false,
  onSelectionChanged,
  height = 520,
}: Props<T>) => (
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
        defaultColDef={{ sortable: true, filter: true, resizable: true, minWidth: 110, flex: 1, wrapText: true, autoHeight: true, cellStyle: { cursor: 'text' }, tooltipValueGetter: params => params.value === null ? '' : 'Cliquer deux fois pour modifier' }}
        singleClickEdit
        rowSelection={multiSelect ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true } : { mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
        suppressCellFocus
        animateRows={false}
        pagination
        paginationPageSize={20}
        onFirstDataRendered={event => {
          if (!selectedRowId) return;
          const node = event.api.getRowNode(selectedRowId);
          if (node) { node.setSelected(true); event.api.ensureNodeVisible(node, 'middle'); }
        }}
        onRowDataUpdated={event => {
          if (!selectedRowId) return;
          const node = event.api.getRowNode(selectedRowId);
          if (node) { node.setSelected(true); event.api.ensureNodeVisible(node, 'middle'); }
        }}
        onCellValueChanged={event => onCellValueChanged?.(event)}
        onRowClicked={event => onRowSelected?.(event.data ?? null)}
        onSelectionChanged={event => { onRowSelected?.(event.api.getSelectedRows()[0] ?? null); onSelectionChanged?.(event.api.getSelectedRows()); }}
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
