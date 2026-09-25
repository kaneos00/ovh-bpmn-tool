/* Existing implementation retained below; Git history remains the rollback point. */

import React from 'react';
import {
  Box,
  IconButton,
  List,
  ListItem,
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
import { Card } from '../../../Components/GenericComponents/Card/Card';
import { DropZone } from '../../../Components/GenericComponents/DropZone/DropZone';
import { formatDateTime } from '../../../shared/helpers/date';

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
  } = useProcessDetails(resourceId, {
    onContentUpload,
  });

  if (isLoading) {
    return (
      <Stack gap={2}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="rectangular" height={200} />
      </Stack>
    );
  }

  return (
    <>
      <Tabs defaultValue={0} sx={{ width: '100%' }}>
        <TabList>
          <Tab>Processus</Tab>
          <Tab disabled={!contents.length}>Historique des versions</Tab>
        </TabList>

        <TabPanel value={0} sx={{ px: 0 }}>
          <ConditionalRender condition={Boolean(publishedContent)}>
            <Card
              title={`Dernière version publiée : v${publishedContent?.version ?? 'N/A'}`}
              actions={
                <IconButton
                  title="Copier le lien"
                  variant="plain"
                  color="neutral"
                  size="sm"
                  sx={{ position: 'absolute', top: '0.875rem', right: '0.5rem' }}
                  onClick={() =>
                    publishedContent &&
                    onContentViewerLinkCopy(publishedContent.id)
                  }
                >
                  <FileCopy />
                </IconButton>
              }
            >
              <Stack spacing={0.5} marginTop={1} marginBottom={2}>
                <Typography level="body-sm" color="neutral">
                  Publié le {formatDateTime(publishedContent?.updatedAt ?? '')}
                  {' '}par {publishedContent?.updatedBy || publishedContent?.createdBy || 'N/A'}
                </Typography>
              </Stack>

              <Box height="65vh">
                <ProcessViewer
                  resourceId={resourceId}
                  contentId={publishedContent?.id as string}
                />
              </Box>
            </Card>
          </ConditionalRender>

          <ConditionalRender condition={Boolean(!contents.length)}>
            <Card title="Importer un brouillon">
              <DropZone onFileUploaded={onFilesUploaded} />
            </Card>
          </ConditionalRender>
        </TabPanel>

        <TabPanel value={1} sx={{ px: 0 }}>
          <ConditionalRender condition={Boolean(draftContent) || Boolean(publishedContent)}>
            <Card
              title="Historique des versions"
              actions={
                <IconButton
                  title="Comparer"
                  variant="plain"
                  color="neutral"
                  size="sm"
                  disabled={isCompareDisabled}
                  sx={{ position: 'absolute', top: '0.875rem', right: '0.5rem' }}
                  onClick={() =>
                    onCompareClick(contentIdsToCompare[0], contentIdsToCompare[1])
                  }
                >
                  <Compare />
                </IconButton>
              }
            >
              <ProcessContentList
                contents={contents}
                onContentChecked={onContentChecked}
                onContentPublish={onContentPublish}
                onContentErase={onContentErase}
                onContentClone={onContentClone}
              />
            </Card>
          </ConditionalRender>
        </TabPanel>
      </Tabs>

      <ConditionalRender condition={Boolean(tasks.length)}>
        <Card accordion title={`Activités (${tasks.length})`}>
          <List>
            {tasks.map((task, index) => (
              <ListItem key={`task_${index.toString()}`}>
                {task.getAttribute('name')}
              </ListItem>
            ))}
          </List>
        </Card>
      </ConditionalRender>
    </>
  );
};
