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
      onError: (error: unknown) => {
        const apiMessage =
          error instanceof HttpError
            ? String(error.errorResponse?.message ?? '').toLowerCase()
            : '';

        if (error instanceof HttpError && error.status === 409) {
          setCloneError(
            'Le clonage a échoué : une ressource portant déjà ce nom existe dans ce dossier. Modifiez le nom de la copie puis réessayez.',
          );
          return;
        }

        if (error instanceof HttpError && error.status === 403) {
          if (apiMessage.includes('modeler access')) {
            setCloneError(
              'Le clonage est refusé : vous devez avoir le rôle de modélisateur ou d’administrateur sur tous les projets liés à ce processus.',
            );
            return;
          }
          setCloneError(
            'Le clonage est refusé par les droits d’accès. Vérifiez votre rôle et les droits associés au processus source.',
          );
          return;
        }

        if (error instanceof HttpError && error.status === 400) {
          if (apiMessage.includes('no bpmn content')) {
            setCloneError(
              'Ce processus ne contient aucun diagramme BPMN exploitable à copier. Ouvrez le processus source, vérifiez son contenu puis réessayez.',
            );
            return;
          }
          setCloneError(
            'Le serveur a refusé le clonage. Vérifiez que le processus source contient un diagramme BPMN et que le nom de la copie est valide.',
          );
          return;
        }

        if (error instanceof HttpError && error.status === 404) {
          setCloneError(
            'Le processus source est introuvable ou n’est plus accessible. Actualisez la liste puis réessayez.',
          );
          return;
        }

        if (error instanceof HttpError && error.status === 401) {
          setCloneError(
            'Votre session n’est plus valide. Reconnectez-vous puis réessayez de cloner le processus.',
          );
          return;
        }

        if (error instanceof HttpError && error.status >= 500) {
          setCloneError(
            'Une erreur du serveur empêche le clonage. Réessayez plus tard ; si le problème persiste, consultez les journaux du serveur.',
          );
          return;
        }

        setCloneError(
          error instanceof TypeError
            ? 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.'
            : 'Le clonage a échoué pour une raison inattendue. Réessayez ; si le problème persiste, consultez les journaux du serveur.',
        );
      },
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
