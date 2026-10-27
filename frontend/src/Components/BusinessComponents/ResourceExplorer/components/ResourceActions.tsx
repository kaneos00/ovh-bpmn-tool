import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { apiClient } from '../../../../queryClient';
import { HttpError } from '../../../../shared/api/httpError';
import { useSnackbar } from '../../../../shared/hooks/useSnackbar';

import {
  ResourceAction,
  ResourceType,
} from '../../../../shared/types/BpmnResource';

import type { Resource } from '../../../../Types';

type ResourceActionsProps = {
  resource: Resource;
  getActionLink: (id: string, action: ResourceAction) => string;
  openContextMenu?: boolean;
  onContextMenuClosed?: () => void;
};

export const ResourceActions = ({
  resource,
  getActionLink,
  openContextMenu = false,
  onContextMenuClosed,
}: ResourceActionsProps) => {
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cloneName, setCloneName] = useState(`${resource.name} (copie)`);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const { showAlert } = useSnackbar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cloneProcess = useMutation(
    () => apiClient.post(`/resources/${resource.id}/clone`, { name: cloneName.trim() }),
    {
      onSuccess: async (clonedResource: Resource) => {
        setCloneError(null);
        setCloneDialogOpen(false);
        setMenuOpen(false);
        await queryClient.invalidateQueries(['resources']);
        navigate(`/${clonedResource.id}/modeler`);
      },
      onError: (error: unknown) => {
        const apiMessage =
          error instanceof HttpError
            ? String(error.errorResponse?.message ?? '').trim()
            : '';
        const normalizedMessage = apiMessage.toLowerCase();
        let message: string;

        if (error instanceof HttpError && error.status === 409) {
          message =
            'Le clonage a échoué : une ressource portant déjà ce nom existe dans ce dossier. Modifiez le nom de la copie puis réessayez.';
        } else if (error instanceof HttpError && error.status === 403) {
          message = normalizedMessage.includes('modeler access')
            ? 'Le clonage est refusé : vous devez avoir le rôle de modélisateur ou d’administrateur sur tous les projets liés à ce processus.'
            : 'Le clonage est refusé par les droits d’accès. Vérifiez votre rôle et les droits associés au processus source.';
        } else if (error instanceof HttpError && error.status === 400) {
          message = normalizedMessage.includes('no bpmn content')
            ? 'Ce processus ne contient aucun diagramme BPMN exploitable à copier. Ouvrez le processus source, vérifiez son contenu puis réessayez.'
            : 'Le serveur a refusé le clonage. Vérifiez que le processus source contient un diagramme BPMN et que le nom de la copie est valide.';
        } else if (error instanceof HttpError && error.status === 404) {
          message =
            'Le processus source est introuvable ou n’est plus accessible. Actualisez la liste puis réessayez.';
        } else if (error instanceof HttpError && error.status === 401) {
          message =
            'Votre session n’est plus valide. Reconnectez-vous puis réessayez de cloner le processus.';
        } else if (error instanceof HttpError && error.status >= 500) {
          message =
            'Une erreur du serveur empêche le clonage. Réessayez plus tard ; si le problème persiste, consultez les journaux du serveur.';
        } else if (error instanceof TypeError) {
          message =
            'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.';
        } else if (apiMessage) {
          message = `Le clonage a échoué : ${apiMessage}`;
        } else {
          message =
            'Le clonage a échoué pour une raison inattendue. Réessayez ; si le problème persiste, consultez les journaux du serveur.';
        }

        setCloneError(message);
        showAlert({ message, severity: 'danger' });
      },
    },
  );

  return (
    <Stack spacing={1} direction="row" justifyContent="flex-end">
      <Dropdown
        open={menuOpen || openContextMenu}
        onOpenChange={(_, open) => {
          setMenuOpen(open);
          if (!open) onContextMenuClosed?.();
        }}
      >
        <MenuButton
          slots={{ root: IconButton }}
          slotProps={{
            root: { variant: 'outlined', color: 'neutral', size: 'sm' },
          }}
          onContextMenu={event => {
            event.preventDefault();
            setMenuOpen(true);
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
