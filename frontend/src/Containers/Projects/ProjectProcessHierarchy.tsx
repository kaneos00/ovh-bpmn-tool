import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from 'react-query';
import { Box, Button, Card, Divider, Stack, Typography } from '@mui/joy';

import { contentsQuery, getXmlContentQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content } from '../../Types';
import { ProcessHierarchyTree } from '../../Components/BusinessComponents/ProcessHierarchyTree/ProcessHierarchyTree';

export type ProjectProcessItem = {
  resourceId: string;
  name: string;
};

type ProjectProcessHierarchyProps = {
  processes: ProjectProcessItem[];
};

const getPublishedContent = (contents: Content[] | undefined) =>
  (contents ?? [])
    .filter(content => content.status === ContentStatusEnum.Published)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];

const BPMN_MODEL_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

const getBpmnProcessIds = (xml: string): string[] => {
  if (!xml || typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return [];

  return Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'process'))
    .map(process => process.getAttribute('id')?.trim() || '')
    .filter(Boolean);
};

const findLinkedProcesses = (xml: string) => {
  if (!xml || typeof DOMParser === 'undefined') return [];
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return [];

  const links = Array.from(document.getElementsByTagNameNS(BPMN_MODEL_NS, 'callActivity'))
    .map(element => ({
      id: element.getAttribute('id') || '',
      name: element.getAttribute('name')?.trim() || element.getAttribute('id') || 'Appel de processus',
      targetId: element.getAttribute('calledElement')?.trim() || '',
    }))
    .filter(link => link.targetId);

  return Array.from(new Map(links.map(link => [link.targetId, link])).values());
};

export const ProjectProcessHierarchy = ({ processes }: ProjectProcessHierarchyProps) => {
  const navigate = useNavigate();
  const contentQueries = useQueries(processes.map(process => contentsQuery(process.resourceId)));
  const publishedContents = processes.map((_, index) =>
    getPublishedContent(contentQueries[index]?.data as Content[] | undefined),
  );
  const xmlQueries = useQueries(processes.map((process, index) => {
    const published = publishedContents[index];
    return {
      ...getXmlContentQuery(process.resourceId, published?.id ?? ''),
      enabled: Boolean(published?.id),
    };
  }));

  const rows = useMemo(() => processes.map((process, index) => {
    const xml = (xmlQueries[index]?.data as string | undefined) ?? '';
    return {
      ...process,
      xml,
      loading: contentQueries[index]?.isLoading || xmlQueries[index]?.isLoading,
      error: contentQueries[index]?.isError || xmlQueries[index]?.isError,
      bpmnProcessIds: getBpmnProcessIds(xml),
      linked: findLinkedProcesses(xml),
    };
  }), [processes, contentQueries, xmlQueries]);

  if (!processes.length) return null;

  return (
    <Card variant="outlined" sx={{ gap: 1.5 }}>
      <Typography level="title-lg">Arbre de navigation des processus</Typography>
      <Typography level="body-sm" color="neutral">
        Parcourez les activités et les sous-processus, puis ouvrez les processus liés par une activité d’appel.
      </Typography>
      <Stack spacing={1.5} divider={<Divider />}>
        {rows.map(process => (
          <Box key={process.resourceId} sx={{ minWidth: 0 }}>
            <Button
              variant="soft"
              color="neutral"
              sx={{ justifyContent: 'flex-start', width: '100%', textAlign: 'left' }}
              onClick={() => navigate(`/${process.resourceId}`)}
            >
              <span aria-hidden="true">▣</span>
              {process.name}
            </Button>
            {process.loading && <Typography level="body-xs" color="neutral">Chargement de l’arbre…</Typography>}
            {process.error && <Typography level="body-xs" color="danger">Arbre indisponible pour ce processus.</Typography>}
            {process.xml && (
              <Box sx={{ pl: 1, mt: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                <ProcessHierarchyTree
                  xmlContent={process.xml}
                  onElementClick={elementId => navigate(`/${process.resourceId}?elementId=${encodeURIComponent(elementId)}`)}
                />
              </Box>
            )}
            {process.linked.length > 0 && (
              <Box sx={{ pl: 2, mt: 1 }}>
                <Typography level="body-xs" color="neutral" sx={{ mb: 0.5 }}>Processus appelés</Typography>
                <Stack spacing={0.5}>
                  {process.linked.map(link => {
                    const target = rows.find(candidate =>
                      candidate.resourceId === link.targetId ||
                      candidate.bpmnProcessIds.includes(link.targetId),
                    );
                    return target ? (
                      <Button
                        key={link.targetId}
                        size="sm"
                        variant="plain"
                        color="primary"
                        sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                        onClick={() => navigate(`/${target.resourceId}`)}
                      >
                        ↳ {target.name} <Typography level="body-xs" color="neutral">— {link.name}</Typography>
                      </Button>
                    ) : null;
                  })}
                </Stack>
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    </Card>
  );
};
