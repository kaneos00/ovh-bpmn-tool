import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkbox, IconButton, Stack, Table, Textarea, Typography } from '@mui/joy';
import { flexRender } from '@tanstack/react-table';
import { AccountTreeOutlined, Delete, FileCopy, Publish, EditOutlined, Check, Close } from '@mui/icons-material';

import { useProcessContentList } from './hooks/useProcessContentList';

import { ContentStatusEnum, type Content } from '../../../Types';
import type { Cell } from '@tanstack/react-table';
import { ActionsMenu } from './components/ActionsMenu';

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
  const {
    table,
    hasDraft,
    // hasDraftLintError,
    checkedContents,
    onContentCheck,
  } = useProcessContentList(contents);

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

    if (content.status === ContentStatusEnum.Submitted) {
      // A submitted version is frozen while its proposal is under review.
      return [];
    }

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
        ? [
            {
              id: `erase_${content.id}`,
              label: 'Erase',
              icon: <Delete fontSize="small" />,
              onClick: () => onContentErase(content.id),
            },
          ]
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

  const getCellContent = (cell: Cell<Content, unknown>) => {
    switch (cell.column.id) {
      case 'versionSelect':
        return (
          <Checkbox
            value={cell.row.original.id}
            checked={checkedContents.includes(cell.row.original.id)}
            onChange={event => {
              onContentChecked(onContentCheck(event));
            }}
          />
        );
      case 'changeComment': {
        const content = cell.row.original;
        const editing = editingChangeCommentId === content.id;
        return editing ? (
          <Stack spacing={0.5} sx={{ minWidth: 220 }}>
            <Textarea size="sm" minRows={1} maxRows={4} value={changeCommentDrafts[content.id] ?? content.changeComment ?? ''} placeholder="Commentaire de modification" onChange={event => onChangeCommentDraft?.(content.id, event.target.value)} />
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
              <IconButton size="sm" title="Enregistrer le commentaire" aria-label="Enregistrer le commentaire" disabled={savingChangeCommentId !== null} onClick={() => onSaveChangeComment?.(content.id)}><Check /></IconButton>
              <IconButton size="sm" title="Annuler" aria-label="Annuler" variant="plain" onClick={() => onCancelChangeComment?.(content.id)}><Close /></IconButton>
            </Stack>
          </Stack>
        ) : <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap', minWidth: 160 }}>{content.changeComment?.trim() || '—'}</Typography>;
      }
      case 'actions':
        return (
          <Stack spacing={1} direction="row" justifyContent="flex-end">
            <ActionsMenu
              size="sm"
              actions={getContentActions(cell.row.original)}
            />
          </Stack>
        );
      default:
        return flexRender(cell.column.columnDef.cell, cell.getContext());
    }
  };

  return (
    <Table
      stickyHeader
      hoverRow
      sx={{
        tableLayout: 'auto',
        '--TableCell-headBackground': 'white',
        '--Table-headerUnderlineThickness': '1px',
        '--TableRow-hoverBackground': theme =>
          theme.vars.palette.background.level1,
      }}
    >
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => {
              return <td key={cell.id}>{getCellContent(cell)}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
