import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Alert, Badge, Box, Card, Chip, Stack, Table, Typography } from '@mui/joy';
import { apiClient } from '../../queryClient';

type ProjectDocumentedSourcesResponse = {
  sources: Array<{
    id: string;
    kind: string;
    name: string;
    description: string | null;
    link: string | null;
    location: string | null;
    access: string | null;
    retention: string | null;
    authorizedPeople: string | null;
    restrictions: string | null;
    references: Array<{
      resourceId: string;
      processName: string;
      elementId: string;
      elementName: string;
      elementType: string;
    }>;
  }>;
  unlinkedReferences: Array<{
    resourceId: string;
    processName: string;
    elementId: string;
    elementName: string;
    elementType: string;
  }>;
};

type Props = { projectId: string };

export const ProjectDocumentedInformationOverview = ({ projectId }: Props) => {
  const navigate = useNavigate();
  const query = useQuery<ProjectDocumentedSourcesResponse>(
    ['project-documented-sources', projectId],
    () => apiClient.get('/projects/' + projectId + '/documented-sources'),
    { enabled: Boolean(projectId) },
  );
  const sources = query.data?.sources ?? [];
  const unlinked = query.data?.unlinkedReferences ?? [];

  const openReference = (resourceId: string, elementId: string) => {
    const params = new URLSearchParams({ elementId, projectId });
    navigate('/' + resourceId + '?' + params.toString());
  };

  return (
    <Card variant="outlined" sx={{ gap: 1.25 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Box>
          <Typography level="title-lg">Informations documentées du projet</Typography>
          <Typography level="body-sm" color="neutral">Synthèse des sources documentaires partagées entre les processus et des nouveaux éléments à rattacher.</Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          <Chip size="sm" variant="soft">{sources.length} source(s) référencée(s)</Chip>
          <Chip size="sm" color={unlinked.length ? 'warning' : 'success'} variant="soft">{unlinked.length} nouveau(x)</Chip>
        </Stack>
      </Stack>

      {query.isLoading && <Typography level="body-sm" color="neutral">Chargement des informations documentées…</Typography>}
      {query.isError && <Alert color="warning" variant="soft">La synthèse des informations documentées n’est pas disponible pour le moment.</Alert>}
      {query.isSuccess && sources.length === 0 && unlinked.length === 0 && (
        <Typography level="body-sm" color="neutral">Aucune source documentaire n’a encore été répertoriée dans les processus du projet.</Typography>
      )}

      {query.isSuccess && sources.length > 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="sm" stickyHeader hoverRow>
            <thead><tr><th>Source documentaire</th><th>Type</th><th>Description</th><th>Processus utilisateurs</th><th>Statut</th></tr></thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id}>
                  <td><Typography level="body-sm" fontWeight="md">{source.name}</Typography></td>
                  <td>{source.kind === 'database' ? 'Base de données' : source.kind === 'application' ? 'Application' : source.kind === 'form' ? 'Formulaire' : 'Fichier'}</td>
                  <td><Typography level="body-sm" sx={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>{source.description || '—'}</Typography></td>
                  <td>
                    <Stack spacing={0.25}>
                      {source.references.map(reference => (
                        <Box key={reference.resourceId + ':' + reference.elementId}>
                          <Typography
                            component="button"
                            level="body-sm"
                            onClick={() => openReference(reference.resourceId, reference.elementId)}
                            sx={{ border: 0, p: 0, background: 'transparent', color: 'primary.600', cursor: 'pointer', textAlign: 'left' }}
                          >
                            {reference.processName} · {reference.elementName}
                          </Typography>
                        </Box>
                      ))}
                      {!source.references.length && <Typography level="body-xs" color="neutral">Aucune référence de processus</Typography>}
                    </Stack>
                  </td>
                  <td><Chip size="sm" color="success" variant="soft">Référencée</Chip></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      )}

      {query.isSuccess && unlinked.length > 0 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Stack spacing={0.75}>
            <Typography level="title-sm">Nouveaux éléments à rattacher</Typography>
            <Table size="sm" hoverRow>
              <thead><tr><th>Élément BPMN</th><th>Type</th><th>Processus</th><th>Statut</th></tr></thead>
              <tbody>
                {unlinked.map(item => (
                  <tr key={item.resourceId + ':' + item.elementId}>
                    <td>
                      <Typography
                        component="button"
                        level="body-sm"
                        fontWeight="md"
                        onClick={() => openReference(item.resourceId, item.elementId)}
                        sx={{ border: 0, p: 0, background: 'transparent', color: 'primary.600', cursor: 'pointer', textAlign: 'left' }}
                      >
                        {item.elementName}
                      </Typography>
                    </td>
                    <td>{item.elementType === 'dataStoreReference' ? 'Magasin de données' : 'Objet de données'}</td>
                    <td>{item.processName}</td>
                    <td><Chip size="sm" color="warning" variant="soft">Nouveau</Chip></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Stack>
        </Box>
      )}
    </Card>
  );
};
