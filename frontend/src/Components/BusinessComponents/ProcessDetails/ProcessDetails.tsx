import React, { useMemo } from 'react';
import {
  Box,
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
import { Compare, FileCopy } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { useProcessDetails } from './hooks/useProcessDetails';
import { ProcessContentList } from '../ProcessContentList/ProcessContentList';
import { ProcessViewer } from '../ProcessViewer';
import { ProcessHierarchyTree } from '../ProcessHierarchyTree/ProcessHierarchyTree';
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
};

export const ProcessDetails = ({
  resourceId,
  onContentUpload,
  onContentPublish,
  onContentErase,
  onContentClone,
  onContentViewerLinkCopy,
  onCompareClick,
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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

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
                <Box className="processViewerWorkspace">
                  <Sheet className="processViewerHierarchy" variant="outlined">
                    {xmlContent ? (
                      <ProcessHierarchyTree
                        xmlContent={xmlContent}
                        selectedElementId={selectedElementId}
                        onElementClick={setSelectedElementId}
                      />
                    ) : (
                      <Typography level="body-sm" textColor="neutral" sx={{ p: 2 }}>
                        Chargement de la hiérarchie BPMN…
                      </Typography>
                    )}
                  </Sheet>
                  <Box className="processViewerCanvas">
                    <ProcessViewer
                      resourceId={resourceId}
                      contentId={publishedContent.id}
                      selectedElementId={selectedElementId}
                    />
                  </Box>
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
