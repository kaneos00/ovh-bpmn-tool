import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Sheet,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy';
import { Compare, FileCopy, ChevronLeft, ChevronRight, DescriptionOutlined, GroupsOutlined, InfoOutlined } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { useProcessDetails } from './hooks/useProcessDetails';
import { ProcessContentList } from '../ProcessContentList/ProcessContentList';
import { ProcessViewer } from '../ProcessViewer';
import { getXmlContentQuery } from '../../../api/contents/contents.queries';
import {
  deriveRaciMatrixFromXml,
} from '../../../extensions/raci-viewer';
import { analyzeRaciMatrix } from '../../../extensions/raci-engine';
import { ConditionalRender } from '../../../Components/GenericComponents/ConditionalRender/ConditionalRender';
import { DropZone } from '../../../Components/GenericComponents/DropZone/DropZone';

import './ProcessDetails.scss';

type ProcessDetailsProps = {
  resourceId: string;
  onContentUpload: (content: string) => void;
  onContentPublish: (contentId: string) => void;
  onContentErase: (contentId: string) => void;
  onContentClone: (contentId: string) => void;
  onContentViewerLinkCopy: (content: string) => void;
  onCompareClick: (leftContentId: string, rightContentId: string) => void;
  selectedElementId?: string | null;
  onElementSelect?: (elementId: string) => void;
};

