import React from 'react';
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community';
import { SharedDataGrid } from '../../GenericComponents/SharedDataGrid';

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
  height = 520,
}: Props<T>) => (
  <SharedDataGrid<T>
    rowData={rowData}
    columnDefs={columnDefs}
    getRowId={getRowId}
    preferenceKey="process-documented-sources"
    mode="edit"
    editTrigger="cell"
    selection="single"
    selectedRowId={selectedRowId}
    onAdd={onAdd}
    addLabel={addLabel}
    addDisabled={addDisabled}
    onRowSelected={onRowSelected}
    onCellValueChanged={onCellValueChanged}
    height={height}
    paginationPageSize={20}
    localeText={{ noRowsToShow: 'Aucune information documentée' }}
  />
);
