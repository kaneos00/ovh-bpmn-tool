import React from 'react';
import {
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
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

import { useProcessDetails } from './hooks/useProcessDetails';
import { ProcessContentList } from '../ProcessContentList/ProcessContentList';
import { ProcessViewer } from '../ProcessViewer';
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
    tasks,
    isCompareDisabled,
    contentIdsToCompare,
    onFilesUploaded,
    onContentChecked,
  } = useProcessDetails(resourceId, { onContentUpload });

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
      <Sheet className="processViewerDiagram" variant="outlined">
        {publishedContent ? (
          <>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              className="processViewerDiagramHeader"
            >
              <Typography level="title-md">
                Published version v{publishedContent.version ?? 'N/A'}
              </Typography>
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

      <Sheet className="processViewerInfo" variant="outlined">
        <Stack spacing={1.5} className="processViewerInfoHeader">
          <Typography level="title-lg">Process information</Typography>
          {publishedContent ? (
            <Typography level="body-sm">
              Last published version: v{publishedContent.version ?? 'N/A'}
            </Typography>
          ) : (
            <Typography level="body-sm" textColor="neutral">
              No published version
            </Typography>
          )}
        </Stack>

        <Divider />

        <Tabs defaultValue={0} className="processViewerTabs">
          <TabList sticky="top">
            <Tab value={0}>Version history</Tab>
            <Tab value={1}>Activities ({tasks.length})</Tab>
          </TabList>

          <TabPanel value={0} className="processViewerTabPanel">
            <Stack spacing={1}>
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
          </TabPanel>

          <TabPanel value={1} className="processViewerTabPanel">
            {tasks.length ? (
              <List>
                {tasks.map((task, index) => (
                  <ListItem key={`task_${index.toString()}`}>
                    {task.getAttribute('name')}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography level="body-sm" textColor="neutral">
                No activities found
              </Typography>
            )}
          </TabPanel>
        </Tabs>
      </Sheet>
    </Box>
  );
};