export const ProcessDetails = ({
  resourceId,
  onContentUpload,
  onContentPublish,
  onContentErase,
  onContentClone,
  onContentViewerLinkCopy,
  onCompareClick,
  selectedElementId,
  onElementSelect,
}: ProcessDetailsProps) => {
  const {
    contents,
    isLoading,
    draftContent,
    publishedContent,
    isCompareDisabled,
    contentIdsToCompare,
    onFilesUploaded,
    onContentChecked,
  } = useProcessDetails(resourceId, { onContentUpload });

  const xmlContentQuery = getXmlContentQuery(
    resourceId,
    publishedContent?.id ?? '',
  );
  const { data: xmlContent } = useQuery(
    xmlContentQuery.queryKey,
    xmlContentQuery.queryFn,
    { enabled: Boolean(publishedContent) },
  );

  const raciMatrix = useMemo(
    () =>
      xmlContent
        ? deriveRaciMatrixFromXml(xmlContent)
        : { roles: [], activities: [] },
    [xmlContent],
  );

  const raciAnalysis = useMemo(
    () => analyzeRaciMatrix(raciMatrix),
    [raciMatrix],
  );

  const [taskPanelCollapsed, setTaskPanelCollapsed] = useState(false);
  const [taskPanelSection, setTaskPanelSection] = useState<'details' | 'documentation' | 'raci'>('details');

  const selectedTask = useMemo(() => {
    if (!xmlContent || !selectedElementId) return null;

    const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
    if (document.getElementsByTagName('parsererror').length > 0) return null;

    const element = Array.from(document.getElementsByTagName('*')).find(
      candidate => candidate.getAttribute('id') === selectedElementId,
    );
    if (!element) return null;

    const documentation = Array.from(element.children)
      .filter(child => child.localName === 'documentation')
      .map(child => (child.textContent ?? '').trim())
      .filter(Boolean);

    return {
      id: selectedElementId,
      name: element.getAttribute('name')?.trim() || selectedElementId,
      type: element.localName,
      documentation,
    };
  }, [xmlContent, selectedElementId]);

  const selectedTaskRaci = useMemo(
    () => raciMatrix.activities.find(activity => activity.elementId === selectedElementId),
    [raciMatrix.activities, selectedElementId],
  );

  if (isLoading) {
    return (
      <Stack gap={2}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="rectangular" height={200} />
      </Stack>
    );
  }

  return (
    <Box className="processViewerLayout">
      <Tabs defaultValue={0} className="processViewerTabs">
        <TabList sticky="top">
          <Tab value={0}>Process view</Tab>
          <Tab value={1}>Version history</Tab>
          <Tab value={2}>RACI</Tab>
        </TabList>

        <TabPanel value={0} className="processViewerTabPanel processViewerProcessTab">
          <Box className="processViewerWorkspace">
          <Sheet className="processViewerDiagram" variant="outlined">
            {publishedContent ? (
              <>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  className="processViewerDiagramHeader"
                >
                  <Stack spacing={0.25}>
                    <Typography level="title-md">
                      Published version v{publishedContent.version ?? 'N/A'}
                    </Typography>
                    <Typography level="body-xs" textColor="neutral">
                      Published by {publishedContent.updatedBy}
                    </Typography>
                  </Stack>
                  <IconButton
                    title="Copy link"
                    variant="plain"
                    color="neutral"
                    size="sm"
                    onClick={() => onContentViewerLinkCopy(publishedContent.id)}
                  >
                    <FileCopy />
                  </IconButton>
                </Stack>
                <Divider />
                <Box className="processViewerCanvas">
                  <ProcessViewer
                    resourceId={resourceId}
                    contentId={publishedContent.id}
                    selectedElementId={selectedElementId}
                    onElementSelect={onElementSelect}
                  />
                </Box>
              </>
            ) : (
              <Stack spacing={2} padding={2}>
                <Typography level="title-md">No published version</Typography>
                <ConditionalRender condition={Boolean(!contents.length)}>
                  <DropZone onFileUploaded={onFilesUploaded} />
                </ConditionalRender>
              </Stack>
            )}
          </Sheet>

          {publishedContent && (
            <Sheet
              className={`processTaskPanel ${taskPanelCollapsed ? 'collapsed' : ''}`}
              variant="outlined"
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent={taskPanelCollapsed ? 'center' : 'space-between'}
                className="processTaskPanelHeader"
              >
                {!taskPanelCollapsed && (
                  <Typography level="title-sm">Fiche de la tâche</Typography>
                )}
                <IconButton
                  size="sm"
                  variant="plain"
                  color="neutral"
                  onClick={() => setTaskPanelCollapsed(value => !value)}
                  aria-label={taskPanelCollapsed ? 'Développer le panneau de tâche' : 'Replier le panneau de tâche'}
                  title={taskPanelCollapsed ? 'Développer le panneau' : 'Replier le panneau'}
                >
                  {taskPanelCollapsed ? <ChevronLeft /> : <ChevronRight />}
                </IconButton>
              </Stack>

              {!taskPanelCollapsed && (
                <Stack spacing={1.5} className="processTaskPanelContent">
                  {selectedTask ? (
                    <>
                      <Box>
                        <Typography level="title-lg">{selectedTask.name}</Typography>
                        <Typography level="body-xs" textColor="neutral">
                          {selectedTask.type} · {selectedTask.id}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <Button
                          size="sm"
                          variant={taskPanelSection === 'details' ? 'soft' : 'plain'}
                          color={taskPanelSection === 'details' ? 'primary' : 'neutral'}
                          startDecorator={<InfoOutlined />}
                          onClick={() => setTaskPanelSection('details')}
                        >
                          Fiche
                        </Button>
                        <Button
                          size="sm"
                          variant={taskPanelSection === 'documentation' ? 'soft' : 'plain'}
                          color={taskPanelSection === 'documentation' ? 'primary' : 'neutral'}
                          startDecorator={<DescriptionOutlined />}
                          onClick={() => setTaskPanelSection('documentation')}
                        >
                          Documentation
                        </Button>
                        <Button
                          size="sm"
                          variant={taskPanelSection === 'raci' ? 'soft' : 'plain'}
                          color={taskPanelSection === 'raci' ? 'primary' : 'neutral'}
                          startDecorator={<GroupsOutlined />}
                          onClick={() => setTaskPanelSection('raci')}
                        >
                          RACI
                        </Button>
                      </Stack>
                      <Divider />

                      {taskPanelSection === 'details' && (
                        <Stack spacing={1}>
                          <Typography level="title-sm">Informations</Typography>
                          <Typography level="body-sm">
                            Type BPMN : {selectedTask.type}
                          </Typography>
                          <Typography level="body-sm">
                            Documentation : {selectedTask.documentation.length ? 'disponible' : 'non renseignée'}
                          </Typography>
                          <Typography level="body-xs" textColor="neutral">
                            Sélectionnez Documentation ou RACI pour consulter les informations associées à cette tâche.
                          </Typography>
                        </Stack>
                      )}

                      {taskPanelSection === 'documentation' && (
                        <Stack spacing={1}>
                          <Typography level="title-sm">Documentation associée</Typography>
                          {selectedTask.documentation.length ? (
                            selectedTask.documentation.map((entry, index) => (
                              <Sheet key={index} variant="soft" sx={{ p: 1, borderRadius: 'sm' }}>
                                <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {entry}
                                </Typography>
                              </Sheet>
                            ))
                          ) : (
                            <Typography level="body-sm" textColor="neutral">
                              Aucune documentation n'est renseignée dans le modèle BPMN pour cette tâche.
                            </Typography>
                          )}
                        </Stack>
                      )}

                      {taskPanelSection === 'raci' && (
                        <Stack spacing={1}>
                          <Typography level="title-sm">Rôles RACI associés</Typography>
                          {selectedTaskRaci?.cells.filter(cell => cell.codes.length).length ? (
                            selectedTaskRaci.cells
                              .filter(cell => cell.codes.length)
                              .map(cell => (
                                <Stack key={cell.role} direction="row" spacing={1} alignItems="center">
                                  <Typography level="body-sm" sx={{ flex: 1 }}>{cell.role}</Typography>
                                  <Typography level="title-sm">{cell.codes.join(' / ')}</Typography>
                                </Stack>
                              ))
                          ) : (
                            <Typography level="body-sm" textColor="neutral">
                              Aucun rôle RACI détecté pour cette tâche.
                            </Typography>
                          )}
                          <Typography level="body-xs" textColor="neutral">
                            R = Réalise · A = Approuve / redevable · C = Consulté · I = Informé
                          </Typography>
                        </Stack>
                      )}
                    </>
                  ) : (
                    <Stack spacing={1}>
                      <Typography level="title-md">Aucune tâche sélectionnée</Typography>
                      <Typography level="body-sm" textColor="neutral">
                        Sélectionnez une tâche dans le diagramme ou dans l'arborescence de gauche pour afficher sa fiche, sa documentation et son RACI.
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
            </Sheet>
          )}
          </Box>
        </TabPanel>

        <TabPanel value={1} className="processViewerTabPanel">
          <Sheet className="processViewerInfo" variant="outlined">
            <Stack spacing={1.5} className="processViewerInfoHeader">
              <Typography level="title-lg">Version history</Typography>
              {publishedContent && (
                <Typography level="body-sm">
                  Last published version: v{publishedContent.version ?? 'N/A'} —{' '}
                  {publishedContent.updatedBy}
                </Typography>
              )}
            </Stack>
            <Divider />
            <Stack spacing={1} padding={1}>
              <ConditionalRender condition={Boolean(draftContent) || Boolean(publishedContent)}>
                <Stack direction="row" justifyContent="flex-end">
                  <IconButton
                    title="Compare"
                    variant="plain"
                    color="neutral"
                    size="sm"
                    disabled={isCompareDisabled}
                    onClick={() =>
                      onCompareClick(contentIdsToCompare[0], contentIdsToCompare[1])
                    }
                  >
                    <Compare />
                  </IconButton>
                </Stack>
                <ProcessContentList
                  contents={contents}
                  onContentChecked={onContentChecked}
                  onContentPublish={onContentPublish}
                  onContentErase={onContentErase}
                  onContentClone={onContentClone}
                />
              </ConditionalRender>

              <ConditionalRender condition={Boolean(!contents.length)}>
                <DropZone onFileUploaded={onFilesUploaded} />
              </ConditionalRender>
            </Stack>
          </Sheet>
        </TabPanel>

        <TabPanel value={2} className="processViewerTabPanel">
          <Sheet className="processViewerInfo" variant="outlined">
            <Stack spacing={1.5} className="processViewerInfoHeader">
              <Typography level="title-lg">
                Activities ({raciMatrix.activities.length})
              </Typography>
            </Stack>
            <Divider />

            {raciMatrix.activities.length ? (
              <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table
                  aria-label="Matrice RACI en lecture seule"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8 }}>Activité</th>
                      {raciMatrix.roles.map(role => (
                        <th key={role} style={{ padding: 8, minWidth: 100 }}>
                          {role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {raciMatrix.activities.map(activity => {

                      return (
                        <tr key={activity.elementId}>
                          <th
                            style={{
                              textAlign: 'left',
                              padding: 8,
                              verticalAlign: 'top',
                              borderTop: '1px solid #ddd',
                            }}
                          >
                            {activity.activity}
                          </th>
                          {activity.cells.map(cell => (
                            <td
                              key={cell.role}
                              title={cell.codes.length ? cell.codes.join('/') : 'aucun rôle'}
                              style={{
                                padding: 8,
                                textAlign: 'center',
                                verticalAlign: 'top',
                                borderTop: '1px solid #ddd',
                                opacity: cell.codes.length ? 1 : 0.55,
                              }}
                            >
                              <strong>
                                {cell.codes.length ? cell.codes.join('/') : '—'}
                              </strong>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            ) : (
              <Typography level="body-sm" textColor="neutral">
                {publishedContent
                  ? 'Aucune activité BPMN détectée dans ce contenu.'
                  : 'Aucune version publiée.'}
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ p: 1 }}
            >
              <Typography level="body-xs">
                {raciMatrix.roles.length} acteur(s)
              </Typography>
              <Typography
                level="body-xs"
                color={raciAnalysis.issues.length ? 'danger' : 'success'}
              >
                {raciAnalysis.issues.length} anomalie(s)
              </Typography>
            </Stack>

            {raciAnalysis.unusedActors.length > 0 && (
              <Sheet variant="soft" color="warning" sx={{ p: 1 }}>
                <Typography level="title-sm">Acteurs non utilisés</Typography>
                <Typography level="body-xs">
                  {raciAnalysis.unusedActors.join(', ')}
                </Typography>
              </Sheet>
            )}

            <Typography level="body-xs" textColor="neutral" sx={{ p: 1 }}>
              Lecture seule : aucune modification du RACI n'est possible depuis cette vue.
            </Typography>
          </Sheet>
        </TabPanel>
      </Tabs>
    </Box>
  );
};
