import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentCopy, Delete, Edit, MoreVert, Share } from '@mui/icons-material';
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Dropdown,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  ListItemDecorator,
  Menu,
  MenuButton,
  MenuItem,
  Modal,
  ModalDialog,
  Stack,
} from '@mui/joy';
import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../../queryClient';

import {
  ResourceAction,
  ResourceType,
} from '../../../../shared/types/BpmnResource';

import type { Resource } from '../../../../Types';

type ResourceActionsProps = {
  resource: Resource;
  getActionLink: (id: string, action: ResourceAction) => string;
};

export const ResourceActions = ({
  resource,
  getActionLink,
}: ResourceActionsProps) => {
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneName, setCloneName] = useState(`${resource.name} (copie)`);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cloneProcess = useMutation(
    () => apiClient.post(`/resources/${resource.id}/clone`, { name: cloneName.trim() }),
    {
      onSuccess: async (clonedResource: Resource) => {
        setCloneError(null);
        setCloneDialogOpen(false);
        await queryClient.invalidateQueries(['resources']);
        navigate(`/${clonedResource.id}/modeler`);
      },
      onError: (error: Error) => setCloneError(error.message),
    },
  );

  return (
    <Stack spacing={1} direction="row" justifyContent="flex-end">
      <Dropdown>
        <MenuButton
          slots={{ root: IconButton }}
          slotProps={{
            root: { variant: 'outlined', color: 'neutral', size: 'sm' },
          }}
        >
          <MoreVert />
        </MenuButton>
        <Menu>
          <MenuItem
            component={Link}
            to={getActionLink(resource.id, ResourceAction.Edit)}
            title={`${resource.name}: edit the resource`}
          >
            <ListItemDecorator>
              <Edit fontSize="small" />
            </ListItemDecorator>
            Edit
          </MenuItem>
          {resource.type === ResourceType.Process && (
            <MenuItem
              onClick={() => {
                setCloneName(`${resource.name} (copie)`);
                setCloneError(null);
                setCloneDialogOpen(true);
              }}
              title={`${resource.name}: clone the process`}
            >
              <ListItemDecorator>
                <ContentCopy fontSize="small" />
              </ListItemDecorator>
              Cloner le processus
            </MenuItem>
          )}
          {resource.type === ResourceType.Process && (
            <MenuItem
              component={Link}
              to={getActionLink(resource.id, ResourceAction.Share)}
              title={`${resource.name}: share the resource`}
            >
              <ListItemDecorator>
                <Share fontSize="small" />
              </ListItemDecorator>
              Share
            </MenuItem>
          )}
          <MenuItem
            component={Link}
            to={getActionLink(resource.id, ResourceAction.Delete)}
            title={`${resource.name}: delete the resource`}
          >
            <ListItemDecorator>
              <Delete fontSize="small" />
            </ListItemDecorator>
            Delete
          </MenuItem>
        </Menu>
      </Dropdown>
      <Modal open={cloneDialogOpen} onClose={() => !cloneProcess.isLoading && setCloneDialogOpen(false)}>
        <ModalDialog>
          <DialogTitle>Cloner le processus</DialogTitle>
          <DialogContent>
            Crée une copie indépendante dans le même dossier, avec le contenu BPMN disponible comme brouillon.
          </DialogContent>
          {cloneError && <Alert color="danger">{cloneError}</Alert>}
          <FormControl required>
            <FormLabel>Nom de la copie</FormLabel>
            <Input
              autoFocus
              value={cloneName}
              onChange={(event) => setCloneName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && cloneName.trim() && !cloneProcess.isLoading) {
                  cloneProcess.mutate();
                }
              }}
            />
          </FormControl>
          <DialogActions>
            <Button variant="plain" color="neutral" onClick={() => setCloneDialogOpen(false)} disabled={cloneProcess.isLoading}>
              Annuler
            </Button>
            <Button
              loading={cloneProcess.isLoading}
              disabled={!cloneName.trim() || cloneProcess.isLoading}
              onClick={() => cloneProcess.mutate()}
            >
              Cloner
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Stack>
  );
};
