import { useEffect } from 'react';
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSearchParams,
  useSubmit,
} from 'react-router-dom';

import { useSnackbar } from '../../../shared/hooks/useSnackbar';

import type {
  DeleteResourceActionResponse,
  DeleteResourceLoaderData,
  DeleteResourceSubmitData,
} from '..';
import { useResource } from '../../../shared/hooks/useResource';
import { ResourceType } from '../../../shared/types/BpmnResource';

const getDeletionErrorMessage = (errorMessage?: string) => {
  const normalizedMessage = (errorMessage ?? '').toLowerCase();

  if (
    normalizedMessage.includes('common processes are read-only') ||
    normalizedMessage.includes('common processes cannot be deleted')
  ) {
    return 'Suppression refusée : ce processus appartient à la bibliothèque commune. Il doit être géré depuis la bibliothèque centrale.';
  }

  if (
    normalizedMessage.includes('shared by multiple projects') ||
    normalizedMessage.includes('multiple projects')
  ) {
    return 'Suppression refusée : ce processus est utilisé dans plusieurs projets. Il doit d’abord être dissocié de tous les projets concernés.';
  }

  if (
    normalizedMessage.includes('source of one or more variants') ||
    normalizedMessage.includes('dependent variant')
  ) {
    return 'Suppression refusée : ce processus est la source d’une ou plusieurs variantes encore présentes ailleurs. Supprimez ou déplacez ces variantes avant de supprimer la source.';
  }

  if (
    normalizedMessage.includes('requires modeler access') ||
    normalizedMessage.includes('insufficient project role')
  ) {
    return 'Suppression refusée : vos droits sont insuffisants sur au moins un des projets concernés. Un modélisateur ou un administrateur doit effectuer cette opération.';
  }

  return 'La suppression a échoué. Vérifiez vos droits ou réessayez. Si le problème persiste, contactez un administrateur.';
};

export const useDeleteResource = () => {
  const [searchParams] = useSearchParams();
  const actionData = useActionData() as DeleteResourceActionResponse;
  const loaderData = useLoaderData() as DeleteResourceLoaderData;

  const targetResourceId = searchParams.get('targetResourceId') as string;

  const navigate = useNavigate();
  const submit = useSubmit();
  const { showAlert } = useSnackbar();

  const { resource } = useResource(targetResourceId, !actionData);

  /**
   * Callbacks
   */

  const onModalClose = () => {
    return navigate('..');
  };

  const onModalConfirm = () => {
    return submit(
      {
        resourceType: resource?.type,
      } as DeleteResourceSubmitData,
      { method: 'delete' },
    );
  };

  const onModalCancel = () => {
    return onModalClose();
  };

  /**
   * Action return management
   */

  useEffect(() => {
    if (actionData && !actionData.error) {
      showAlert({
        message:
          actionData.deletedResourceType === ResourceType.Folder
            ? 'Dossier supprimé. Les processus communs et ceux utilisés dans plusieurs projets ont été conservés et déplacés à la racine lorsqu’ils étaient présents.'
            : 'Processus supprimé avec succès.',
        severity: 'success',
      });
    } else if (actionData?.error) {
      showAlert({
        message: getDeletionErrorMessage(actionData.error.message),
        severity: 'danger',
      });
    }
  }, [actionData]);

  return {
    resource,
    actionData,
    loaderData,
    callbacks: {
      onModalClose,
      onModalConfirm,
      onModalCancel,
    },
  };
};
