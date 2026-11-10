import React from 'react';
import { Await, Navigate } from 'react-router-dom';

import { usePublishResource } from './hooks/usePublishResource';
import { BaseModal } from '../../Components/GenericComponents/BaseModal/BaseModal';

import { ResourceType } from '../../shared/types/BpmnResource';
import { PublishContent } from './components/PublishContent';
import { Button, DialogActions } from '@mui/joy';

export const Component = () => {
  const { loaderData, resource, base64Png, actionData, viewerRef, callbacks } =
    usePublishResource();

  // A failed publication must remain on the confirmation screen so the
  // user can see the error and retry. After success, return to the process
  // workspace (Viewer), regardless of whether Publish was opened from the
  // Viewer or directly from the Modeler.
  if (
    (resource && resource.type === ResourceType.Folder) ||
    (actionData && !actionData.error)
  ) {
    return <Navigate to={`/${resource?.id}`} replace />;
  }

  return (
    <>
      <React.Suspense
        fallback={
          <BaseModal
            sx={{ maxWidth: 1000 }}
            open
            onClose={callbacks.onModalClose}
            isLoading
          >
            <PublishContent isLoading />
          </BaseModal>
        }
      >
        <Await resolve={loaderData.resource}>
          <BaseModal
            title="Publication du processus"
            open
            onClose={callbacks.onModalClose}
            sx={{ maxWidth: 1000 }}
          >
            <>
              <PublishContent
                resource={resource}
                base64Png={base64Png}
                onPngPreviewClick={callbacks.onPngPreviewClick}
              />

              <DialogActions>
                <Button
                  variant="solid"
                  color="primary"
                  onClick={callbacks.onPublish}
                >
                  Publier
                </Button>
                <Button
                  variant="plain"
                  color="neutral"
                  onClick={callbacks.onModalClose}
                >
                  Annuler
                </Button>
              </DialogActions>
            </>
          </BaseModal>
        </Await>
      </React.Suspense>
      <div ref={viewerRef} style={{ height: '0' }} />
    </>
  );
};

Component.displayName = 'PublishResourceContainer';
