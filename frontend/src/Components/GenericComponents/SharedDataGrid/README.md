# Shared AG Grid

The shared component is the single place to maintain common grid behavior in the frontend. Screens provide their data, columns and business callbacks; they do not reimplement selection, editing defaults, quick search or the advanced filter builder.

## Modes

### Read-only list

```tsx
<SharedDataGrid
  rowData={rows}
  columnDefs={columns}
  getRowId={(row) => row.id}
/>
```

### Read-only with row selection

```tsx
<SharedDataGrid
  rowData={rows}
  columnDefs={columns}
  getRowId={(row) => row.id}
  selection={{ mode: 'multiRow' }}
  onSelectionChanged={handleSelection}
/>
```

### Editable list

```tsx
<SharedDataGrid
  rowData={rows}
  columnDefs={columns}
  getRowId={(row) => row.id}
  editing
  onCellValueChanged={handleChange}
/>
```

When editing is enabled and no selection config is supplied, the component enables native multi-row checkbox selection. Column-level `editable` rules and custom editors remain defined by the screen.

### Advanced filter

```tsx
<SharedDataGrid
  rowData={rows}
  columnDefs={columns}
  advancedFilter={{
    fields: [
      { field: 'name', label: 'Nom', type: 'text' },
      { field: 'amount', label: 'Montant', type: 'number' },
      { field: 'status', label: 'Statut', type: 'select', options: ['Open', 'Closed'] },
    ],
  }}
  quickSearch
/>
```

The filter builder supports nested ET/OU groups and text, numeric, date and choice fields. It is implemented without AG Grid Enterprise features.

### Combined mode

Combine `selection`, `editing`, `advancedFilter` and `quickSearch` as required. Selection is independent from editability: a read-only list may also expose checkboxes.

## Shared defaults

- AG Grid Community with the Quartz theme.
- Sorting and resizing enabled by default; basic column filters are opt-in.
- Row click does not select a row unless `enableClickSelection` is explicitly enabled.
- Native checkbox selection when configured.
- Read-only is the default; editing must be explicitly enabled.
- Full-row edit mode keeps Tab/Shift+Tab inside the row and wraps at the first/last displayed column.
- Escape cancels the current edit and clears row selection; saving/committing an edit does not clear selection.
- Advanced filter and quick search are optional.
- Stable row IDs are recommended for all mutable datasets.

## Ownership boundary

Keep API calls, domain validation, row mapping, custom renderers and business actions in the feature screen. Put behavior that should stay identical across screens in this component. Do not migrate navigation trees or hierarchical explorers into a data grid solely to reuse this component; use it for tabular data lists.
