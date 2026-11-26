import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import type {
  CellValueChangedEvent,
  ColDef,
  ColumnState,
  GridApi,
  GridReadyEvent,
  RowSelectionOptions,
} from 'ag-grid-community';
import { Box, Button, Input, Stack, Typography } from '@mui/joy';
import { AddOutlined, CloseOutlined, ViewColumnOutlined, SearchOutlined } from '@mui/icons-material';
import './SharedDataGrid.scss';

ModuleRegistry.registerModules([AllCommunityModule]);

export type SharedDataGridProps<T extends object> = {
  rowData: T[];
  columnDefs: ColDef<T>[];
  getRowId: (row: T) => string;
  preferenceKey: string;
  height?: number;
  mode?: 'read' | 'edit';
  editTrigger?: 'cell' | 'doubleClick';
  selection?: false | 'single' | 'multiple';
  selectedRowId?: string;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  onRowSelected?: (row: T | null) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  toolbarContent?: React.ReactNode;
  selectionToolbar?: React.ReactNode;
  localeText?: Record<string, string>;
  paginationPageSize?: number;
  quickFilter?: boolean;
};

/**
 * Shared business-grid foundation. Consumer screens provide their own data,
 * column definitions and business actions; layout, preferences and common
 * interactions remain centralized here.
 */
