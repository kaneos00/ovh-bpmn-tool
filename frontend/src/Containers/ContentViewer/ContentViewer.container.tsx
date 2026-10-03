import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Divider,
  IconButton,
  Sheet,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
  List,
  ListItem,
  Link,
} from '@mui/joy';
import { ChevronLeft, ChevronRight, OpenInNew } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { FolderTree } from '../../Components/BusinessComponents/FolderTree';
import { ProcessViewer } from '../../Components/BusinessComponents/ProcessViewer';
import { useContentViewer } from './hooks/useContentViewer';
import { contentsQuery, getXmlContentQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content } from '../../Types';
import { formatDateTime } from '../../shared/helpers/date';

import './ContentViewerContainer.scss';

const parser = new DOMParser();

const ACTIVITY_TYPES = new Set([
  'task',
  'userTask',
  'serviceTask',
  'manualTask',
  'scriptTask',
  'businessRuleTask',
  'sendTask',
  'receiveTask',
  'callActivity',
  'subProcess',
  'transaction',
]);

const normalizeUrl = (url: string) =>
  /^https?:\\/\\//i.test(url) ? url : `https://${url}`;

export const Component = () => {
  const { resourceId, contentId } = useContentViewer();
  const navigate = useNavigate();
  const [folderOpen, setFolderOpen] = useState(true);

  const { data: contents = [] } = useQuery(contentsQuery(resourceId));
  const { data: xmlContent } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const lastPublishedContent = useMemo(() => {
    return contents
      .filter(({ status }) => status === ContentStatusEnum.Published)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  }, [contents]);

  const activities = useMemo(() => {
    if (!xmlContent) {
      return [];
    }

    const xml = parser.parseFromString(xmlContent, 'text/xml');

    return Array.from(xml.getElementsByTagName('*'))
      .filter(element => ACTIVITY_TYPES.has(element.localName))
      .map((activity, index) => {
        const documentation = Array.from(
          activity.children,
        )
          .filter(child => child.localName === 'documentation')
          .map(child => child.textContent?.trim() || '')
          .filter(Boolean)
          .join('\\n');

        return {
          id: activity.getAttribute('id') || `activity-${index}`,
          name: activity.getAttribute('name') || 'Unnamed activity',
          url: activity.getAttribute('url:link') || '',
          documentation,
        };
      });
  }, [xmlContent]);

  return (
    <Box className="viewerLayout">
      <Sheet
        className={`viewerFolderPanel ${folderOpen ? 'open' : 'collapsed'}`}
        variant="outlined"
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          className="viewerFolderHeader"
        >
          {folderOpen && <Typography level="title-md">Folders</Typography>}
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setFolderOpen(value => !value)}
            title={folderOpen ? 'Collapse folders' : 'Open folders'}
          >
            {folderOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </Stack>

        {folderOpen && (
          <>
            <Divider />
            <Box className="viewerFolderTree">
              <FolderTree
                selectedId={resourceId}
                onNodeClick={id => navigate(`/${id}`)}
              />
            </Box>
          </>
        )}
      </Sheet>

      <Box className="viewerDiagram">
        <ProcessViewer resourceId={resourceId} contentId={contentId} />
      </Box>

      <Sheet className="viewerInfoPanel" variant="outlined">
        <Stack spacing={1.5} className="viewerInfoHeader">
          <Typography level="title-lg">Process information</Typography>

          {lastPublishedContent ? (
            <Stack spacing={0.25}>
              <Typography level="body-sm">
                Last published version: v{lastPublishedContent.version ?? 'N/A'}
              </Typography>
              <Typography level="body-xs" textColor="neutral">
                Modified {formatDateTime(lastPublishedContent.updatedAt)} by{' '}
                {lastPublishedContent.updatedBy}
              </Typography>
            </Stack>
          ) : (
            <Typography level="body-sm" textColor="neutral">
              No published version
            </Typography>
          )}
        </Stack>

        <Divider />

        <Tabs defaultValue={0} className="viewerTabs">
          <TabList sticky="top" variant="plain">
            <Tab value={0}>Version history</Tab>
            <Tab value={1}>Activities ({activities.length})</Tab>
          </TabList>

          <TabPanel value={0} className="viewerTabPanel">
            <Stack spacing={1}>
              {contents.map((content: Content) => (
                <Sheet
                  key={content.id}
                  variant={content.id === contentId ? 'soft' : 'plain'}
                  className="versionItem"
                >
                  <Typography level="title-sm">
                    Version {content.version ?? 'N/A'}
                  </Typography>
                  <Typography level="body-xs">{content.status}</Typography>
                  <Typography level="body-xs" textColor="neutral">
                    Modified {formatDateTime(content.updatedAt)} by{' '}
                    {content.updatedBy}
                  </Typography>
                </Sheet>
              ))}
            </Stack>
          </TabPanel>

          <TabPanel value={1} className="viewerTabPanel">
            {activities.length ? (
              <List size="sm">
                {activities.map(activity => (
                  <ListItem key={activity.id}>
                    <Stack spacing={0.5} sx={{ width: '100%' }}>
                      <Typography level="title-sm">
                        {activity.name}
                      </Typography>

                      {activity.url && (
                        <Link
                          href={normalizeUrl(activity.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          endDecorator={<OpenInNew fontSize="small" />}
                        >
                          {activity.url}
                        </Link>
                      )}

                      {activity.documentation && (
                        <Typography
                          level="body-sm"
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {activity.documentation}
                        </Typography>
                      )}
                    </Stack>
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

Component.displayName = 'ContentViewerContainer';
