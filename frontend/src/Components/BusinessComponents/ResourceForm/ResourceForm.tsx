import React, { FC } from 'react';
import {
  Button,
  FormLabel,
  FormControl,
  Input,
  Stack,
  Skeleton,
  Select,
  Option,
  Autocomplete,
  Typography,
  Alert,
} from '@mui/joy';
import { useQuery } from 'react-query';
import { Controller, useForm } from 'react-hook-form';
import { apiClient } from '../../../queryClient';
import { ResourceType } from '../../../shared/types/BpmnResource';

import type { Resource } from '../../../Types';

export type ResourceFormFields = {
  name: string;
  description?: string;
  type: ResourceType;
  processType?: string;
  processNature?: string;
  pilot?: string;
};

export type ResourceFormProps = {
  onFormSubmit?: (props: ResourceFormFields) => void;
  isLoading?: boolean;
  resource?: Resource;
  projectId?: string;
  resourceType?: ResourceType;
};

export const ResourceForm: FC<ResourceFormProps> = ({
  onFormSubmit,
  isLoading = false,
  resource,
  projectId,
  resourceType,
}) => {
  const membersQuery = useQuery<Array<{ userId: string; role: string }>>(
    ['project-members', projectId],
    () => apiClient.get(`/projects/${projectId}/members`),
    { enabled: Boolean(projectId && resourceType === ResourceType.Process) },
  );
  const { register, control, handleSubmit, watch } = useForm<ResourceFormFields>({
    values: resource ?? undefined,
  });
  const processName = watch('name', resource?.name ?? '');
  const workspaceQuery = useQuery<{ projects?: Array<{ id: string; processes?: Array<{ resourceId: string; name: string }> }> }>(
    ['project-workspace-process-names', projectId],
    () => apiClient.get('/projects/me/workspace'),
    { enabled: Boolean(projectId && resourceType === ResourceType.Process) },
  );
  const duplicateProcess = (workspaceQuery.data?.projects ?? [])
    .find(project => project.id === projectId)
    ?.processes?.some(process =>
      process.resourceId !== resource?.id &&
      process.name.trim().toLocaleLowerCase('fr') === processName.trim().toLocaleLowerCase('fr'),
    ) ?? false;

  return (
    <form
      autoComplete="off"
      onSubmit={handleSubmit(props => {
        onFormSubmit?.(props);
      })}
    >
      <input {...register('type')} type="hidden" />
      <Stack spacing={2}>
        <FormControl>
          <FormLabel>Name</FormLabel>
          <Skeleton sx={{ position: 'relative' }} loading={isLoading}>
            <Input required {...register('name')} />
            {resourceType === ResourceType.Process && duplicateProcess && (
              <Alert color="warning" size="sm" sx={{ mt: 0.75 }}>
                Un processus porte déjà ce nom dans ce projet. Choisissez un autre nom pour éviter toute confusion.
              </Alert>
            )}
          </Skeleton>
        </FormControl>
        <FormControl>
          <FormLabel>Description</FormLabel>
          <Skeleton sx={{ position: 'relative' }} loading={isLoading}>
            <Input {...register('description')} />
          </Skeleton>
        </FormControl>
        {resourceType === ResourceType.Process && (
          <>
            <FormControl>
              <FormLabel>Type de processus</FormLabel>
              <Controller name="processType" control={control} defaultValue="operationnel" render={({ field }) => (
                <Select value={field.value ?? 'operationnel'} onChange={(_, value) => field.onChange(value ?? 'operationnel')}>
                  <Option value="organisationnel">Organisationnel</Option>
                  <Option value="operationnel">Opérationnel</Option>
                </Select>
              )} />
            </FormControl>
            <FormControl>
              <FormLabel>Nature du processus</FormLabel>
              <Controller name="processNature" control={control} defaultValue="specific" render={({ field }) => (
                <Select value={field.value ?? 'specific'} onChange={(_, value) => field.onChange(value ?? 'specific')}>
                  <Option value="global">Global</Option>
                  <Option value="specific">Spécifique</Option>
                </Select>
              )} />
            </FormControl>
            <FormControl>
              <FormLabel>Pilote</FormLabel>
              <Controller name="pilot" control={control} defaultValue="" render={({ field }) => (
                <Autocomplete
                  options={(membersQuery.data ?? []).map(member => member.userId)}
                  value={field.value || null}
                  onChange={(_, value) => field.onChange(value ?? '')}
                  placeholder={membersQuery.isLoading ? 'Chargement des membres…' : 'Rechercher un membre du projet'}
                  loading={membersQuery.isLoading}
                  noOptionsText={membersQuery.isError ? 'Impossible de charger les membres' : 'Aucun membre trouvé'}
                  renderOption={(props, option) => <li {...props} key={option}>{option}</li>}
                />
              )} />
              <Typography level="body-xs" color="neutral">Sélection facultative parmi les membres du projet.</Typography>
            </FormControl>
          </>
        )}
        <Button type="submit" disabled={isLoading}>
          {resource ? 'Update' : 'Create'}
        </Button>
      </Stack>
    </form>
  );
};
