import React, { useMemo, useState } from 'react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
  type RowClickedEvent,
  type SelectionChangedEvent,
  type CellValueChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import './SharedDataGrid.scss';

ModuleRegistry.registerModules([AllCommunityModule]);

export type GridFilterField<TData> = {
  field: keyof TData & string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: Array<string | { label: string; value: string }>;
};

export type GridFilterRule = {
  kind: 'rule';
  id: string;
  field: string;
  operator: string;
  value: string;
};

export type GridFilterGroup = {
  kind: 'group';
  id: string;
  logic: 'AND' | 'OR';
  children: GridFilterNode[];
};

export type GridFilterNode = GridFilterRule | GridFilterGroup;

type SelectionConfig = {
  mode: 'singleRow' | 'multiRow';
  checkboxes?: boolean;
  headerCheckbox?: boolean;
  enableClickSelection?: boolean;
};

type AdvancedFilterConfig<TData> = {
  fields: GridFilterField<TData>[];
  label?: string;
};

export type SharedDataGridProps<TData extends object> = {
  rowData: TData[];
  columnDefs: ColDef<TData>[];
  getRowId?: (data: TData) => string;
  selection?: SelectionConfig;
  editing?: boolean;
  editType?: 'fullRow' | 'cell';
  advancedFilter?: AdvancedFilterConfig<TData>;
  columnFilters?: boolean;
  quickFilterText?: string;
  quickSearch?: boolean;
  quickSearchPlaceholder?: string;
  defaultColDef?: ColDef<TData>;
  height?: number | string;
  pagination?: boolean;
  paginationPageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onGridReady?: (event: GridReadyEvent<TData>) => void;
  onSelectionChanged?: (event: SelectionChangedEvent<TData>) => void;
  onRowClicked?: (event: RowClickedEvent<TData>) => void;
  onCellValueChanged?: (event: CellValueChangedEvent<TData>) => void;
};

let filterSequence = 0;
const nextFilterId = () => `grid-filter-${++filterSequence}`;

const createRule = <TData,>(fields: GridFilterField<TData>[]): GridFilterRule => ({
  kind: 'rule',
  id: nextFilterId(),
  field: String(fields[0]?.field ?? ''),
  operator: fields[0]?.type === 'number' ? 'gte' : fields[0]?.type === 'date' ? 'after' : 'contains',
  value: '',
});

const createGroup = <TData,>(fields: GridFilterField<TData>[]): GridFilterGroup => ({
  kind: 'group',
  id: nextFilterId(),
  logic: 'AND',
  children: fields.length ? [createRule(fields)] : [],
});

const operatorsFor = (type: 'text' | 'number' | 'date' | 'select' = 'text') => {
  if (type === 'number') return [['equals', 'est égal à'], ['gt', 'supérieur à'], ['gte', 'supérieur ou égal à'], ['lt', 'inférieur à'], ['lte', 'inférieur ou égal à']] as const;
  if (type === 'date') return [['equals', 'est le'], ['before', 'est avant le'], ['after', 'est après le']] as const;
  if (type === 'select') return [['equals', 'est égal à'], ['notEquals', 'est différent de']] as const;
  return [['contains', 'contient'], ['equals', 'est égal à'], ['notEquals', 'est différent de'], ['starts', 'commence par']] as const;
};

const fieldType = <TData,>(fields: GridFilterField<TData>[], name: string) =>
  fields.find((field) => field.field === name)?.type ?? 'text';

const matchesRule = <TData extends object>(
  row: TData,
  rule: GridFilterRule,
  fields: GridFilterField<TData>[],
) => {
  if (!rule.value.trim()) return true;
  const field = fields.find((item) => item.field === rule.field);
  const raw = (row as Record<string, unknown>)[rule.field];
  if (field?.type === 'number') {
    const actual = Number(raw);
    const expected = Number(rule.value);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    switch (rule.operator) {
      case 'equals': return actual === expected;
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      default: return true;
    }
  }
  if (field?.type === 'date') {
    const actual = new Date(String(raw ?? '')).getTime();
    const expected = new Date(rule.value).getTime();
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    if (rule.operator === 'equals') return actual === expected;
    if (rule.operator === 'before') return actual < expected;
    if (rule.operator === 'after') return actual > expected;
    return true;
  }
  const actual = String(raw ?? '').toLocaleLowerCase();
  const expected = rule.value.toLocaleLowerCase();
  switch (rule.operator) {
    case 'equals': return actual === expected;
    case 'notEquals': return actual !== expected;
    case 'starts': return actual.startsWith(expected);
    default: return actual.includes(expected);
  }
};

