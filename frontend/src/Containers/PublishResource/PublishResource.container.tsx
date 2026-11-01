import React from 'react';
import { Await, Navigate, useLocation } from 'react-router-dom';

import { usePublishResource } from './hooks/usePublishResource';
import { BaseModal } from '../../Components/GenericComponents/BaseModal/BaseModal';

import { ResourceType } from '../../shared/types/BpmnResource';
import { PublishContent } from './components/PublishContent';
import { Button, DialogActions, Typography } from '@mui/joy';

export const Component = () => {
  const location = useLocation();
  const {
    loaderData,
    resource,
    base64Png,
    actionData,
    viewerRef,
    changeRequestId,
    canPublish,
    callbacks,
  } =
    usePublishResource();

  // A failed publication must remain on the confirmation screen so the
  // user can see the error and retry. Redirect only after a successful action.
  if (
    (resource && resource.type === ResourceType.Folder) ||
    (actionData && !actionData.error)
  ) {
    const returnToModeler = location.pathname.endsWith('/modeler/publish');
    return <Navigate to={`/${resource?.id}${returnToModeler ? '/modeler' : ''}`} />;
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
            title={changeRequestId ? "Publication de la contribution approuvée" : "Business Process publication"}
            open
            onClose={callbacks.onModalClose}
            sx={{ maxWidth: 1000 }}
          >
            <>
              {changeRequestId && !canPublish && (
                <Typography level="body-sm" color="warning">
                  Cette contribution doit être approuvée avant sa publication.
                </Typography>
              )}
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
                  disabled={!base64Png || !canPublish}
                >
                  {changeRequestId ? 'Publier la contribution' : 'Publish'}
                </Button>
                <Button
                  variant="plain"
                  color="neutral"
                  onClick={callbacks.onModalClose}
                >
                  Cancel
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
