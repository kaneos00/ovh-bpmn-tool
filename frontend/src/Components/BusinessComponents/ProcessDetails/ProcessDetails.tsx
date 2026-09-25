/* Existing implementation retained below; Git history remains the rollback point. */

import React from 'react';
import {
  Box,
  IconButton,
  List,
  ListItem,
  Divider,
  Textarea,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
} from '@mui/joy';
import { AddComment, Compare, FileCopy } from '@mui/icons-material';

import { useProcessDetails } from './hooks/useProcessDetails';
import { ProcessContentList } from '../ProcessContentList/ProcessContentList';
import { ProcessViewer } from '../ProcessViewer';
import { ConditionalRender } from '../../../Components/GenericComponents/ConditionalRender/ConditionalRender';
import { Card } from '../../../Components/GenericComponents/Card/Card';
import { DropZone } from '../../../Components/GenericComponents/DropZone/DropZone';
import { formatDateTime } from '../../../shared/helpers/date';
import { commentsQuery, createComment } from '../../../api/comments/comments.queries';
import { useQuery, useQueryClient } from 'react-query';

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
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = React.useState('');
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

  const { data: comments = [] } = useQuery(commentsQuery(resourceId));

  const handleCreateComment = async () => {
    const comment = newComment.trim();
    if (!comment) return;
    await createComment(resourceId, { comment });
    setNewComment('');
    await queryClient.invalidateQueries([`resources_comments_${resourceId}`]);
  };

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
          <Tab disabled={!tasks.length}>Activités ({tasks.length})</Tab>
          <Tab>Commentaires ({comments.length})</Tab>
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
        <TabPanel value={2} sx={{ px: 0 }}>
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
        </TabPanel>

        <TabPanel value={3} sx={{ px: 0 }}>
          <Card
            title="Commentaires"
            actions={
              <IconButton
                title="Ajouter un commentaire"
                variant="plain"
                color="neutral"
                size="sm"
                disabled={!newComment.trim()}
                onClick={() => void handleCreateComment()}
              >
                <AddComment />
              </IconButton>
            }
          >
            <Stack spacing={1.5}>
              {comments.length ? comments.map(comment => (
                <Box key={comment.id} sx={{ py: 1 }}>
                  <Typography level="body-sm">{comment.comment}</Typography>
                  <Typography level="body-xs" color="neutral">
                    {comment.createdBy} · {formatDateTime(comment.createdAt)}
                  </Typography>
                  <Divider sx={{ mt: 1.5 }} />
                </Box>
              )) : (
                <Typography level="body-sm" color="neutral">Aucun commentaire.</Typography>
              )}
              <Textarea
                placeholder="Ajouter un commentaire…"
                value={newComment}
                onChange={event => setNewComment(event.target.value)}
                minRows={3}
              />
            </Stack>
          </Card>
        </TabPanel>
      </Tabs>
    </>
  );
};