const matchesFilter = <TData extends object>(
  row: TData,
  node: GridFilterNode,
  fields: GridFilterField<TData>[],
): boolean => {
  if (node.kind === 'rule') return matchesRule(row, node, fields);
  if (!node.children.length) return true;
  return node.logic === 'AND'
    ? node.children.every((child) => matchesFilter(row, child, fields))
    : node.children.some((child) => matchesFilter(row, child, fields));
};

const patchNode = (
  node: GridFilterGroup,
  id: string,
  update: (current: GridFilterNode) => GridFilterNode,
): GridFilterGroup => ({
  ...node,
  children: node.children.map((child) => {
    if (child.id === id) return update(child);
    return child.kind === 'group' ? patchNode(child, id, update) : child;
  }),
});

const removeNode = (node: GridFilterGroup, id: string): GridFilterGroup => ({
  ...node,
  children: node.children
    .filter((child) => child.id !== id)
    .map((child) => child.kind === 'group' ? removeNode(child, id) : child),
});

type FilterEditorProps<TData> = {
  node: GridFilterGroup;
  fields: GridFilterField<TData>[];
  onChange: (node: GridFilterGroup) => void;
  onRemove?: () => void;
  root?: boolean;
};

const FilterGroupEditor = <TData,>({
  node, fields, onChange, onRemove, root = false,
}: FilterEditorProps<TData>) => {
  const updateChild = (id: string, value: GridFilterNode) => onChange(patchNode(node, id, () => value));
  const addRule = () => onChange({ ...node, children: [...node.children, createRule(fields)] });
  const addGroup = () => onChange({ ...node, children: [...node.children, createGroup(fields)] });

  return (
    <div className={root ? 'shared-grid-filter-group is-root' : 'shared-grid-filter-group'}>
      <div className="shared-grid-filter-group-head">
        <strong>{root ? 'Conditions du filtre' : 'Groupe de conditions'}</strong>
        <label>Combiner avec
          <select value={node.logic} onChange={(event) => onChange({ ...node, logic: event.target.value as 'AND' | 'OR' })}>
            <option value="AND">ET</option>
            <option value="OR">OU</option>
          </select>
        </label>
        {!root && <button type="button" className="shared-grid-filter-remove" onClick={onRemove} aria-label="Supprimer le groupe">×</button>}
      </div>
      {node.children.map((child) => (
        <div className="shared-grid-filter-child" key={child.id}>
          {child.kind === 'group' ? (
            <FilterGroupEditor
              node={child}
              fields={fields}
              onChange={(value) => updateChild(child.id, value)}
              onRemove={() => onChange(removeNode(node, child.id))}
            />
          ) : (
            <div className="shared-grid-filter-rule">
              <select
                aria-label="Champ"
                value={child.field}
                onChange={(event) => {
                  const nextField = fields.find((field) => field.field === event.target.value);
                  const nextType = nextField?.type ?? 'text';
                  onChange(patchNode(node, child.id, () => ({
                    ...child,
                    field: event.target.value,
                    operator: nextType === 'number' ? 'gte' : nextType === 'date' ? 'after' : nextType === 'select' ? 'equals' : 'contains',
                    value: '',
                  })));
                }}
              >
                {fields.map((field) => <option key={String(field.field)} value={String(field.field)}>{field.label}</option>)}
              </select>
              <select
                aria-label="Opérateur"
                value={child.operator}
                onChange={(event) => onChange(patchNode(node, child.id, () => ({ ...child, operator: event.target.value })))}
              >
                {operatorsFor(fieldType(fields, child.field)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {fieldType(fields, child.field) === 'select' ? (
                <select
                  aria-label="Valeur"
                  value={child.value}
                  onChange={(event) => onChange(patchNode(node, child.id, () => ({ ...child, value: event.target.value })))}
                >
                  <option value="">Toutes les valeurs</option>
                  {(fields.find((field) => field.field === child.field)?.options ?? []).map((option) => {
                    const value = typeof option === 'string' ? option : option.value;
                    const label = typeof option === 'string' ? option : option.label;
                    return <option key={value} value={value}>{label}</option>;
                  })}
                </select>
              ) : (
                <input
                  aria-label="Valeur"
                  type={fieldType(fields, child.field) === 'number' ? 'number' : fieldType(fields, child.field) === 'date' ? 'date' : 'text'}
                  value={child.value}
                  onChange={(event) => onChange(patchNode(node, child.id, () => ({ ...child, value: event.target.value })))}
                />
              )}
              <button type="button" className="shared-grid-filter-remove" onClick={() => onChange(removeNode(node, child.id))} aria-label="Supprimer la condition">×</button>
            </div>
          )}
        </div>
      ))}
      <div className="shared-grid-filter-actions">
        <button type="button" onClick={addRule}>+ Condition</button>
        <button type="button" onClick={addGroup}>+ Groupe ET/OU</button>
      </div>
    </div>
  );
};

export const SharedDataGrid = <TData extends object>({
  rowData,
  columnDefs,
  getRowId,
  selection,
  editing = false,
  editType = 'fullRow',
  advancedFilter,
  columnFilters = true,
  quickFilterText,
  quickSearch = false,
  quickSearchPlaceholder = 'Rechercher dans les données…',
  defaultColDef,
  height = 360,
  pagination = false,
  paginationPageSize = 25,
  loading = false,
  emptyMessage = 'Aucune donnée à afficher.',
  className = '',
  onGridReady,
  onSelectionChanged,
  onRowClicked,
  onCellValueChanged,
}: SharedDataGridProps<TData>) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [internalQuickSearch, setInternalQuickSearch] = useState('');
  const activeQuickFilter = quickFilterText ?? internalQuickSearch;
  const [draftFilter, setDraftFilter] = useState<GridFilterGroup>(() => createGroup(advancedFilter?.fields ?? []));
  const [appliedFilter, setAppliedFilter] = useState<GridFilterGroup | null>(null);

  const visibleRows = useMemo(() => {
    let result = rowData;
    if (activeQuickFilter?.trim()) {
      const query = activeQuickFilter.trim().toLocaleLowerCase();
      result = result.filter((row) => Object.values(row).some((value) =>
        String(value ?? '').toLocaleLowerCase().includes(query)));
    }
    if (advancedFilter && appliedFilter) {
      result = result.filter((row) => matchesFilter(row, appliedFilter, advancedFilter.fields));
    }
    return result;
  }, [rowData, activeQuickFilter, advancedFilter?.fields, appliedFilter]);

  const safeColumnDefs = useMemo(
    () => editing ? columnDefs : columnDefs.map((column) => ({ ...column, editable: false })),
    [columnDefs, editing],
  );
  const mergedDefaultColDef = useMemo<ColDef<TData>>(() => ({
    sortable: true,
    resizable: true,
    filter: columnFilters,
    minWidth: 100,
    ...defaultColDef,
    editable: editing ? (defaultColDef?.editable ?? true) : false,
  }), [defaultColDef, editing, columnFilters]);
  const effectiveSelection = useMemo(() => selection ?? (editing ? { mode: 'multiRow' as const } : undefined), [selection, editing]);
  const rowSelection = useMemo(() => effectiveSelection ? ({
    mode: effectiveSelection.mode,
    checkboxes: effectiveSelection.checkboxes ?? true,
    headerCheckbox: effectiveSelection.mode === 'multiRow' && (effectiveSelection.headerCheckbox ?? true),
    enableClickSelection: effectiveSelection.enableClickSelection ?? false,
  }) : undefined, [effectiveSelection]);

  return (
    <section className={`shared-data-grid ${className}`}>
      {(advancedFilter || quickSearch) && (
        <div className="shared-data-grid-toolbar">
          {quickSearch && <input className="shared-data-grid-search" type="search" placeholder={quickSearchPlaceholder} value={internalQuickSearch} onChange={(event) => setInternalQuickSearch(event.target.value)} />}
          <button type="button" className={filterOpen ? 'is-active' : ''} onClick={() => setFilterOpen((value) => !value)}>
            {advancedFilter.label ?? 'Filtrage avancé'}
            {appliedFilter && <span className="shared-data-grid-filter-dot" aria-label="Filtre appliqué" />}
          </button>
          {appliedFilter && <button type="button" onClick={() => { setAppliedFilter(null); setDraftFilter(createGroup(advancedFilter.fields)); }}>Effacer le filtre</button>}
        </div>
      )}
      {advancedFilter && filterOpen && (
        <div className="shared-data-grid-filter-panel">
          <FilterGroupEditor node={draftFilter} fields={advancedFilter.fields} onChange={setDraftFilter} root />
          <div className="shared-data-grid-filter-footer">
            <button type="button" onClick={() => setDraftFilter(createGroup(advancedFilter.fields))}>Réinitialiser</button>
            <button type="button" className="is-primary" onClick={() => { setAppliedFilter(draftFilter); setFilterOpen(false); }}>Appliquer</button>
          </div>
        </div>
      )}
      <div className="shared-data-grid-body" style={{ height }}>
        <AgGridReact<TData>
          theme={themeQuartz}
          rowData={visibleRows}
          columnDefs={safeColumnDefs}
          defaultColDef={mergedDefaultColDef}
          getRowId={getRowId ? (params) => getRowId(params.data) : undefined}
          rowSelection={rowSelection}
          editType={editing ? editType : undefined}
          quickFilterText={undefined}
          loading={loading}
          overlayNoRowsTemplate={emptyMessage}
          pagination={pagination}
          paginationPageSize={paginationPageSize}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={onRowClicked}
          onCellValueChanged={onCellValueChanged}
        />
      </div>
    </section>
  );
};

export default SharedDataGrid;
