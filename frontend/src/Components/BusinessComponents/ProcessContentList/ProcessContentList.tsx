import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Checkbox, Chip, IconButton, Stack, Textarea, Typography } from '@mui/joy';
import { AccountTreeOutlined, Delete, FileCopy, Publish, EditOutlined, Check, Close } from '@mui/icons-material';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import { useProcessContentList } from './hooks/useProcessContentList';
import { ContentStatusEnum, type Content } from '../../../Types';
import { formatDateTime } from '../../../shared/helpers/date';
import { ActionsMenu } from './components/ActionsMenu';
import { SharedDataGrid } from '../../GenericComponents/SharedDataGrid';

type ProcessContentListProps = {
  resourceId: string;
  contents: Content[];
  onContentPublish: (contentId: string) => void;
  onContentErase: (contentId: string) => void;
  onContentClone: (contentId: string) => void;
  onContentChecked: (contentIds: string[]) => void;
  canManageVersions?: boolean;
  editingChangeCommentId?: string | null;
  changeCommentDrafts?: Record<string, string>;
  savingChangeCommentId?: string | null;
  onEditChangeComment?: (contentId: string) => void;
  onChangeCommentDraft?: (contentId: string, value: string) => void;
  onSaveChangeComment?: (contentId: string) => void;
  onCancelChangeComment?: (contentId: string) => void;
};

export const ProcessContentList = ({
  resourceId,
  contents,
  onContentPublish,
  onContentErase,
  onContentClone,
  onContentChecked,
  canManageVersions = false,
  editingChangeCommentId = null,
  changeCommentDrafts = {},
  savingChangeCommentId = null,
  onEditChangeComment,
  onChangeCommentDraft,
  onSaveChangeComment,
  onCancelChangeComment,
}: ProcessContentListProps) => {
  const navigate = useNavigate();
  const { hasDraft, checkedContents, onContentCheck } = useProcessContentList(contents);

  const getContentActions = (content: Content) => {
    if (!canManageVersions) return [];

    const editCommentAction = {
      id: `edit_comment_${content.id}`,
      label: 'Modifier le commentaire',
      icon: <EditOutlined fontSize="small" />,
      onClick: () => onEditChangeComment?.(content.id),
    };
    const openInModelerAction = {
      id: `open_modeler_${content.id}`,
      label: 'Ouvrir dans le modeleur',
      icon: <AccountTreeOutlined fontSize="small" />,
      onClick: () => navigate(`/${resourceId}/modeler?contentId=${encodeURIComponent(content.id)}`),
    };

    if (content.status === ContentStatusEnum.Draft) {
      return [
        openInModelerAction,
        editCommentAction,
        {
          id: `publish_${content.id}`,
          label: 'Publish',
          icon: <Publish fontSize="small" />,
          onClick: () => onContentPublish(content.id),
        },
        {
          id: `erase_${content.id}`,
          label: 'Erase',
          icon: <Delete fontSize="small" />,
          onClick: () => onContentErase(content.id),
        },
      ];
    }

    return [
      openInModelerAction,
      editCommentAction,
      ...(content.status === ContentStatusEnum.Obsolete
        ? [{
            id: `erase_${content.id}`,
            label: 'Supprimer',
            icon: <Delete fontSize="small" />,
            onClick: () => onContentErase(content.id),
          }]
        : []),
      {
        id: `clone_${content.id}`,
        label: 'Clone',
        icon: <FileCopy fontSize="small" />,
        onClick: () => onContentClone(content.id),
        disabled: hasDraft,
      },
    ];
  };

  const columns: ColDef<Content>[] = [
    {
      colId: 'versionSelect',
      headerName: '',
      width: 52,
      minWidth: 52,
      maxWidth: 52,
      pinned: 'left',
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<Content>) => params.data ? (
        <Checkbox
          value={params.data.id}
          checked={checkedContents.includes(params.data.id)}
          onChange={event => onContentChecked(onContentCheck(event))}
          slotProps={{ input: { 'aria-label': `Sélectionner la version ${params.data.version ?? 'N/A'}` } }}
        />
      ) : null,
    },
    {
      headerName: 'Version',
      field: 'version',
      minWidth: 90,
      maxWidth: 120,
      valueFormatter: params => params.value ?? 'N/A',
    },
    {
      headerName: 'Statut',
      field: 'status',
      minWidth: 125,
      cellRenderer: (params: ICellRendererParams<Content>) => {
        if (!params.value) return null;
        const isPublished = params.value === ContentStatusEnum.Published;
        const isDraft = params.value === ContentStatusEnum.Draft;
        let color: 'success' | 'warning' | 'neutral' = 'neutral';
        let label = 'Obsolète';
        if (isPublished) {
          color = 'success';
          label = 'Publiée';
        } else if (isDraft) {
          color = 'warning';
          label = 'Brouillon';
        }
        return <Chip size="sm" variant="soft" color={color}>{label}</Chip>;
      },
    },
    { headerName: 'Auteur', field: 'createdBy', minWidth: 150 },
    {
      headerName: 'Créée le',
      field: 'createdAt',
      cellDataType: 'dateString',
      minWidth: 155,
      valueFormatter: params => params.value ? formatDateTime(params.value) : '—',
    },
    {
      headerName: 'Modifiée le',
      field: 'updatedAt',
      cellDataType: 'dateString',
      minWidth: 155,
      valueFormatter: params => params.value ? formatDateTime(params.value) : '—',
    },
    {
      headerName: 'Commentaire des modifications',
      field: 'changeComment',
      minWidth: 230,
      flex: 2,
      cellRenderer: (params: ICellRendererParams<Content>) => {
        const content = params.data;
        if (!content) return null;
        const editing = editingChangeCommentId === content.id;
        return editing ? (
          <Stack spacing={0.5} sx={{ minWidth: 220, py: 0.5 }}>
            <Textarea
              size="sm"
              minRows={1}
              maxRows={4}
              value={changeCommentDrafts[content.id] ?? content.changeComment ?? ''}
              placeholder="Commentaire de modification"
              onChange={event => onChangeCommentDraft?.(content.id, event.target.value)}
            />
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
              <IconButton size="sm" title="Enregistrer le commentaire" aria-label="Enregistrer le commentaire" disabled={savingChangeCommentId !== null} onClick={() => onSaveChangeComment?.(content.id)}><Check /></IconButton>
              <IconButton size="sm" title="Annuler" aria-label="Annuler" variant="plain" onClick={() => onCancelChangeComment?.(content.id)}><Close /></IconButton>
            </Stack>
          </Stack>
        ) : (
          <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 160, py: 0.5 }}>
            {content.changeComment?.trim() || '—'}
          </Typography>
        );
      },
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      width: 100,
      minWidth: 100,
      maxWidth: 130,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Content>) => params.data ? (
        <Stack direction="row" justifyContent="flex-end">
          <ActionsMenu size="sm" actions={getContentActions(params.data)} />
        </Stack>
      ) : null,
    },
  ];

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      <SharedDataGrid<Content>
        rowData={contents}
        columnDefs={columns}
        getRowId={row => row.id}
        preferenceKey={`process-versions-${resourceId}`}
        mode="read"
        selection={false}
        advancedFilter
        quickFilter
        height={Math.min(640, Math.max(240, contents.length * 62 + 120))}
        paginationPageSize={15}
        selectionToolbar={checkedContents.length > 0 ? (
          <Chip size="sm" variant="soft" color="primary">
            {checkedContents.length} version(s) sélectionnée(s) pour comparaison
          </Chip>
        ) : null}
      />
    </Box>
  );
};
