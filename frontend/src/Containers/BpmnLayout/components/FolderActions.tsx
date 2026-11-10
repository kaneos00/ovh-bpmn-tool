import React from 'react';
import { Add } from '@mui/icons-material';

import { ActionButton } from '../../../Components/GenericComponents/ActionButton/ActionButton';

type FolderActionsProps = {
  projectId?: string | null;
  canCreateFolder: boolean;
  canCreateProcess: boolean;
};

export const FolderActions = ({
  projectId,
  canCreateFolder,
  canCreateProcess,
}: FolderActionsProps) => (
  <>
    {canCreateFolder && (
      <ActionButton
        to="./add?type=folder"
        content="Nouveau dossier"
        label="Créer un dossier"
        leftIcon={<Add fontSize="small" />}
      />
    )}
    {canCreateProcess && projectId && (
      <ActionButton
        to={`./add?type=process&projectId=${encodeURIComponent(projectId)}`}
        content="Nouveau processus"
        label="Créer un processus dans le projet actif"
        leftIcon={<Add fontSize="small" />}
      />
    )}
  </>
);
