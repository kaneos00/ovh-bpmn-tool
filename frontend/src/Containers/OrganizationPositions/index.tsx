import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Alert, Box, Button, Checkbox, Chip, FormControl, FormLabel, Input, Modal,
  ModalDialog, ModalClose, Option, Select, Stack, Typography,
} from '@mui/joy';
import { apiClient } from '../../queryClient';
import { OrganizationAdminLayout } from '../OrganizationAdmin/OrganizationAdminLayout';

ModuleRegistry.registerModules([AllCommunityModule]);

type Assignment = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  isActing?: boolean;
};
type Position = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  active: boolean;
  assignment: Assignment | null;
};
type Account = { id: string; username: string; email: string | null; active: boolean };

export const Component = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Position[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [isActing, setIsActing] = useState(false);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState('');

  const positionsQuery = useQuery<Position[]>(
    ['organization-position-management'],
    () => apiClient.get('/organization/positions/management'),
  );
  const usersQuery = useQuery<Account[]>(
    ['organization-active-users'],
    () => apiClient.get('/auth/users'),
  );
  const positions = positionsQuery.data ?? [];
  const users = (usersQuery.data ?? []).filter(user => user.active);
  const selectedWithAssignments = selected.filter(position => position.assignment);
  const selectedVacant = selected.filter(position => !position.assignment && position.active);
  const selectedActive = selected.filter(position => position.active);
  const refresh = async () => {
    await queryClient.invalidateQueries(['organization-position-management']);
    await queryClient.invalidateQueries(['organization-structure']);
  };

  const updatePosition = useMutation(
    (change: { id: string; field: 'code' | 'title' | 'description' | 'active'; value: string | boolean }) =>
      apiClient.patch(`/organization/positions/${change.id}`, { [change.field]: change.value }),
    {
      onSuccess: refresh,
      onError: (reason: Error) => { setError(reason.message); refresh(); },
    },
  );
  const createPosition = useMutation(
    () => apiClient.post('/organization/positions', {
      code: newCode.trim(), title: newTitle.trim(), description: newDescription.trim() || null,
    }),
    {
      onSuccess: async () => {
        setCreateOpen(false); setNewCode(''); setNewTitle(''); setNewDescription('');
        setError(''); await refresh();
      },
      onError: (reason: Error) => setError(reason.message),
    },
  );
  const bulkAssign = useMutation(
    () => apiClient.post('/organization/positions/bulk-assignments', {
      positionIds: selectedVacant.map(position => position.id), userId: assignee, startDate: assignmentDate, isActing,
    }),
    {
      onSuccess: async () => { setSelected([]); setAssignee(null); setIsActing(false); setError(''); await refresh(); },
      onError: (reason: Error) => setError(reason.message),
    },
  );
  const bulkEnd = useMutation(
    () => apiClient.post('/organization/assignments/bulk-end', {
      assignmentIds: selected.map(position => position.assignment?.id).filter(Boolean), endDate,
    }),
    {
      onSuccess: async () => { setSelected([]); setError(''); await refresh(); },
      onError: (reason: Error) => setError(reason.message),
    },
  );
  const bulkDeactivate = useMutation(
    () => apiClient.post('/organization/positions/bulk-deactivate', {
      positionIds: selected.map(position => position.id),
    }),
    {
      onSuccess: async () => { setSelected([]); setError(''); await refresh(); },
      onError: (reason: Error) => setError(reason.message),
    },
  );

  const columnDefs = useMemo<ColDef<Position>[]>(() => [
    { field: 'code', headerName: 'Code', minWidth: 130, editable: true },
    { field: 'title', headerName: 'Intitulé du poste', minWidth: 220, flex: 1, editable: true },
    { field: 'description', headerName: 'Description', minWidth: 220, flex: 1, editable: true },
    {
      headerName: 'Titulaire',
      minWidth: 170,
      valueGetter: params => params.data?.assignment ? `${params.data.assignment.userId}${params.data.assignment.isActing ? ' · Intérim' : ''}` : 'Poste vacant',
      cellClass: params => params.data?.assignment ? 'org-position-holder' : 'org-position-vacant',
    },
    {
      field: 'active', headerName: 'Statut', minWidth: 120, editable: true,
      cellEditor: 'agSelectCellEditor', cellEditorParams: { values: [true, false] },
      valueFormatter: params => params.value ? 'Actif' : 'Inactif',
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    suppressHeaderMenuButton: false,
  }), []);

  const onCellValueChanged = (event: any) => {
    if (!event.data || event.oldValue === event.newValue) return;
    const field = event.colDef.field;
    if (field === 'code' || field === 'title' || field === 'description' || field === 'active') {
      updatePosition.mutate({ id: event.data.id, field, value: event.newValue });
    }
  };

  const busy = bulkAssign.isLoading || bulkEnd.isLoading || bulkDeactivate.isLoading;

  return (
    <OrganizationAdminLayout
      activeSection="positions"
      title="Gestion des postes"
      breadcrumbs={[
        { id: 'home', label: 'Accueil', to: '/projects' },
        { id: 'administration', label: 'Administration', to: '/organization/overview' },
        { id: 'positions', label: 'Postes', to: '/organization/positions' },
      ]}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={1}>
          <Box>
            <Typography level="h1">Postes permanents</Typography>
            <Typography level="body-sm" color="neutral">Modifiez directement les cellules. Sélectionnez plusieurs postes pour les opérations groupées.</Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            <Chip variant="soft">{positions.length} poste(s)</Chip>
            <Button onClick={() => setCreateOpen(true)}>＋ Nouveau poste</Button>
          </Stack>
        </Stack>

        {error && <Alert color="danger" endDecorator={<Button size="sm" variant="plain" onClick={() => setError('')}>Fermer</Button>}>{error}</Alert>}

        <Stack direction={{ xs: 'column', lg: 'row' }} gap={1} alignItems={{ lg: 'end' }} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'md' }}>
          <FormControl sx={{ minWidth: 210 }}>
            <FormLabel>Affecter les postes vacants sélectionnés à</FormLabel>
            <Select value={assignee} onChange={(_event, value) => setAssignee(value)} placeholder="Choisir un titulaire">
              {users.map(user => <Option key={user.id} value={user.username}>{user.username}{user.email ? ` · ${user.email}` : ''}</Option>)}
            </Select>
          </FormControl>
          <FormControl sx={{ width: 155 }}>
            <FormLabel>Date de début</FormLabel>
            <Input type="date" value={assignmentDate} onChange={event => setAssignmentDate(event.target.value)} />
          </FormControl>
          <Stack spacing={0.25} sx={{ minWidth: 155 }}>
            <Checkbox checked={isActing} onChange={event => setIsActing(event.target.checked)} label="Affectation en intérim" />
            <Typography level="body-xs" color="neutral">Sans date de fin par défaut</Typography>
          </Stack>
          <Button disabled={!assignee || selectedVacant.length === 0 || busy} loading={bulkAssign.isLoading}
            onClick={() => bulkAssign.mutate()}>
            Affecter ({selectedVacant.length})
          </Button>
          <Box sx={{ flex: 1 }} />
          <FormControl sx={{ width: 155 }}>
            <FormLabel>Fin d’affectation</FormLabel>
            <Input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
          </FormControl>
          <Button color="warning" variant="soft" disabled={selectedWithAssignments.length === 0 || busy}
            loading={bulkEnd.isLoading}
            onClick={() => bulkEnd.mutate()}>
            Retirer titulaire ({selectedWithAssignments.length})
          </Button>
          <Button color="danger" variant="outlined" disabled={selectedActive.length === 0 || selected.some(position => !!position.assignment) || busy}
            loading={bulkDeactivate.isLoading}
            onClick={() => bulkDeactivate.mutate()}>
            Désactiver ({selectedActive.length})
          </Button>
        </Stack>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Input size="sm" value={quickSearch} onChange={event => setQuickSearch(event.target.value)} placeholder="Rechercher dans les postes…" sx={{ maxWidth: 340 }} />
          <Typography level="body-xs" color="neutral">{selected.length} sélectionné(s)</Typography>
          <Button size="sm" variant="plain" color="neutral" onClick={() => setSelected([])}>Effacer la sélection</Button>
        </Box>

        <Box className="ag-theme-quartz" sx={{ width: '100%', height: 'min(68vh, 720px)', minHeight: 430 }}>
          {positionsQuery.isLoading ? <Typography>Chargement des postes…</Typography> : (
            <AgGridReact<Position>
              theme={themeQuartz}
              rowData={positions}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowId={params => params.data.id}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
              quickFilterText={quickSearch}
              animateRows
              onSelectionChanged={event => setSelected(event.api.getSelectedRows())}
              onCellValueChanged={onCellValueChanged}
              pagination
              paginationPageSize={25}
              paginationPageSizeSelector={[25, 50, 100]}
              overlayNoRowsTemplate="Aucun poste à afficher"
            />
          )}
        </Box>
      </Stack>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalDialog sx={{ width: 'min(480px, calc(100vw - 32px))' }}>
          <ModalClose />
          <Typography level="h3">Nouveau poste</Typography>
          <FormControl required><FormLabel>Code</FormLabel><Input value={newCode} onChange={event => setNewCode(event.target.value)} /></FormControl>
          <FormControl required><FormLabel>Intitulé</FormLabel><Input value={newTitle} onChange={event => setNewTitle(event.target.value)} /></FormControl>
          <FormControl><FormLabel>Description</FormLabel><Input value={newDescription} onChange={event => setNewDescription(event.target.value)} /></FormControl>
          <Button disabled={!newCode.trim() || !newTitle.trim() || createPosition.isLoading} loading={createPosition.isLoading} onClick={() => createPosition.mutate()}>Créer le poste</Button>
        </ModalDialog>
      </Modal>
    </OrganizationAdminLayout>
  );
};
