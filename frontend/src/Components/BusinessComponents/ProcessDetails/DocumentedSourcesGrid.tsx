import React from 'react';
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { SharedDataGrid } from '../../GenericComponents/SharedDataGrid';

type Props<T extends object> = {
  rowData: T[];
  columnDefs: ColDef<T>[];
  getRowId: (row: T) => string;
  preferenceKey: string;
  mode?: 'read' | 'edit';
  selection?: false | 'single' | 'multiple';
  advancedFilter?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  onRowSelected?: (row: T | null) => void;
  onRowClicked?: (row: T | null) => void;
  onSelectionChanged?: (rows: T[]) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<T>) => void;
  selectedRowId?: string;
  selectionToolbar?: React.ReactNode;
  height?: number;
};

export const DocumentedSourcesGrid = <T extends object,>({
  rowData,
  columnDefs,
  getRowId,
  preferenceKey,
  mode = 'read',
  selection = 'single',
  advancedFilter = true,
  onAdd,
  addLabel = 'Ajouter',
  addDisabled = false,
  onRowSelected,
  onRowClicked,
  onSelectionChanged,
  onCellValueChanged,
  selectedRowId,
  selectionToolbar,
  height = 520,
}: Props<T>) => (
  <SharedDataGrid<T>
    rowData={rowData}
    columnDefs={columnDefs}
    getRowId={getRowId}
    preferenceKey={preferenceKey}
    mode={mode}
    editTrigger="doubleClick"
    selection={selection}
    advancedFilter={advancedFilter}
    selectedRowId={selectedRowId}
    onAdd={onAdd}
    addLabel={addLabel}
    addDisabled={addDisabled}
    onRowSelected={onRowSelected}
    onRowClicked={onRowClicked}
    onSelectionChanged={onSelectionChanged}
    onCellValueChanged={onCellValueChanged}
    selectionToolbar={selectionToolbar}
    height={height}
    paginationPageSize={20}
  />
);
