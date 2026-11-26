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
  IRowNode,
  RowSelectionOptions,
} from 'ag-grid-community';
import { Box, Button, Input, Option, Select, Stack, Typography } from '@mui/joy';
import {
  AddOutlined,
  CloseOutlined,
  FilterAltOutlined,
  SearchOutlined,
  ViewColumnOutlined,
} from '@mui/icons-material';
import './SharedDataGrid.scss';

ModuleRegistry.registerModules([AllCommunityModule]);

type FilterRule = {
  kind: 'rule';
  id: string;
  field: string;
  operator: string;
  value: string;
};
type FilterGroup = {
  kind: 'group';
  id: string;
  logic: 'AND' | 'OR';
  children: FilterNode[];
};
type FilterNode = FilterRule | FilterGroup;
type FilterField = { id: string; label: string; type: 'text' | 'number' | 'date' | 'boolean' };

export type SharedDataGridProps<T extends object> = {
  rowData: T[];
  columnDefs: ColDef<T>[];
  getRowId: (row: T) => string;
  preferenceKey: string;
  height?: number;
  mode?: 'read' | 'edit';
  editTrigger?: 'cell' | 'doubleClick';
  selection?: false | 'single' | 'multiple';
  advancedFilter?: boolean;
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

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emptyFilter = (): FilterGroup => ({ kind: 'group', id: makeId('group'), logic: 'AND', children: [] });

const columnId = <T extends object>(column: ColDef<T>, index: number) =>
  String(column.colId || column.field || column.headerName || `column-${index}`);

const fieldType = <T extends object>(column: ColDef<T>): FilterField['type'] => {
  if (column.cellDataType === 'number' || column.filter === 'agNumberColumnFilter') return 'number';
  if (column.cellDataType === 'date' || column.cellDataType === 'dateString' || column.filter === 'agDateColumnFilter') return 'date';
  if (column.cellDataType === 'boolean') return 'boolean';
  return 'text';
};

const ruleHasValue = (rule: FilterRule) => ['empty', 'notEmpty'].includes(rule.operator) || rule.value.trim() !== '';
const activeRuleCount = (node: FilterNode): number => node.kind === 'rule'
  ? (ruleHasValue(node) ? 1 : 0)
  : node.children.reduce((total, child) => total + activeRuleCount(child), 0);

const removeFilterNode = (node: FilterGroup, id: string): FilterGroup => ({
  ...node,
  children: node.children
    .filter(child => child.id !== id)
    .map(child => child.kind === 'group' ? removeFilterNode(child, id) : child),
});

const compareRule = <T extends object>(row: T, rule: FilterRule, field: FilterField): boolean => {
  const raw = (row as Record<string, unknown>)[rule.field];
  if (rule.operator === 'empty') return raw === null || raw === undefined || String(raw).trim() === '';
  if (rule.operator === 'notEmpty') return raw !== null && raw !== undefined && String(raw).trim() !== '';
  if (!rule.value.trim()) return true;

  if (field.type === 'number') {
    const actual = Number(raw);
    const expected = Number(rule.value);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    switch (rule.operator) {
      case 'equals': return actual === expected;
      case 'notEquals': return actual !== expected;
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      default: return true;
    }
  }

  if (field.type === 'date') {
    const actual = new Date(String(raw ?? '')).getTime();
    const expected = new Date(rule.value).getTime();
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    switch (rule.operator) {
      case 'equals': return new Date(actual).toDateString() === new Date(expected).toDateString();
      case 'before': return actual < expected;
      case 'after': return actual > expected;
      default: return true;
    }
  }

  if (field.type === 'boolean') {
    const actual = Boolean(raw);
    const expected = rule.value === 'true';
    return rule.operator === 'notEquals' ? actual !== expected : actual === expected;
  }

  const actual = String(raw ?? '').toLocaleLowerCase('fr');
  const expected = rule.value.toLocaleLowerCase('fr');
  switch (rule.operator) {
    case 'equals': return actual === expected;
    case 'notEquals': return actual !== expected;
    case 'starts': return actual.startsWith(expected);
    default: return actual.includes(expected);
  }
};

const matchesFilter = <T extends object>(row: T, node: FilterNode, fields: FilterField[]): boolean => {
  if (node.kind === 'rule') {
    const field = fields.find(item => item.id === node.field);
    return !field || !ruleHasValue(node) || compareRule(row, node, field);
  }
  const activeChildren = node.children.filter(child => activeRuleCount(child) > 0);
  if (!activeChildren.length) return true;
  return node.logic === 'AND'
    ? activeChildren.every(child => matchesFilter(row, child, fields))
    : activeChildren.some(child => matchesFilter(row, child, fields));
};

const operatorsByType: Record<FilterField['type'], { value: string; label: string }[]> = {
  text: [
    { value: 'contains', label: 'contient' },
    { value: 'equals', label: 'est égal à' },
    { value: 'notEquals', label: 'est différent de' },
    { value: 'starts', label: 'commence par' },
  ],
  number: [
    { value: 'equals', label: 'est égal à' },
    { value: 'notEquals', label: 'est différent de' },
    { value: 'gt', label: 'est supérieur à' },
    { value: 'gte', label: 'est supérieur ou égal à' },
    { value: 'lt', label: 'est inférieur à' },
    { value: 'lte', label: 'est inférieur ou égal à' },
  ],
  date: [
    { value: 'equals', label: 'est le' },
    { value: 'before', label: 'est avant le' },
    { value: 'after', label: 'est après le' },
  ],
  boolean: [
    { value: 'equals', label: 'est' },
    { value: 'notEquals', label: 'n’est pas' },
  ],
};

function FilterRuleEditor({
  rule,
  fields,
  onChange,
  onRemove,
}: {
  rule: FilterRule;
  fields: FilterField[];
  onChange: (rule: FilterRule) => void;
  onRemove: () => void;
}) {
  const field = fields.find(item => item.id === rule.field) ?? fields[0];
  if (!field) return null;
  const operators = operatorsByType[field.type];
  const changeField = (fieldId: string) => {
    const next = fields.find(item => item.id === fieldId) ?? fields[0];
    onChange({
      ...rule,
      field: next.id,
      operator: next.type === 'text' ? 'contains' : 'equals',
      value: '',
    });
  };

  return (
    <Stack className="khi-grid-filter-rule" direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
      <Select size="sm" value={field.id} onChange={(_, value) => value && changeField(value)} sx={{ minWidth: 150, flex: 1 }}>
        {fields.map(item => <Option key={item.id} value={item.id}>{item.label}</Option>)}
      </Select>
      <Select size="sm" value={rule.operator} onChange={(_, value) => value && onChange({ ...rule, operator: value })} sx={{ minWidth: 165, flex: 1 }}>
        {operators.map(operator => <Option key={operator.value} value={operator.value}>{operator.label}</Option>)}
        {field.type !== 'boolean' && <Option value="empty">est vide</Option>}
        {field.type !== 'boolean' && <Option value="notEmpty">n’est pas vide</Option>}
      </Select>
      {rule.operator !== 'empty' && rule.operator !== 'notEmpty' && (
        field.type === 'boolean'
          ? <Select size="sm" value={rule.value || 'true'} onChange={(_, value) => value && onChange({ ...rule, value })} sx={{ minWidth: 125 }}>
              <Option value="true">Oui</Option><Option value="false">Non</Option>
            </Select>
          : <Input
              size="sm"
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={rule.value}
              onChange={event => onChange({ ...rule, value: event.target.value })}
              placeholder="Valeur à comparer…"
              sx={{ minWidth: 140, flex: 1 }}
            />
      )}
      <Button size="sm" variant="plain" color="danger" onClick={onRemove} aria-label="Supprimer la condition">
        <CloseOutlined />
      </Button>
    </Stack>
  );
}

function FilterGroupEditor({
  group,
  fields,
  onChange,
  onRemove,
  createRule,
  createGroup,
  root = false,
}: {
  group: FilterGroup;
  fields: FilterField[];
  onChange: (group: FilterGroup) => void;
  onRemove?: () => void;
  createRule: () => FilterRule;
  createGroup: () => FilterGroup;
  root?: boolean;
}) {
  const patchChild = (index: number, next: FilterNode) => onChange({
    ...group,
    children: group.children.map((child, childIndex) => childIndex === index ? next : child),
  });
  const removeChild = (id: string) => onChange(removeFilterNode(group, id));

  return (
    <Box className={root ? 'khi-grid-filter-group root' : 'khi-grid-filter-group nested'}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Typography level="title-sm">{root ? 'Conditions du filtre' : 'Groupe de conditions'}</Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography level="body-xs">Combiner avec</Typography>
          <Select size="sm" value={group.logic} onChange={(_, value) => value && onChange({ ...group, logic: value as 'AND' | 'OR' })}>
            <Option value="AND">ET</Option><Option value="OR">OU</Option>
          </Select>
          {!root && <Button size="sm" variant="plain" color="danger" onClick={onRemove} aria-label="Supprimer le groupe"><CloseOutlined /></Button>}
        </Stack>
      </Stack>
      <Stack spacing={1}>
        {group.children.map((child, index) => (
          <Box key={child.id}>
            {child.kind === 'rule'
              ? <FilterRuleEditor rule={child} fields={fields} onChange={next => patchChild(index, next)} onRemove={() => removeChild(child.id)} />
              : <FilterGroupEditor
                  group={child}
                  fields={fields}
                  onChange={next => patchChild(index, next)}
                  onRemove={() => removeChild(child.id)}
                  createRule={createRule}
                  createGroup={createGroup}
                />}
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button size="sm" variant="outlined" color="neutral" startDecorator={<AddOutlined />} onClick={() => onChange({ ...group, children: [...group.children, createRule()] })}>Condition</Button>
        <Button size="sm" variant="outlined" color="neutral" startDecorator={<AddOutlined />} onClick={() => onChange({ ...group, children: [...group.children, createGroup()] })}>Groupe ET/OU</Button>
      </Stack>
    </Box>
  );
}

/**
 * Reusable business grid. Data and business actions remain owned by the screen;
 * editing, selection, filtering, column preferences and export are centralized.
 */
export function SharedDataGrid<T extends object>({
  rowData,
  columnDefs,
  getRowId,
  preferenceKey,
  height = 520,
  mode = 'read',
  editTrigger = 'doubleClick',
  selection = 'single',
  advancedFilter = true,
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
  const [columnSearch, setColumnSearch] = useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(emptyFilter);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const storageKey = useMemo(() => `khi-grid-column-state:${preferenceKey}`, [preferenceKey]);

  const effectiveColumnDefs = useMemo(() => columnDefs.map((column, index) => ({
    ...column,
    colId: columnId(column, index),
    editable: mode === 'edit' ? (column.editable ?? true) : false,
  })), [columnDefs, mode]);

  const fields = useMemo<FilterField[]>(() => columnDefs
    .map(column => {
      if (!column.field || column.filter === false) return null;
      return {
        id: String(column.field),
        label: String(column.headerName || column.field),
        type: fieldType(column),
      };
    })
    .filter((field): field is FilterField => Boolean(field)), [columnDefs]);

  const createRule = useCallback((): FilterRule => ({
    kind: 'rule',
    id: makeId('rule'),
    field: fields[0]?.id ?? '',
    operator: fields[0]?.type === 'number' || fields[0]?.type === 'date' || fields[0]?.type === 'boolean' ? 'equals' : 'contains',
    value: '',
  }), [fields]);
  const createGroup = useCallback((): FilterGroup => ({
    kind: 'group',
    id: makeId('group'),
    logic: 'AND',
    children: [createRule()],
  }), [createRule]);

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
      // Storage may be disabled; the grid remains fully usable for this session.
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
    apiRef.current?.onFilterChanged();
  }, [filterGroup]);

  useEffect(() => {
    if (selectedRowId && apiRef.current && selection) {
      const node = apiRef.current.getRowNode(selectedRowId);
      if (node) {
        node.setSelected(true);
        apiRef.current.ensureNodeVisible(node, 'middle');
      }
    }
  }, [selectedRowId, rowData, selection]);

  const selectionOptions = useMemo<RowSelectionOptions | undefined>(() => {
    if (!selection) return undefined;
    return {
      mode: selection === 'multiple' ? 'multiRow' : 'singleRow',
      checkboxes: true,
      headerCheckbox: selection === 'multiple',
      enableClickSelection: true,
    };
  }, [selection]);

  const filteredColumns = useMemo(() => effectiveColumnDefs
    .map((column, index) => ({ column, id: columnId(column, index) }))
    .filter(({ column, id }) => String(column.headerName || column.field || id).toLocaleLowerCase('fr').includes(columnSearch.toLocaleLowerCase('fr'))), [effectiveColumnDefs, columnSearch]);

  const resetColumns = () => {
    try { window.localStorage.removeItem(storageKey); } catch { /* no-op */ }
    apiRef.current?.resetColumnState();
    if (apiRef.current) syncVisibleColumns(apiRef.current);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterGroup(emptyFilter());
    apiRef.current?.setFilterModel(null);
    apiRef.current?.setGridOption('quickFilterText', '');
  };

  const exportCsv = () => apiRef.current?.exportDataAsCsv({ fileName: `${preferenceKey}.csv` });
  const activeFilters = activeRuleCount(filterGroup);

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

  return (
    <Box className="khi-shared-grid" sx={{ width: '100%', minWidth: 0 }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ lg: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }} useFlexGap flexWrap="wrap">
          {onAdd && <Button size="sm" startDecorator={<AddOutlined />} disabled={addDisabled} onClick={onAdd}>{addLabel}</Button>}
          {quickFilter && (
            <Input
              size="sm"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Rechercher dans la grille…"
              startDecorator={<SearchOutlined />}
              endDecorator={search ? <Button size="sm" variant="plain" color="neutral" onClick={() => setSearch('')}><CloseOutlined /></Button> : null}
              sx={{ minWidth: 190, maxWidth: 320, flex: 1 }}
            />
          )}
          {toolbarContent}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
          {advancedFilter && (
            <Button size="sm" variant={showAdvancedFilter || activeFilters > 0 ? 'soft' : 'outlined'} color="neutral" startDecorator={<FilterAltOutlined />} onClick={() => setShowAdvancedFilter(value => !value)}>
              Filtre avancé{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>
          )}
          <Box className="khi-grid-columns-control">
            <Button size="sm" variant="outlined" color="neutral" startDecorator={<ViewColumnOutlined />} onClick={() => setShowColumns(value => !value)}>Colonnes <Typography level="body-xs">{visibleColumns.length}/{columnDefs.length}</Typography></Button>
            {showColumns && (
              <Box className="khi-grid-columns-popover">
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box><Typography level="title-sm">Champs affichés</Typography><Typography level="body-xs" color="neutral">Choisissez les colonnes visibles.</Typography></Box>
                  <Button size="sm" variant="plain" color="neutral" onClick={() => setShowColumns(false)} aria-label="Fermer"><CloseOutlined /></Button>
                </Stack>
                <Input size="sm" value={columnSearch} onChange={event => setColumnSearch(event.target.value)} placeholder="Rechercher un champ…" startDecorator={<SearchOutlined />} sx={{ mb: 1 }} />
                <Typography level="body-xs" color="neutral" sx={{ mb: 0.75 }}>{visibleColumns.length} champ(s) affiché(s) sur {columnDefs.length}</Typography>
                <Stack className="khi-grid-columns-list" spacing={0.25}>
                  {filteredColumns.map(({ column, id }) => (
                    <label className="khi-grid-column-option" key={id}>
                      <input type="checkbox" checked={visibleColumns.includes(id)} onChange={event => apiRef.current?.setColumnsVisible([id], event.target.checked)} />
                      <span>{column.headerName || column.field || id}</span>
                    </label>
                  ))}
                </Stack>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                  <Button size="sm" variant="plain" onClick={() => apiRef.current?.setColumnsVisible(effectiveColumnDefs.map((column, index) => columnId(column, index)), true)}>Tout afficher</Button>
                  <Button size="sm" variant="plain" onClick={resetColumns}>Réinitialiser</Button>
                </Stack>
              </Box>
            )}
          </Box>
          <Button size="sm" variant="outlined" color="neutral" startDecorator={<CloseOutlined />} onClick={clearFilters}>Effacer les filtres</Button>
          <Button size="sm" variant="outlined" color="neutral" onClick={exportCsv}>Exporter CSV</Button>
        </Stack>
      </Stack>

      {advancedFilter && showAdvancedFilter && (
        <Box className="khi-grid-advanced-filter">
          {fields.length
            ? <FilterGroupEditor
                group={filterGroup}
                fields={fields}
                onChange={setFilterGroup}
                createRule={createRule}
                createGroup={createGroup}
                root
              />
            : <Typography level="body-sm" color="neutral">Aucune colonne filtrable n’est configurée.</Typography>}
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button size="sm" variant="plain" color="neutral" onClick={() => setFilterGroup(emptyFilter())}>Réinitialiser le filtre avancé</Button>
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
          columnDefs={effectiveColumnDefs}
          getRowId={params => getRowId(params.data)}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            minWidth: 110,
            flex: 1,
            wrapText: true,
            autoHeight: true,
            editable: false,
          }}
          rowSelection={selectionOptions}
          editType={mode === 'edit' ? 'fullRow' : undefined}
          suppressClickEdit={mode === 'edit' && editTrigger === 'doubleClick'}
          animateRows={false}
          pagination
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={[paginationPageSize, paginationPageSize * 2, paginationPageSize * 3]}
          isExternalFilterPresent={() => activeFilters > 0}
          doesExternalFilterPass={(node: IRowNode<T>) => Boolean(node.data && matchesFilter(node.data, filterGroup, fields))}
          onGridReady={(event: GridReadyEvent<T>) => {
            apiRef.current = event.api;
            restoreColumnState(event.api);
            if (selectedRowId && selection) {
              const node = event.api.getRowNode(selectedRowId);
              if (node) { node.setSelected(true); event.api.ensureNodeVisible(node, 'middle'); }
            }
          }}
          onColumnMoved={event => persistColumnState(event.api)}
          onColumnResized={event => { if (event.finished) persistColumnState(event.api); }}
          onColumnVisible={event => { persistColumnState(event.api); syncVisibleColumns(event.api); }}
          onColumnPinned={event => persistColumnState(event.api)}
          onCellValueChanged={event => onCellValueChanged?.(event)}
          onSelectionChanged={event => onRowSelected?.(event.api.getSelectedRows()[0] ?? null)}
          onRowDoubleClicked={event => {
            if (mode !== 'edit' || editTrigger !== 'doubleClick' || !event.data || event.rowIndex === null) return;
            if (selection) {
              event.api.deselectAll();
              event.node.setSelected(true);
            }
            const clickedColumnId = event.column?.getColId();
            const editableColumn = clickedColumnId && event.column?.isCellEditable(event.node)
              ? clickedColumnId
              : event.api.getAllDisplayedColumns().find(column => column.isCellEditable(event.node))?.getColId();
            if (editableColumn) event.api.startEditingCell({ rowIndex: event.rowIndex, colKey: editableColumn });
          }}
          localeText={translatedLocale}
        />
      </Box>
    </Box>
  );
}

export type { ColDef };
