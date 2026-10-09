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
} from '@mui/joy';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useQuery } from 'react-query';

import { FolderTree } from '../../Components/BusinessComponents/FolderTree';
import { ProcessHierarchyTree } from '../../Components/BusinessComponents/ProcessHierarchyTree/ProcessHierarchyTree';
import { ProcessViewer } from '../../Components/BusinessComponents/ProcessViewer';
import { useContentViewer } from './hooks/useContentViewer';
import { contentsQuery, getXmlContentQuery } from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content } from '../../Types';
import { formatDateTime } from '../../shared/helpers/date';
import { deriveRaciMatrixFromXml } from '../../extensions/raci-viewer';
import { analyzeRaciMatrix, getRaciIssueLabel } from '../../extensions/raci-engine';
import type { RaciCode } from '../../extensions/raci-engine';

import './ContentViewerContainer.scss';

const RACICODES: RaciCode[] = ['R', 'A', 'C', 'I'];
const STATUS_LABELS = {
  explicit: 'Explicite',
  inferred: 'Inféré',
  missing: 'Manquant',
} as const;

const statusMarker = {
  explicit: '●',
  inferred: '◐',
  missing: '—',
} as const;

export const Component = () => {
  const { resourceId, contentId } = useContentViewer();
  const navigate = useNavigate();
  const [folderOpen, setFolderOpen] = useState(true);
  const [actorFilter, setActorFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState<RaciCode | ''>('');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const { data: contents = [] } = useQuery(contentsQuery(resourceId));
  const { data: xmlContent } = useQuery(
    getXmlContentQuery(resourceId, contentId),
  );

  const lastPublishedContent = useMemo(() => {
    return contents
      .filter(({ status }) => status === ContentStatusEnum.Published)
      .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  }, [contents]);

  const raciMatrix = useMemo(
    () => (xmlContent ? deriveRaciMatrixFromXml(xmlContent) : { roles: [], activities: [] }),
    [xmlContent],
  );

  const raciAnalysis = useMemo(
    () => analyzeRaciMatrix(raciMatrix),
    [raciMatrix],
  );

  const issueByActivity = useMemo(
    () => new Map(raciAnalysis.issues.map(issue => [issue.activityId, issue])),
    [raciAnalysis],
  );

  const filteredActivities = useMemo(() => {
    return raciMatrix.activities.filter(activity => {
      const issue = issueByActivity.get(activity.elementId);

      if (issuesOnly && !issue) return false;

      if (actorFilter) {
        const actorCell = activity.cells.find(cell => cell.role === actorFilter);
        if (!actorCell?.codes.length) return false;
        if (codeFilter && !actorCell.codes.includes(codeFilter)) return false;
      } else if (codeFilter) {
        if (!activity.cells.some(cell => cell.codes.includes(codeFilter))) return false;
      }

      return true;
    });
  }, [raciMatrix.activities, issueByActivity, actorFilter, codeFilter, issuesOnly]);

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
              <Divider sx={{ my: 1 }} />
              <ProcessHierarchyTree
                xmlContent={xmlContent ?? ''}
                selectedElementId={selectedActivityId}
                onElementClick={setSelectedActivityId}
              />
            </Box>
          </>
        )}
      </Sheet>

      <Box className="viewerDiagram">
        <ProcessViewer resourceId={resourceId} contentId={contentId} selectedElementId={selectedActivityId} />
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
            <Tab value={1}>RACI ({raciMatrix.activities.length})</Tab>
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
            <Stack spacing={1.5} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <select
                  aria-label="Filtrer par acteur"
                  value={actorFilter}
                  onChange={event => setActorFilter(event.target.value)}
                >
                  <option value="">Tous les acteurs</option>
                  {raciMatrix.roles.map(actor => (
                    <option key={actor} value={actor}>{actor}</option>
                  ))}
                </select>

                <select
                  aria-label="Filtrer par rôle RACI"
                  value={codeFilter}
                  onChange={event => setCodeFilter(event.target.value as RaciCode | '')}
                >
                  <option value="">Tous les rôles</option>
                  {RACICODES.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIssuesOnly(value => !value)}
                  aria-pressed={issuesOnly}
                >
                  {issuesOnly ? 'Toutes les activités' : '⚠ Activités à compléter'}
                </button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography level="body-xs">
                  {raciMatrix.activities.length} activité(s)
                </Typography>
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

              {filteredActivities.length ? (
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
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 8,
                            position: 'sticky',
                            top: 0,
                            background: 'var(--joy-palette-background-surface, white)',
                          }}
                        >
                          Activité
                        </th>
                        {raciMatrix.roles.map(role => (
                          <th
                            key={role}
                            style={{
                              padding: 8,
                              minWidth: 100,
                              position: 'sticky',
                              top: 0,
                              background: 'var(--joy-palette-background-surface, white)',
                            }}
                          >
                            {role}
                          </th>
                        ))}
                        <th
                          style={{
                            padding: 8,
                            minWidth: 160,
                            position: 'sticky',
                            top: 0,
                            background: 'var(--joy-palette-background-surface, white)',
                          }}
                        >
                          Contrôle
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map(activity => {
                        const issue = issueByActivity.get(activity.elementId);

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
                              <button
                                type="button"
                                className="raciActivityLink"
                                aria-pressed={selectedActivityId === activity.elementId}
                                onClick={() => setSelectedActivityId(activity.elementId)}
                                title="Afficher cette activité dans le diagramme BPMN"
                              >
                                {activity.activity}
                              </button>
                            </th>
                            {activity.cells.map(cell => (
                              <td
                                key={cell.role}
                                title={`${STATUS_LABELS[cell.status]} — ${cell.codes.length ? cell.codes.join('/') : 'aucun rôle'}`}
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
                                <div>
                                  {statusMarker[cell.status]} {STATUS_LABELS[cell.status]}
                                </div>
                              </td>
                            ))}
                            <td
                              style={{
                                padding: 8,
                                verticalAlign: 'top',
                                borderTop: '1px solid #ddd',
                              }}
                            >
                              {issue
                                ? issue.codes.map(code => (
                                    <div key={code}>
                                      ⚠ {getRaciIssueLabel(code)}
                                    </div>
                                  ))
                                : '✓ OK'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              ) : (
                <Typography level="body-sm" textColor="neutral">
                  {raciMatrix.activities.length
                    ? 'Aucune activité ne correspond aux filtres.'
                    : 'Aucune activité BPMN détectée dans ce contenu.'}
                </Typography>
              )}

              {raciAnalysis.unusedActors.length > 0 && (
                <Sheet variant="soft" color="warning" sx={{ p: 1 }}>
                  <Typography level="title-sm">Acteurs non utilisés</Typography>
                  <Typography level="body-xs">
                    {raciAnalysis.unusedActors.join(', ')}
                  </Typography>
                </Sheet>
              )}

              <Typography level="body-xs" textColor="neutral">
                Lecture seule : aucune modification du RACI n'est possible depuis le Viewer.
                {' '}● Explicite · ◐ Inféré · — Manquant.
              </Typography>
            </Stack>
          </TabPanel>
        </Tabs>

      </Sheet>
    </Box>
  );
};

Component.displayName = 'ContentViewerContainer';
