import React from 'react';
import { Add } from '@mui/icons-material';

import { ActionButton } from '../../../Components/GenericComponents/ActionButton/ActionButton';

type FolderActionsProps = {
  projectId?: string | null;
  canCreateFolder: boolean;
};

export const FolderActions = ({
  projectId,
  canCreateFolder,
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
  </>
);
