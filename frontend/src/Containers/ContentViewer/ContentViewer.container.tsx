import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
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
import {
  ChevronLeft,
  Close,
  FolderOutlined,
  GroupsOutlined,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';

import { FolderTree } from '../../Components/BusinessComponents/FolderTree';
import { UserAccountMenu } from '../../Components/GenericComponents/UserAccountMenu/UserAccountMenu';
import { ProcessViewer } from '../../Components/BusinessComponents/ProcessViewer';
import { Breadcrumbs } from '../../Components/GenericComponents/Breadcrumbs/Breadcrumbs';
import { useBpmnLayoutBreadcrumbs } from '../BpmnLayout/hooks/useBpmnLayoutBreadcrumbs';
import { useContentViewer } from './hooks/useContentViewer';
import { Component as ProjectHomeComponent } from '../ProjectViewer/ProjectViewer.container';
import {
  contentsQuery,
  getXmlContentQuery,
} from '../../api/contents/contents.queries';
import { ContentStatusEnum, type Content } from '../../Types';
import { apiClient } from '../../queryClient';
import { formatDateTime } from '../../shared/helpers/date';
import { deriveRaciMatrixFromXml } from '../../extensions/raci-viewer';
import {
  analyzeRaciMatrix,
  getRaciIssueLabel,
} from '../../extensions/raci-engine';
import type { RaciCode } from '../../extensions/raci-engine';

import './ContentViewerContainer.scss';

type WorkspaceProjectSummary = {
  id: string;
  role: 'viewer' | 'modeler' | 'admin';
  processes: { resourceId: string }[];
};
type WorkspaceSummary = { projects: WorkspaceProjectSummary[] };

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

const ProcessContentViewer = () => {
  const { resourceId, contentId } = useContentViewer();
  const navigate = useNavigate();
  const { getBreadCrumbs } = useBpmnLayoutBreadcrumbs();
  const [searchParams] = useSearchParams();
  const [folderOpen, setFolderOpen] = useState(true);
  const [infoTab, setInfoTab] = useState<0 | 1>(0);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [actorFilter, setActorFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState<RaciCode | ''>('');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedActivityId(searchParams.get('elementId'));
    if (searchParams.get('raci') === '1') {
      setInfoTab(1);
      setInfoPanelOpen(true);
    }
  }, [resourceId, contentId, searchParams]);

  const { data: workspace } = useQuery<WorkspaceSummary>(
    ['my-workspace'],
    () => apiClient.get('/projects/me/workspace'),
  );
  const associatedProject = workspace?.projects.find(project =>
    project.processes.some(process => process.resourceId === resourceId),
  );
  const canOpenModeler = associatedProject?.role === 'admin' || associatedProject?.role === 'modeler';

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
    () =>
      xmlContent
        ? deriveRaciMatrixFromXml(xmlContent)
        : { roles: [], activities: [] },
    [xmlContent],
  );

  const { laneRoleByElement, laneIdByRole } = useMemo(() => {
    const roleByElement = new Map<string, string>();
    const idByRole = new Map<string, string>();
    if (!xmlContent || typeof DOMParser === 'undefined') {
      return { laneRoleByElement: roleByElement, laneIdByRole: idByRole };
    }
    const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
    Array.from(document.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'lane'))
      .forEach(lane => {
        const laneId = lane.getAttribute('id');
        const role = lane.getAttribute('name')?.trim();
        if (!laneId || !role) return;
        roleByElement.set(laneId, role);
        idByRole.set(role, laneId);
        Array.from(lane.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'flowNodeRef'))
          .forEach(reference => {
            const elementId = reference.textContent?.trim();
            if (elementId) roleByElement.set(elementId, role);
          });
      });
    return { laneRoleByElement: roleByElement, laneIdByRole: idByRole };
  }, [xmlContent]);

  const selectedRole = selectedActivityId ? laneRoleByElement.get(selectedActivityId) ?? '' : '';

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
        const actorCell = activity.cells.find(
          cell => cell.role === actorFilter,
        );
        if (!actorCell?.codes.length) return false;
        if (codeFilter && !actorCell.codes.includes(codeFilter)) return false;
      } else if (codeFilter) {
        if (!activity.cells.some(cell => cell.codes.includes(codeFilter)))
          return false;
      }

      return true;
    });
  }, [
    raciMatrix.activities,
    issueByActivity,
    actorFilter,
    codeFilter,
    issuesOnly,
  ]);

  return (
    <Box className={`processViewerWorkspace viewerLayout ${folderOpen ? 'sidebar-open' : 'sidebar-collapsed'} ${infoPanelOpen ? 'info-open' : ''}`}>
      <Sheet
        className={`processTaskPanel viewerFolderPanel ${folderOpen ? 'open' : 'collapsed'}`}
        variant="outlined"
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          className="viewerFolderHeader"
        >
          {folderOpen && (
            <Stack direction="row" spacing={1} alignItems="center">
              <FolderOutlined fontSize="small" />
              <Typography level="title-md">Explorateur</Typography>
            </Stack>
          )}
          <IconButton
            size="sm"
            variant="plain"
            onClick={() => setFolderOpen(value => !value)}
            title={folderOpen ? 'Réduire la navigation' : 'Ouvrir la navigation'}
            aria-label={folderOpen ? 'Réduire la navigation' : 'Ouvrir la navigation'}
          >
            {folderOpen ? <ChevronLeft /> : <MenuIcon />}
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

      <Box className="processViewerDiagram viewerDiagram">
        <Box className="viewerBreadcrumb">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
              <Box
                component="img"
                src="/bpmn-tool-logo.svg"
                alt=""
                sx={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
              />
              <Typography level="title-sm" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                KHI Flows
              </Typography>
              <Box
                component="span"
                title={`Version de build : ${import.meta.env.VITE_BUILD_ID || 'non identifiée'} · Commit : ${import.meta.env.VITE_BUILD_COMMIT || 'non injecté par Coolify'} · Branche : ${import.meta.env.VITE_BUILD_BRANCH || 'non injectée par Coolify'} · CI : ${import.meta.env.VITE_BUILD_RUN_NUMBER || 'non injecté par Coolify'}`}
                aria-label={`Version de build ${(import.meta.env.VITE_BUILD_ID || import.meta.env.VITE_BUILD_COMMIT || 'local').slice(0, 12)}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 0.75,
                  py: 0.2,
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: import.meta.env.VITE_BUILD_COMMIT && import.meta.env.VITE_BUILD_COMMIT !== 'unknown' ? '#5f8ee8' : '#d99a42',
                  bgcolor: import.meta.env.VITE_BUILD_COMMIT && import.meta.env.VITE_BUILD_COMMIT !== 'unknown' ? '#203f72' : '#60451e',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {import.meta.env.VITE_BUILD_RUN_NUMBER && import.meta.env.VITE_BUILD_RUN_NUMBER !== 'unknown'
                  ? `CI #${import.meta.env.VITE_BUILD_RUN_NUMBER}`
                  : 'BUILD'}
                {' · '}
                {(
                  import.meta.env.VITE_BUILD_COMMIT && import.meta.env.VITE_BUILD_COMMIT !== 'unknown'
                    ? import.meta.env.VITE_BUILD_COMMIT
                    : import.meta.env.VITE_BUILD_ID || 'local'
                ).slice(0, 12)}
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
              <Breadcrumbs breadcrumbItems={getBreadCrumbs()} />
              {associatedProject && (
                <Button
                  size="sm"
                  variant="soft"
                  color="neutral"
                  onClick={() => navigate(`/projects/${associatedProject.id}/viewer`)}
                >
                  Accueil du projet
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>
        <ProcessViewer
          resourceId={resourceId}
          contentId={contentId}
          selectedElementId={selectedActivityId}
          onElementSelect={setSelectedActivityId}
          onToggleInfoPanel={() => setInfoPanelOpen(value => !value)}
          infoPanelOpen={infoPanelOpen}
          toolbarExtra={<UserAccountMenu dark={false} />}
        />
      </Box>

      <Sheet className={`processTaskPanel viewerInfoPanel ${infoPanelOpen ? 'open mobile-visible' : ''}`} variant="outlined">
        <Stack spacing={1.5} className="viewerInfoHeader">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography level="title-lg">Informations du processus</Typography>
            <IconButton
              className="viewerInfoClose"
              size="sm"
              variant="plain"
              onClick={() => setInfoPanelOpen(false)}
              aria-label="Fermer le panneau d’informations"
              title="Fermer le panneau d’informations"
            >
              <Close />
            </IconButton>
          </Stack>

          {lastPublishedContent ? (
            <Stack spacing={0.25}>
              <Typography level="body-sm">
                Dernière version publiée : v{lastPublishedContent.version ?? 'N/D'}
              </Typography>
              <Typography level="body-xs" textColor="neutral">
                Modifiée le {formatDateTime(lastPublishedContent.updatedAt)} par{' '}
                {lastPublishedContent.updatedBy}
              </Typography>
            </Stack>
          ) : (
            <Typography level="body-sm" textColor="neutral">
              Aucune version publiée
            </Typography>
          )}
        </Stack>

        <Divider />

        <Tabs value={infoTab} onChange={(_, value) => setInfoTab(value as 0 | 1)} className="viewerTabs">
          <TabList sticky="top" variant="plain">
            <Tab value={0}>Historique des versions</Tab>
            <Tab value={1} sx={{ flexDirection: 'row', gap: 0.75, alignItems: 'center' }}>
              <GroupsOutlined fontSize="small" />
              <span>RACI ({raciMatrix.activities.length})</span>
            </Tab>
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
                    Version {content.version ?? 'N/D'}
                  </Typography>
                  <Typography level="body-xs">{content.status}</Typography>
                  <Typography level="body-xs" textColor="neutral">
                    Modifiée le {formatDateTime(content.updatedAt)} par{' '}
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
                    <option key={actor} value={actor}>
                      {actor}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filtrer par rôle RACI"
                  value={codeFilter}
                  onChange={event =>
                    setCodeFilter(event.target.value as RaciCode | '')
                  }
                >
                  <option value="">Tous les rôles</option>
                  {RACICODES.map(code => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIssuesOnly(value => !value)}
                  aria-pressed={issuesOnly}
                >
                  {issuesOnly
                    ? 'Toutes les activités'
                    : '⚠ Activités à compléter'}
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
                    className="viewerRaciTable"
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
                            background:
                              'var(--joy-palette-background-surface, white)',
                          }}
                        >
                          Activité
                        </th>
                        {raciMatrix.roles.map(role => (
                          <th
                            key={role}
                            className={selectedRole === role ? 'raci-role-column-selected' : undefined}
                            style={{
                              padding: 8,
                              minWidth: 100,
                              position: 'sticky',
                              top: 0,
                              background:
                                'var(--joy-palette-background-surface, white)',
                            }}
                          >
                            <button
                              type="button"
                              className="raciRoleLink"
                              aria-pressed={selectedRole === role}
                              onClick={() => {
                                const laneId = laneIdByRole.get(role);
                                if (laneId) setSelectedActivityId(laneId);
                              }}
                              title={`Sélectionner la lane BPMN correspondant au rôle ${role}`}
                            >
                              {role}
                            </button>
                          </th>
                        ))}
                        <th
                          style={{
                            padding: 8,
                            minWidth: 160,
                            position: 'sticky',
                            top: 0,
                            background:
                              'var(--joy-palette-background-surface, white)',
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
                                aria-pressed={
                                  selectedActivityId === activity.elementId
                                }
                                onClick={() =>
                                  setSelectedActivityId(activity.elementId)
                                }
                                title="Afficher cette activité dans le diagramme BPMN"
                              >
                                {activity.activity}
                              </button>
                            </th>
                            {activity.cells.map(cell => (
                              <td
                                key={cell.role}
                                className={selectedRole === cell.role ? 'raci-role-column-selected' : undefined}
                                title={`${STATUS_LABELS[cell.status]} — ${
                                  cell.codes.length
                                    ? cell.codes.join('/')
                                    : 'aucun rôle'
                                }`}
                                style={{
                                  padding: 8,
                                  textAlign: 'center',
                                  verticalAlign: 'top',
                                  borderTop: '1px solid #ddd',
                                  opacity: cell.codes.length ? 1 : 0.55,
                                }}
                              >
                                <div className="raciCodePills">
                                  {cell.codes.length
                                    ? cell.codes.map(code => (
                                        <span key={code} className={`raciCodePill raciCodePill-${code}`}>{code}</span>
                                      ))
                                    : <span className="raciCodePill raciCodePill-empty">—</span>}
                                </div>
                                <div>
                                  {statusMarker[cell.status]}{' '}
                                  {STATUS_LABELS[cell.status]}
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
                Lecture seule : aucune modification du RACI n’est possible
                depuis le Viewer. ● Explicite · ◐ Inféré · — Manquant.
              </Typography>
            </Stack>
          </TabPanel>
        </Tabs>
      </Sheet>
    </Box>
  );
};

ProcessContentViewer.displayName = 'ProcessContentViewer';

export const Component = () => {
  const { projectId, resourceId, contentId } = useParams<{
    projectId?: string;
    resourceId?: string;
    contentId?: string;
  }>();

  if (projectId && !resourceId && !contentId) {
    return <ProjectHomeComponent />;
  }

  return <ProcessContentViewer />;
};

Component.displayName = 'ContentViewerContainer';
