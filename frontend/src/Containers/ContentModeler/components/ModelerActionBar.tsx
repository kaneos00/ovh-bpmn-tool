import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Dropdown,
  MenuButton,
  Menu,
  MenuItem,
  ListItemDecorator,
  Stack,
} from '@mui/joy';
import {
  Home,
  UploadFile,
  Image,
  FileDownload,
  Info,
  Done,
  Save,
  Compare,
  Undo,
  Redo,
} from '@mui/icons-material';

import { ActionBar } from '../../../Components/GenericComponents/ActionBar/ActionBar';
import { UserAccountMenu } from '../../../Components/GenericComponents/UserAccountMenu/UserAccountMenu';

type ModelerActionBarProps = {
  resourceId: string;
  hasLintError: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFileUpload: (files: FileList) => void;
  onFileExport: (exportType: 'svg' | 'bpmn' | 'svg-a4-portrait' | 'svg-a4-landscape') => void;
  onDiagramSave: () => void;
  onDiagramPublish: () => void;
  onShortcutDisplay: () => void;
  onRaciOpen: () => void;
  onRolesOpen: () => void;
  onCompareWithSource?: () => void;
  proposalMode?: boolean;
  reviewOnly?: boolean;
  approvedProposalMode?: boolean;
  onPublishApprovedProposal?: () => void;
  publishApprovedDisabled?: boolean;
  publishApprovedLoading?: boolean;
};

export const ModelerActionBar = ({
  resourceId,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFileUpload,
  onFileExport,
  onDiagramSave,
  onDiagramPublish,
  onShortcutDisplay,
  onRaciOpen,
  onRolesOpen,
  onCompareWithSource,
  proposalMode = false,
  reviewOnly = false,
  approvedProposalMode = false,
  onPublishApprovedProposal,
  publishApprovedDisabled = false,
  publishApprovedLoading = false,
}: ModelerActionBarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  let publishButtonLabel = 'Publish';
  if (proposalMode) publishButtonLabel = 'Demander en validation';
  if (approvedProposalMode) publishButtonLabel = 'Publier la version approuvée';

  return (
    <ActionBar>
      <Stack gap={1} direction="row">
        <Button
          variant="outlined"
          color="neutral"
          component={Link}
          to={`/${resourceId}`}
        >
          <Home fontSize="small" />
        </Button>

        {onCompareWithSource && (
          <Button
            variant="outlined"
            color="neutral"
            startDecorator={<Compare fontSize="small" />}
            onClick={onCompareWithSource}
          >
            Comparer avec la source
          </Button>
        )}

        {!reviewOnly && <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outlined"
          color="neutral"
          startDecorator={<UploadFile fontSize="small" />}
        >
          Upload
        </Button>}

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          multiple={false}
          accept=".bpmn"
          onChange={event => {
            event.preventDefault();
            if (event.target.files && event.target.files[0]) {
              onFileUpload(event.target.files);
            }
          }}
        />

        <Dropdown>
          <MenuButton startDecorator={<FileDownload fontSize="small" />}>
            Export
          </MenuButton>
          <Menu>
            <MenuItem onClick={() => onFileExport('svg')}>
              <ListItemDecorator>
                <Image />
              </ListItemDecorator>
              Export as SVG
            </MenuItem>
            <MenuItem onClick={() => onFileExport('svg-a4-portrait')}>
              <ListItemDecorator>
                <Image />
              </ListItemDecorator>
              SVG A4 (portrait)
            </MenuItem>
            <MenuItem onClick={() => onFileExport('svg-a4-landscape')}>
              <ListItemDecorator>
                <Image />
              </ListItemDecorator>
              SVG A4 (paysage)
            </MenuItem>
            <MenuItem onClick={() => onFileExport('bpmn')}>
              <ListItemDecorator>
                <FileDownload />
              </ListItemDecorator>
              Export as BPMN
            </MenuItem>
          </Menu>
        </Dropdown>
        {!reviewOnly && <>
          <Button variant="outlined" color="neutral" onClick={onUndo} disabled={!canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler la dernière modification"><Undo fontSize="small" /></Button>
          <Button variant="outlined" color="neutral" onClick={onRedo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir la dernière modification"><Redo fontSize="small" /></Button>
        </>}
        <Button variant="outlined" color="neutral" onClick={onRaciOpen}>
          RACI
        </Button>
        <Button variant="outlined" color="neutral" onClick={onRolesOpen}>
          ROLE
        </Button>
      </Stack>
      <Stack gap={1} direction="row" justifyContent="flex-end">
        <Button onClick={onShortcutDisplay} variant="outlined" color="neutral">
          <Info fontSize="small" />
        </Button>

        {reviewOnly && (
          <Button component={Link} to="/mes-demandes" variant="outlined" color="neutral">
            Retour aux demandes
          </Button>
        )}
        {!proposalMode && !reviewOnly && (
          <Button
            variant="outlined"
            color="neutral"
            startDecorator={<Save fontSize="small" />}
            onClick={onDiagramSave}
          >
            Save
          </Button>
        )}

        {!reviewOnly && <Button
          onClick={approvedProposalMode ? onPublishApprovedProposal : onDiagramPublish}
          disabled={approvedProposalMode && publishApprovedDisabled}
          loading={approvedProposalMode && publishApprovedLoading}
          variant="outlined"
          // disabled={hasLintError}
          color="success"
          endDecorator={<Done fontSize="small" />}
        >
          {publishButtonLabel}
        </Button>}
        <UserAccountMenu dark={false} />
      </Stack>
    </ActionBar>
  );
};