export function SharedDataGrid<T extends object>({
  rowData,
  columnDefs,
  getRowId,
  preferenceKey,
  height = 520,
  mode = 'read',
  editTrigger = 'cell',
  selection = 'single',
  selectedRowId,
  onAdd,
  addLabel = 'Ajouter',
  addDisabled = false,
  onRowSelected,
  onCellValueChanged,
  toolbarContent,
  selectionToolbar,
  localeText,
  paginationPageSize = 20,
  quickFilter = true,
}: SharedDataGridProps<T>) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const [search, setSearch] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const storageKey = useMemo(() => `khi-grid-column-state:${preferenceKey}`, [preferenceKey]);

  const readColumnState = useCallback((): ColumnState[] => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const persistColumnState = useCallback((api: GridApi<T>) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(api.getColumnState()));
    } catch {
      // Storage can be unavailable in private browsing; the grid remains usable.
    }
  }, [storageKey]);

  const syncVisibleColumns = useCallback((api: GridApi<T>) => {
    setVisibleColumns(api.getColumnState().filter(column => column.hide !== true).map(column => column.colId));
  }, []);

  const restoreColumnState = useCallback((api: GridApi<T>) => {
    const state = readColumnState();
    if (state.length) api.applyColumnState({ state, applyOrder: true });
    syncVisibleColumns(api);
  }, [readColumnState, syncVisibleColumns]);

  useEffect(() => {
    if (apiRef.current) restoreColumnState(apiRef.current);
  }, [restoreColumnState]);

  useEffect(() => {
    apiRef.current?.setGridOption('quickFilterText', search);
  }, [search]);

  useEffect(() => {
    if (selectedRowId && apiRef.current) {
      const node = apiRef.current.getRowNode(selectedRowId);
      if (node) {
        node.setSelected(true);
        apiRef.current.ensureNodeVisible(node, 'middle');
      }
    }
  }, [selectedRowId, rowData]);

  const selectionOptions = useMemo<RowSelectionOptions | undefined>(() => {
    if (!selection) return undefined;
    return {
      mode: selection === 'multiple' ? 'multiRow' : 'singleRow',
      checkboxes: true,
      headerCheckbox: selection === 'multiple',
      enableClickSelection: true,
    };
  }, [selection]);

  const translatedLocale = useMemo(() => ({
    page: 'Page',
    to: 'à',
    of: 'sur',
    next: 'Suivant',
    previous: 'Précédent',
    noRowsToShow: 'Aucune donnée à afficher',
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
    ...localeText,
  }), [localeText]);

  const toggleColumn = (columnId: string, visible: boolean) => {
    apiRef.current?.setColumnsVisible([columnId], visible);
  };

  const resetColumns = () => {
    try { window.localStorage.removeItem(storageKey); } catch { /* no-op */ }
    apiRef.current?.resetColumnState();
    if (apiRef.current) syncVisibleColumns(apiRef.current);
  };

  const clearFilters = () => {
    setSearch('');
    apiRef.current?.setFilterModel(null);
    apiRef.current?.setGridOption('quickFilterText', '');
  };

  const exportCsv = () => apiRef.current?.exportDataAsCsv({ fileName: `${preferenceKey}.csv` });

  return (
    <Box className="khi-shared-grid" sx={{ width: '100%', minWidth: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
          {onAdd && <Button size="sm" startDecorator={<AddOutlined />} disabled={addDisabled} onClick={onAdd}>{addLabel}</Button>}
          {quickFilter && (
            <Input
              size="sm"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher dans la grille…"
              startDecorator={<SearchOutlined />}
              endDecorator={search ? <Button size="sm" variant="plain" color="neutral" onClick={() => setSearch('')}><CloseOutlined /></Button> : null}
              sx={{ minWidth: 180, maxWidth: 320, flex: 1 }}
            />
          )}
          {toolbarContent}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Button size="sm" variant="outlined" color="neutral" startDecorator={<ViewColumnOutlined />} onClick={() => setShowColumns(value => !value)}>Colonnes</Button>
          <Button size="sm" variant="outlined" color="neutral" startDecorator={<CloseOutlined />} onClick={clearFilters}>Effacer les filtres</Button>
          <Button size="sm" variant="outlined" color="neutral" onClick={exportCsv}>Exporter</Button>
        </Stack>
      </Stack>
      {showColumns && (
        <Box className="khi-shared-grid-columns" sx={{ mb: 1, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography level="title-sm">Colonnes visibles</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="sm" variant="plain" onClick={() => apiRef.current?.setColumnsVisible(columnDefs.map(column => String(column.colId || column.field)), true)}>Tout afficher</Button>
              <Button size="sm" variant="plain" onClick={resetColumns}>Réinitialiser</Button>
            </Stack>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {columnDefs.map(column => {
              const id = String(column.colId || column.field);
              return (
                <label key={id} className="khi-shared-grid-column-option">
                  <input type="checkbox" checked={visibleColumns.includes(id)} onChange={event => toggleColumn(id, event.target.checked)} />
                  <span>{column.headerName || id}</span>
                </label>
              );
            })}
          </Stack>
        </Box>
      )}
      <Box className="khi-shared-grid-selection-slot">
        {selectionToolbar}
      </Box>
      <Box sx={{ width: '100%', height, minWidth: 0 }}>
        <AgGridReact<T>
          theme={themeQuartz}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={params => getRowId(params.data)}
          defaultColDef={{ sortable: true, filter: true, resizable: true, minWidth: 110, flex: 1, wrapText: true, autoHeight: true }}
          rowSelection={selectionOptions}
          editType={mode === 'edit' && editTrigger === 'doubleClick' ? 'fullRow' : undefined}
          suppressClickEdit={editTrigger === 'doubleClick'}
          suppressCellFocus
          animateRows={false}
          pagination
          paginationPageSize={paginationPageSize}
          onGridReady={(event: GridReadyEvent<T>) => {
            apiRef.current = event.api;
            restoreColumnState(event.api);
            if (selectedRowId) {
              const node = event.api.getRowNode(selectedRowId);
              if (node) { node.setSelected(true); event.api.ensureNodeVisible(node, 'middle'); }
            }
          }}
          onColumnMoved={event => persistColumnState(event.api)}
          onColumnResized={event => { if (event.finished) persistColumnState(event.api); }}
          onColumnVisible={event => { persistColumnState(event.api); syncVisibleColumns(event.api); }}
          onColumnPinned={event => persistColumnState(event.api)}
          onCellValueChanged={event => onCellValueChanged?.(event)}
          onRowClicked={event => onRowSelected?.(event.data ?? null)}
          onSelectionChanged={event => onRowSelected?.(event.api.getSelectedRows()[0] ?? null)}
          onRowDoubleClicked={event => {
            if (mode === 'edit' && editTrigger === 'doubleClick') event.api.startEditingCell({ rowIndex: event.rowIndex ?? 0, colKey: event.api.getAllDisplayedColumns().find(column => column.isCellEditable(event.node))?.getColId() ?? '' });
          }}
          localeText={translatedLocale}
        />
      </Box>
    </Box>
  );
}

export type { ColDef };
