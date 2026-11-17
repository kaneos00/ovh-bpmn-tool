import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
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
  height?: number;
};

export const DocumentedSourcesGrid = <T extends object,>({
  rowData,
  columnDefs,
  getRowId,
  onAdd,
  addLabel = 'Ajouter',
  addDisabled = false,
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
