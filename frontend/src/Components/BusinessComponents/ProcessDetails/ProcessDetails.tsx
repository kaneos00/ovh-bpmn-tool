import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Alert,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Checkbox,
  Divider,
  IconButton,
  Input,
  Sheet,
  Skeleton,
  Stack,
  Select,
  Option,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  Typography,
} from '@mui/joy';
import { Compare, FileCopy, ChevronLeft, ChevronRight, EditOutlined, CenterFocusStrong } from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';

import { useProcessDetails } from './hooks/useProcessDetails';
import { ProcessContentList } from '../ProcessContentList/ProcessContentList';
import { ProcessViewer } from '../ProcessViewer';
import { ViewerExplorerPanel } from '../ViewerExplorerPanel/ViewerExplorerPanel';
import { contentsQuery, getXmlContentQuery, saveContent, updateContentComment } from '../../../api/contents/contents.queries';
import {
  resourceSharesQuery,
  updateResource,
  getResourceQuery,
} from '../../../api/resources/resources.queries';
import { useResource } from '../../../shared/hooks/useResource';
import { useSnackbar } from '../../../shared/hooks/useSnackbar';
import {
  deriveRaciMatrixFromXml,
} from '../../../extensions/raci-viewer';
import { analyzeRaciMatrix, type RaciCode } from '../../../extensions/raci-engine';
import { ConditionalRender } from '../../../Components/GenericComponents/ConditionalRender/ConditionalRender';
import { DropZone } from '../../../Components/GenericComponents/DropZone/DropZone';
import { ContentStatusEnum } from '../../../Types';
import { apiClient } from '../../../queryClient';

import '../../../raci.css';
import { DataInventory } from './DataInventory';
import './ProcessDetails.scss';

type ProcessDetailsProps = {
  resourceId: string;
  onContentUpload: (content: string) => void;
  onContentPublish: (contentId: string) => void;
  onContentErase: (contentId: string) => void;
  onContentClone: (contentId: string) => void;
  onContentViewerLinkCopy: (content: string) => void;
  onModelerClick: () => void;
  onCompareClick: (leftContentId: string, rightContentId: string) => void;
  selectedElementId?: string | null;
  onElementSelect?: (elementId: string) => void;
  selectedContentId?: string | null;
  readOnlyShell?: boolean;
  requestedRaciView?: boolean;
  projectId?: string | null;
  projectRole?: 'viewer' | 'modeler' | 'admin' | null;
};

const PROCESS_METADATA_NS = 'https://ovh-bpmn-tool.local/schema/process-metadata';
const PROCESS_TYPES = [
  { value: 'management', label: 'Management', color: 'primary' as const },
  { value: 'projet', label: 'Projet', color: 'primary' as const },
  { value: 'operationnel', label: 'Opérationnel', color: 'success' as const },
  { value: 'support', label: 'Support', color: 'neutral' as const },
  { value: 'pilotage', label: 'Pilotage', color: 'warning' as const },
  { value: 'surveillance', label: 'Surveillance', color: 'danger' as const },
  { value: 'risques-prevention', label: 'Risques / prévention', color: 'warning' as const },
];

const getContentStatusColor = (status: ContentStatusEnum) => {
  if (status === ContentStatusEnum.Published) return 'success' as const;
  if (status === ContentStatusEnum.Draft) return 'warning' as const;
  return 'neutral' as const;
};

const getContentStatusLabel = (status: ContentStatusEnum) => {
  if (status === ContentStatusEnum.Published) return 'Publiée';
  if (status === ContentStatusEnum.Draft) return 'Brouillon';
  return 'Obsolète';
};

const getRaciCellStatusClass = (status: string) => {
  if (status === 'explicit') return 'raci-status-explicit';
  if (status === 'inferred') return 'raci-status-inferred';
  return 'raci-status-missing';
};

const getRaciCellStatusLabel = (status: string) => {
  if (status === 'explicit') return 'Explicite';
  if (status === 'inferred') return 'Inféré';
  return 'Manquant';
};

const getElementTypeDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    task: 'Tâche générique : représente une activité à réaliser dans le processus.',
    userTask: 'Tâche utilisateur : représente une action réalisée par une personne avec l’aide d’une application.',
    manualTask: 'Tâche manuelle : représente une action réalisée par une personne sans automatisation par le moteur.',
    serviceTask: 'Tâche de service : représente une action exécutée automatiquement par un service ou une application.',
    scriptTask: 'Tâche script : représente l’exécution automatique d’un script.',
    businessRuleTask: 'Tâche de règle métier : représente l’évaluation de règles métier.',
    sendTask: 'Tâche d’envoi : représente l’envoi d’un message à un participant.',
    receiveTask: 'Tâche de réception : représente l’attente ou la réception d’un message.',
    exclusiveGateway: 'Passerelle exclusive : permet de choisir un seul chemin parmi plusieurs possibilités, selon une condition.',
    inclusiveGateway: 'Passerelle inclusive : permet d’activer un ou plusieurs chemins selon les conditions.',
    parallelGateway: 'Passerelle parallèle : permet de lancer plusieurs chemins en parallèle ou de synchroniser leur arrivée.',
    eventBasedGateway: 'Passerelle événementielle : dirige le processus selon le premier événement qui survient.',
    complexGateway: 'Passerelle complexe : représente une règle de divergence ou de synchronisation plus élaborée.',
    startEvent: 'Événement de début : indique le déclenchement du processus ou du sous-processus.',
    endEvent: 'Événement de fin : indique la fin du chemin de processus.',
    intermediateCatchEvent: 'Événement intermédiaire d’attente : représente l’attente d’un événement, d’un message ou d’une échéance.',
    intermediateThrowEvent: 'Événement intermédiaire émis : représente la production d’un événement ou l’envoi d’un signal ou message.',
    boundaryEvent: 'Événement de bordure : interrompt ou accompagne une activité lorsqu’un événement survient.',
    subProcess: 'Sous-processus : regroupe plusieurs étapes dans une activité détaillée.',
    callActivity: 'Activité d’appel : appelle un processus ou une activité réutilisable définie séparément.',
    transaction: 'Transaction : regroupe des activités devant être traitées comme une transaction.',
    participant: 'Participant : représente un acteur ou une organisation prenant part à la collaboration.',
    lane: 'Couloir (lane) : regroupe les activités prises en charge par un rôle, une équipe ou un participant.',
    dataObject: 'Objet de données : représente une information utilisée ou produite par le processus.',
    dataObjectReference: 'Référence à un objet de données : indique où une donnée est utilisée ou produite.',
    dataStoreReference: 'Référence à un stockage de données : représente des données conservées au-delà d’une instance du processus.',
    sequenceFlow: 'Flux de séquence : indique l’ordre d’exécution entre les éléments du processus.',
    messageFlow: 'Flux de message : représente un échange de message entre participants distincts.',
    textAnnotation: 'Annotation textuelle : ajoute une précision documentaire au diagramme.',
  };

  return descriptions[type] ?? 'Élément BPMN : représente une étape, un événement, une décision ou un échange dans le processus.';
};

const getElementTypeBadgeColor = (type: string) => {
  if (type === 'startEvent') return 'success';
  if (type === 'endEvent') return 'danger';
  if (type.toLowerCase().includes('gateway')) return 'neutral';
  if (type === 'callActivity' || type === 'subProcess' || type === 'transaction') return 'primary';
  if (type.toLowerCase().includes('data')) return 'warning';
  return 'primary';
};

export const ProcessDetails = ({
  resourceId,
  onContentUpload,
  onContentPublish,
  onContentErase,
  onContentClone,
  onContentViewerLinkCopy,
  onModelerClick,
  onCompareClick,
  selectedElementId,
  onElementSelect,
  selectedContentId,
  readOnlyShell = false,
  requestedRaciView = false,
  projectId = null,
  projectRole = null,
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

  // An explicit contentId is authoritative: never silently show the latest
  // published version when a requested historical version is missing or invalid.
  const viewerContent = selectedContentId
    ? contents.find(
        content => content.id === selectedContentId && content.status !== ContentStatusEnum.Draft,
      )
    : publishedContent;
  const isHistoricalView = Boolean(
    selectedContentId && (!viewerContent || viewerContent.id !== publishedContent?.id),
  );
  const xmlContentQuery = getXmlContentQuery(
    resourceId,
    viewerContent?.id ?? '',
  );
  const { data: xmlContent } = useQuery(
    xmlContentQuery.queryKey,
    xmlContentQuery.queryFn,
    { enabled: Boolean(viewerContent) },
  );
  const queryClient = useQueryClient();
  const { data: remarkPermission } = useQuery<{
    associated: boolean;
    isMember: boolean;
    canSubmitRemarks: boolean;
    usage: 'common' | 'variant' | 'project-specific' | null;
  }>(
    ['viewer-remark-permission', projectId, resourceId],
    () => apiClient.get(`/projects/${projectId}/processes/${resourceId}/remark-permission`),
    { enabled: Boolean(projectId && viewerContent) },
  );
  const { data: activeProposal } = useQuery<{
    id: string;
    status: string;
    cloneResourceId: string;
    validatorUserId?: string | null;
  } | null>(
    ['active-process-change-proposal', projectId, resourceId, viewerContent?.id],
    () => apiClient.get(`/projects/${projectId}/processes/${resourceId}/change-proposals/active?contentId=${viewerContent?.id}`),
    { enabled: Boolean(projectId && viewerContent?.id) },
  );
  type ProposalRemark = {
    id: string;
    elementId: string;
    authorUserId: string;
    authorName?: string;
    decisionByName?: string | null;
    comment: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    decisionBy: string | null;
    decidedAt: string | null;
    decisionComment: string | null;
  };
  const { data: proposalRemarks = [], isLoading: proposalRemarksLoading, error: proposalRemarksError } =
    useQuery<ProposalRemark[]>(
      ['process-change-proposal-comments', activeProposal?.id],
      () => apiClient.get(`/projects/process-change-proposals/${activeProposal!.id}/comments`),
      { enabled: Boolean(activeProposal?.id) },
    );
  const { data: proposalsToReview = [] } = useQuery<Array<{ id: string; status: string }>>(
    ['process-change-proposals-to-review'],
    () => apiClient.get('/projects/me/process-change-proposals/to-review'),
    { enabled: Boolean(projectId) },
  );
  const canSubmitProcessRemark = Boolean(
    projectId && remarkPermission?.associated && remarkPermission.canSubmitRemarks &&
    viewerContent && publishedContent?.id === viewerContent.id && !isHistoricalView,
  );
  const canReviewActiveProposal = Boolean(
    activeProposal && proposalsToReview.some(proposal => proposal.id === activeProposal.id),
  );
  const submitProcessRemark = async (comment: string) => {
    if (!projectId || !canSubmitProcessRemark || !selectedElementId || !comment.trim() || submittingRemark) return;
    setSubmittingRemark(true);
    setRemarkError(null);
    setRemarkWarning(null);
    try {
      const metadataDocument = new DOMParser().parseFromString(xmlContent ?? '', 'application/xml');
      const processMetadata = Array.from(metadataDocument.getElementsByTagNameNS(PROCESS_METADATA_NS, 'processMetadata'))[0];
      const pilotIdentifier = processMetadata?.getAttribute('pilot')?.trim() || undefined;
      const result = await apiClient.post(
        `/projects/${projectId}/processes/${resourceId}/change-proposals`,
        { elementId: selectedElementId, comment: comment.trim(), validatorUserId: pilotIdentifier },
      );
      setRemarkWarning(result?.validatorWarning ?? null);
      if (result?.id) {
        queryClient.setQueryData(
          ['active-process-change-proposal', projectId, resourceId, viewerContent?.id],
          { id: result.id, status: result.status ?? 'submitted', cloneResourceId: result.cloneResourceId },
        );
        if (result.comment?.id) {
          queryClient.setQueryData<ProposalRemark[]>(
            ['process-change-proposal-comments', result.id],
            previous => [...(previous ?? []), result.comment],
          );
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['process-change-proposals-to-review'] }),
        queryClient.invalidateQueries(contentsQuery(resourceId).queryKey),
      ]);
      setRemarkModalOpen(false);
      setActiveViewerTab(5);
    } catch (error) {
      setRemarkError(error instanceof Error ? error.message : 'Impossible de déposer la remarque.');
    } finally {
      setSubmittingRemark(false);
    }
  };
  const { resource: processResource } = useResource(resourceId);
  const { data: resourceShares } = useQuery(resourceSharesQuery(resourceId));
  const { showAlert } = useSnackbar();
  const [sessionRole, setSessionRole] = useState<'admin' | 'modeler' | 'viewer' | null>(null);
  const [activeViewerTab, setActiveViewerTab] = useState(0);
  const [remarkModalOpen, setRemarkModalOpen] = useState(false);
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const [remarkWarning, setRemarkWarning] = useState<string | null>(null);

  // A deep link may explicitly open the RACI workspace. Otherwise keep the
  // current tab when the user navigates between processes or versions.
  // Do not reset to the BPMN tab when the route query disappears after navigation.
  useEffect(() => {
    if (requestedRaciView) setActiveViewerTab(3);
  }, [requestedRaciView]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [raciDraft, setRaciDraft] = useState<Record<string, RaciCode[]>>({});
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isEditingProcessDescription, setIsEditingProcessDescription] = useState(false);
  const [processDescriptionDraft, setProcessDescriptionDraft] = useState('');
  const [isSavingProcessDescription, setIsSavingProcessDescription] = useState(false);
  const [changeCommentDrafts, setChangeCommentDrafts] = useState<Record<string, string>>({});
  const [editingChangeCommentId, setEditingChangeCommentId] = useState<string | null>(null);
  const [savingChangeCommentId, setSavingChangeCommentId] = useState<string | null>(null);
  const [processMetadata, setProcessMetadata] = useState({ processType: '', pilot: '', surveillance: '', riskPrevention: '' });
  const canEditDescription = !isHistoricalView && (sessionRole === 'admin' || sessionRole === 'modeler');
  const canManageVersions = !isHistoricalView && (sessionRole === 'admin' || sessionRole === 'modeler');

  useEffect(() => {
    if (!xmlContent) { setProcessMetadata({ processType: '', pilot: '', surveillance: '', riskPrevention: '' }); return; }
    const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
    const node = Array.from(doc.getElementsByTagNameNS(PROCESS_METADATA_NS, 'processMetadata'))[0];
    setProcessMetadata({ processType: node?.getAttribute('processType') || '', pilot: node?.getAttribute('pilot') || '', surveillance: node?.getAttribute('surveillance') || '', riskPrevention: node?.getAttribute('riskPrevention') || '' });
  }, [xmlContent]);

  useEffect(() => {
    let mounted = true;
    const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');
    fetch(`${apiBase}/auth/session`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then(async response => response.ok ? response.json() as Promise<{ role?: 'admin' | 'modeler' | 'viewer' }> : null)
      .then(session => { if (mounted) setSessionRole(session?.role ?? null); })
      .catch(() => { if (mounted) setSessionRole(null); });
    return () => { mounted = false; };
  }, []);

  const saveChangeComment = async (contentId: string) => {
    const content = contents.find(item => item.id === contentId);
    const changeComment = changeCommentDrafts[contentId] ?? content?.changeComment ?? '';
    setSavingChangeCommentId(contentId);
    try {
      await updateContentComment(resourceId, contentId, changeComment);
      await queryClient.invalidateQueries(contentsQuery(resourceId).queryKey);
      showAlert({ message: 'Commentaire de modification enregistré.', severity: 'success' });
    } catch {
      showAlert({ message: 'Impossible d’enregistrer le commentaire de modification.', severity: 'danger' });
    } finally {
      setSavingChangeCommentId(null);
    }
  };

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

  const navigate = useNavigate();
  const processWorkspaceRef = useRef<HTMLDivElement>(null);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [taskPanelCollapsed, setTaskPanelCollapsed] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('bpmn-viewer-explorer-width'));
    return Number.isFinite(saved) && saved >= 180 && saved <= 480 ? saved : 248;
  });
  const [taskPanelWidth, setTaskPanelWidth] = useState(() => {
    const saved = Number(window.localStorage.getItem('bpmn-viewer-task-width'));
    return Number.isFinite(saved) && saved >= 240 && saved <= 560 ? saved : 320;
  });
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    window.localStorage.setItem('bpmn-viewer-explorer-width', String(explorerWidth));
  }, [explorerWidth]);

  useEffect(() => {
    window.localStorage.setItem('bpmn-viewer-task-width', String(taskPanelWidth));
  }, [taskPanelWidth]);

  useEffect(() => {
    // The element sheet follows the BPMN selection: open on selection,
    // close again as soon as the selected element is cleared.
    setTaskPanelCollapsed(!selectedElementId);
  }, [selectedElementId]);

  useEffect(() => () => {
    resizeCleanupRef.current?.();
  }, []);

  const startPanelResize = (
    panel: 'explorer' | 'task',
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    resizeCleanupRef.current?.();
    const startX = event.clientX;
    const startWidth = panel === 'explorer' ? explorerWidth : taskPanelWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      if (panel === 'explorer') {
        setExplorerWidth(Math.min(480, Math.max(180, startWidth + delta)));
      } else {
        setTaskPanelWidth(Math.min(560, Math.max(240, startWidth - delta)));
      }
    };
    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', cleanup);
      resizeCleanupRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', cleanup);
    resizeCleanupRef.current = cleanup;
  };

  useEffect(() => {
    const onHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      navigate(-1);
    };
    window.addEventListener('keydown', onHistoryShortcut);
    return () => window.removeEventListener('keydown', onHistoryShortcut);
  }, [navigate]);

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
      externalUrl: Array.from(element.attributes).find(attribute => attribute.localName === 'link')?.value?.trim() || '',
    };
  }, [xmlContent, selectedElementId]);

  const selectedTaskRaci = useMemo(
    () => raciMatrix.activities.find(activity => activity.elementId === selectedElementId),
    [raciMatrix.activities, selectedElementId],
  );
  const selectedTaskRaciCells =
    selectedTaskRaci?.cells.filter(cell => cell.codes.length) ?? [];

  useEffect(() => {
    setIsEditingDescription(false);
    setDescriptionDraft(selectedTask?.documentation.join('\n\n') ?? '');
    setTitleDraft(selectedTask?.name === selectedTask?.id ? '' : selectedTask?.name ?? '');
    setUrlDraft(selectedTask?.externalUrl ?? '');
    const assignments: Record<string, RaciCode[]> = {};
    selectedTaskRaci?.cells.forEach(cell => { assignments[cell.role] = [...cell.codes]; });
    setRaciDraft(assignments);
  }, [selectedElementId, xmlContent, selectedTaskRaci, selectedTask]);

  const cancelDescriptionEdit = () => {
    setDescriptionDraft(selectedTask?.documentation.join('\n\n') ?? '');
    setTitleDraft(selectedTask?.name === selectedTask?.id ? '' : selectedTask?.name ?? '');
    setUrlDraft(selectedTask?.externalUrl ?? '');
    const assignments: Record<string, RaciCode[]> = {};
    selectedTaskRaci?.cells.forEach(cell => { assignments[cell.role] = [...cell.codes]; });
    setRaciDraft(assignments);
    setIsEditingDescription(false);
  };

  const toggleRaciCode = (role: string, code: RaciCode) => {
    setRaciDraft(current => {
      const codes = current[role] ?? [];
      return {
        ...current,
        [role]: codes.includes(code) ? codes.filter(value => value !== code) : [...codes, code],
      };
    });
  };

  const saveDescriptionEdit = async () => {
    if (!xmlContent || !publishedContent || !selectedTask || isSavingDescription) return;

    setIsSavingDescription(true);
    try {
      const xmlDocument = new DOMParser().parseFromString(xmlContent, 'application/xml');
      if (xmlDocument.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Le contenu BPMN ne peut pas être analysé.');
      }

      const targetElement = Array.from(xmlDocument.getElementsByTagName('*')).find(
        candidate => candidate.getAttribute('id') === selectedTask.id,
      );
      if (!targetElement) throw new Error('L’élément sélectionné est introuvable dans le BPMN.');

      const documentationNodes = Array.from(targetElement.children).filter(
        child => child.localName === 'documentation',
      );
      const description = descriptionDraft.trim();
      const title = titleDraft.trim();
      const externalUrl = urlDraft.trim();

      if (title) targetElement.setAttribute('name', title);
      else targetElement.removeAttribute('name');

      const urlAttribute = Array.from(targetElement.attributes).find(attribute => attribute.localName === 'link');
      if (externalUrl) {
        if (urlAttribute) urlAttribute.value = externalUrl;
        else targetElement.setAttribute('link', externalUrl);
      } else if (urlAttribute) {
        targetElement.removeAttributeNS(urlAttribute.namespaceURI, urlAttribute.localName);
      }

      const raciAttributes: Array<{ code: RaciCode; attribute: string }> = [
        { code: 'R', attribute: 'responsible' },
        { code: 'A', attribute: 'accountable' },
        { code: 'C', attribute: 'consulted' },
        { code: 'I', attribute: 'informed' },
      ];
      if (selectedTaskRaci) {
        const raciNamespace = xmlDocument.documentElement.lookupNamespaceURI('raci') || 'https://ovh-bpmn-tool.local/schema/raci';
        const hasRaciAssignment = raciAttributes.some(({ code }) => raciMatrix.roles.some(role => (raciDraft[role] ?? []).includes(code)));
        if (hasRaciAssignment && !xmlDocument.documentElement.lookupNamespaceURI('raci')) {
          xmlDocument.documentElement.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:raci', raciNamespace);
        }
        raciAttributes.forEach(({ code, attribute }) => {
          const value = raciMatrix.roles.filter(role => (raciDraft[role] ?? []).includes(code)).join(', ');
          const existing = Array.from(targetElement.attributes).find(item => item.localName === attribute);
          if (value) {
            if (existing) existing.value = value;
            else {
              if (hasRaciAssignment) targetElement.setAttributeNS(raciNamespace, `raci:${attribute}`, value);
              else targetElement.setAttribute(attribute, value);
            }
          } else if (existing) {
            targetElement.removeAttributeNS(existing.namespaceURI, existing.localName);
          }
        });
      }

      if (!description) {
        documentationNodes.forEach(node => node.remove());
      } else if (documentationNodes.length) {
        documentationNodes[0].textContent = description;
        documentationNodes.slice(1).forEach(node => node.remove());
      } else {
        const qualifiedName = targetElement.prefix ? `${targetElement.prefix}:documentation` : 'documentation';
        const documentationNode = xmlDocument.createElementNS(targetElement.namespaceURI, qualifiedName);
        documentationNode.textContent = description;
        const firstElementChild = Array.from(targetElement.childNodes).find(
          node => node.nodeType === Node.ELEMENT_NODE,
        );
        targetElement.insertBefore(documentationNode, firstElementChild ?? null);
      }

      const updatedXml = new XMLSerializer().serializeToString(xmlDocument);
      await saveContent(resourceId, viewerContent?.id ?? publishedContent.id, { content: updatedXml });
      await queryClient.invalidateQueries(xmlContentQuery.queryKey);
      setIsEditingDescription(false);
      showAlert({ message: 'Fiche de l’élément enregistrée.', severity: 'success' });
    } catch (error) {
      const reason = error as { response?: { data?: { message?: string | string[] } }; message?: string };
      const serverMessage = reason.response?.data?.message;
      showAlert({
        message: Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || reason.message || 'Impossible d’enregistrer la description.',
        severity: 'danger',
      });
    } finally {
      setIsSavingDescription(false);
    }
  };

  const saveProcessDescription = async () => {
    if (!processResource) return;
    setIsSavingProcessDescription(true);
    try {
      await updateResource(resourceId, {
        name: processResource.name,
        description: processDescriptionDraft,
        parentId: processResource.parentId,
      });
      if (xmlContent && viewerContent) {
        const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
        if (doc.querySelector('parsererror')) throw new Error('Le contenu BPMN ne peut pas être analysé.');
        const definitions = doc.documentElement;
        let extension = Array.from(definitions.children).find(node => node.localName === 'extensionElements');
        if (!extension) {
          extension = doc.createElementNS(definitions.namespaceURI, definitions.prefix ? `${definitions.prefix}:extensionElements` : 'extensionElements');
          definitions.insertBefore(extension, definitions.firstChild);
        }
        Array.from(extension.children).filter(node => node.namespaceURI === PROCESS_METADATA_NS && node.localName === 'processMetadata').forEach(node => node.remove());
        if (!definitions.lookupNamespaceURI('khiMeta')) definitions.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:khiMeta', PROCESS_METADATA_NS);
        const metadataNode = doc.createElementNS(PROCESS_METADATA_NS, 'khiMeta:processMetadata');
        Object.entries(processMetadata).forEach(([key, value]) => metadataNode.setAttribute(key, value.trim()));
        extension.appendChild(metadataNode);
        await saveContent(resourceId, viewerContent.id, { content: new XMLSerializer().serializeToString(doc) });
        await queryClient.invalidateQueries(xmlContentQuery.queryKey);
      }
      await queryClient.invalidateQueries(getResourceQuery(resourceId).queryKey);
      await queryClient.invalidateQueries(['resources']);
      setIsEditingProcessDescription(false);
      showAlert({ message: 'Description du processus enregistrée.', severity: 'success' });
    } catch (error) {
      const reason = error as { response?: { data?: { message?: string | string[] } }; message?: string };
      const serverMessage = reason.response?.data?.message;
      showAlert({
        message: Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || reason.message || 'Impossible d’enregistrer la description du processus.',
        severity: 'danger',
      });
    } finally {
      setIsSavingProcessDescription(false);
    }
  };

  // Keep the explorer and workspace mounted while the newly selected
  // process loads. Replacing the whole ProcessDetails tree with skeletons
  // makes navigation look like a full page reload and resets local UI state.

  return (
    <Box
      className="processViewerLayout processViewerWorkspace"
      style={{ "--explorer-width": `${explorerWidth}px`, "--task-panel-width": `${taskPanelWidth}px` } as React.CSSProperties}
    >
          <ViewerExplorerPanel
            variant="process-details"
            selectedId={resourceId}
            onNodeClick={id => navigate(`/${id}`)}
            collapsed={explorerCollapsed}
            onToggle={() => setExplorerCollapsed(value => !value)}
            showHistory
            onBack={() => navigate(-1)}
            onForward={() => navigate(1)}
          />
          {!explorerCollapsed && (
            <Box
              className="processViewerResizeHandle"
              role="separator"
              aria-label="Redimensionner le panneau explorateur"
              title="Glisser pour régler la largeur de l’explorateur"
              onMouseDown={event => startPanelResize('explorer', event)}
            />
          )}

      <Tabs value={activeViewerTab} onChange={(_, value) => setActiveViewerTab(Number(value))} className="processViewerTabs">
        <TabList sticky="top">
          <Tab value={0}>Vue du processus</Tab>
          <Tab value={1}>Description</Tab>
          <Tab value={2}>Historique des versions</Tab>
          <Tab value={3}>RACI</Tab>
          <Tab value={4}>Informations documentées</Tab>
          <Tab value={5}>Remarques ({proposalRemarks.length})</Tab>
        </TabList>


        <TabPanel value={0} className="processViewerTabPanel processViewerProcessTab">
          <Box className="processViewerProcessWorkspace" ref={processWorkspaceRef}>
          <Sheet className="processViewerDiagram" variant="outlined">
            {isLoading && (
              <Stack gap={2} padding={2}>
                <Skeleton variant="rectangular" height={72} />
                <Skeleton variant="rectangular" height={360} />
              </Stack>
            )}
            {!isLoading && viewerContent && (
              <>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  className="processViewerDiagramHeader"
                >
                  <Stack spacing={0.25}>
                    <Typography level="body-xs" textColor="neutral">
                        Published by {viewerContent.updatedBy} le {new Date(viewerContent.updatedAt).toLocaleDateString('fr-FR')}
                      </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton
                      title="Copy link"
                      aria-label="Copier le lien du processus"
                      variant="plain"
                      color="neutral"
                      size="sm"
                      onClick={() => onContentViewerLinkCopy(viewerContent.id)}
                    >
                      <FileCopy />
                    </IconButton>
                    {canSubmitProcessRemark && (
                      <Button
                        size="sm"
                        variant="soft"
                        color="warning"
                        disabled={!selectedElementId || submittingRemark}
                        onClick={() => { setRemarkError(null); setRemarkModalOpen(true); }}
                      >
                        Ajouter une remarque
                      </Button>
                    )}
                    {canReviewActiveProposal && activeProposal && (
                      <Button
                        size="sm"
                        variant="soft"
                        color="primary"
                        onClick={() => navigate(
                          `/${activeProposal.cloneResourceId}/modeler?proposalId=${activeProposal.id}&${activeProposal.status === 'approved' ? 'publishApproved=1' : 'reviewRemarks=1'}`,
                        )}
                      >
                        {activeProposal.status === 'approved' ? 'Préparer la publication' : 'Traiter les remarques'}
                      </Button>
                    )}
                    {canEditDescription && (
                      <IconButton
                        title="Modifier le diagramme BPMN"
                        aria-label="Modifier le diagramme BPMN"
                        variant="plain"
                        color="neutral"
                        size="sm"
                        onClick={onModelerClick}
                      >
                        <EditOutlined />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
                <Divider />
                <Box className="processViewerCanvas">
                  <ProcessViewer
                    key={`${resourceId}:${viewerContent.id}`}
                    resourceId={resourceId}
                    contentId={viewerContent.id}
                    selectedElementId={selectedElementId}
                    onElementSelect={onElementSelect}
                    fullscreenTargetRef={processWorkspaceRef}
                  />
                </Box>
              </>
            )}
            {!isLoading && !viewerContent && (
              <Stack spacing={2} padding={2}>
                <Typography level="title-md">
                  {selectedContentId
                    ? 'La version demandée est indisponible ou ne peut pas être consultée.'
                    : 'No published version'}
                </Typography>
                {!readOnlyShell && (
                  <ConditionalRender condition={Boolean(!contents.length)}>
                    <DropZone onFileUploaded={onFilesUploaded} />
                  </ConditionalRender>
                )}
              </Stack>
            )}
          </Sheet>
          {activeViewerTab === 0 && viewerContent && !taskPanelCollapsed && (
            <Box
              className="processViewerResizeHandle"
              role="separator"
              aria-label="Redimensionner le panneau de tâche"
              title="Glisser pour régler la largeur du panneau de tâche"
              onMouseDown={event => startPanelResize('task', event)}
            />
          )}
          {activeViewerTab === 0 && viewerContent && (
            <Sheet
              className={`processTaskPanel ${taskPanelCollapsed ? 'collapsed' : ''}`}
              variant="outlined"
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent={taskPanelCollapsed ? 'center' : 'space-between'}
                className="viewerPanelHeader processTaskPanelHeader"
                onClick={() => setTaskPanelCollapsed(value => !value)}
                role="button"
                tabIndex={0}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setTaskPanelCollapsed(value => !value); }}
              >
                {!taskPanelCollapsed && (
                  <Typography level="title-sm">Fiche de l’élément</Typography>
                )}
                        <IconButton
                  size="sm"
                  variant="plain"
                  color="neutral"
                  onClick={event => { event.stopPropagation(); setTaskPanelCollapsed(value => !value); }}
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
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          {isEditingDescription ? (
                            <Input
                              value={titleDraft}
                              onChange={event => setTitleDraft(event.target.value)}
                              placeholder="Titre de l’élément"
                              aria-label="Titre de l’élément BPMN"
                              disabled={isSavingDescription}
                              size="sm"
                            />
                          ) : (
                            <Typography level="title-lg">{selectedTask.name}</Typography>
                          )}
                        </Box>
                        {canEditDescription && !isEditingDescription && (
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="neutral"
                            sx={{ ml: 1, mt: 0.25, flex: '0 0 auto' }}
                            onClick={() => {
                              setDescriptionDraft(selectedTask.documentation.join('\n\n'));
                              setTitleDraft(selectedTask.name === selectedTask.id ? '' : selectedTask.name);
                              setUrlDraft(selectedTask.externalUrl);
                              const assignments: Record<string, RaciCode[]> = {};
                              selectedTaskRaci?.cells.forEach(cell => { assignments[cell.role] = [...cell.codes]; });
                              setRaciDraft(assignments);
                              setIsEditingDescription(true);
                            }}
                            aria-label="Modifier la fiche de l’élément"
                            title="Modifier la fiche de l’élément"
                          >
                            <EditOutlined />
                          </IconButton>
                        )}
                      </Stack>
                      <Chip
                          size="md"
                          variant="soft"
                          color={getElementTypeBadgeColor(selectedTask.type)}
                          sx={{
                            alignSelf: 'flex-start',
                            fontWeight: 600,
                            ...(selectedTask.type.toLowerCase().includes('gateway')
                              ? {
                                  color: '#6a0dad',
                                  backgroundColor: '#f3e8ff',
                                  border: '1px solid #6a0dad',
                                }
                              : {}),
                          }}
                        >
                          {selectedTask.type.replace(/([A-Z])/g, ' $1').replace(/^./, value => value.toUpperCase()).trim()}
                        </Chip>
                        <Typography level="body-sm">Identifiant : {selectedTask.id}</Typography>
                        <Typography level="body-sm" textColor="neutral">{getElementTypeDescription(selectedTask.type)}</Typography>

                      <Divider />
                      <Stack spacing={1}>
                        <Typography level="title-sm">1. Description de la tâche</Typography>
                        {isEditingDescription && (
                          <Typography level="body-xs" textColor="neutral">Description modifiable</Typography>
                        )}
                        {isEditingDescription && (
                          <Textarea
                            value={descriptionDraft}
                            onChange={event => setDescriptionDraft(event.target.value)}
                            minRows={4}
                            maxRows={12}
                            placeholder="Saisissez la description de cet élément…"
                            aria-label="Description de l’élément BPMN"
                            disabled={isSavingDescription}
                          />
                        )}
                        {!isEditingDescription && selectedTask.documentation.length > 0 &&
                          selectedTask.documentation.map((entry, index) => (
                            <Sheet key={index} variant="soft" sx={{ p: 1, borderRadius: 'sm' }}>
                              <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>
                                {entry}
                              </Typography>
                            </Sheet>
                          ))}
                        {!isEditingDescription && selectedTask.documentation.length === 0 && (
                          <Typography level="body-sm" textColor="neutral">
                            Aucune description n'est renseignée pour cette tâche.
                          </Typography>
                        )}
                      </Stack>

                      <Divider />
                      <Stack spacing={1}>
                        <Typography level="title-sm">2. RACI</Typography>
                        {isEditingDescription && selectedTaskRaci && raciMatrix.roles.length > 0 && raciMatrix.roles.map(role => (
                          <Stack key={role} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography level="body-sm" sx={{ flex: 1 }}>{role}</Typography>
                            <Stack direction="row" spacing={0.75}>
                              {(['R', 'A', 'C', 'I'] as RaciCode[]).map(code => (
                                <label key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12 }}>
                                  <input
                                    type="checkbox"
                                    checked={(raciDraft[role] ?? []).includes(code)}
                                    onChange={() => toggleRaciCode(role, code)}
                                    disabled={isSavingDescription}
                                    aria-label={`${code} pour ${role}`}
                                  />
                                  {code}
                                </label>
                              ))}
                            </Stack>
                          </Stack>
                        ))}
                        {isEditingDescription && !selectedTaskRaci && (
                          <Typography level="body-sm" textColor="neutral">Le RACI est disponible pour les activités BPMN.</Typography>
                        )}
                        {isEditingDescription && selectedTaskRaci && raciMatrix.roles.length === 0 && (
                          <Typography level="body-sm" textColor="neutral">Aucun rôle disponible pour le RACI.</Typography>
                        )}
                        {!isEditingDescription && selectedTaskRaciCells.length > 0 && selectedTaskRaciCells.map(cell => (
                          <Stack key={cell.role} direction="row" spacing={1} alignItems="center">
                            <Typography level="body-sm" sx={{ flex: 1 }}>{cell.role}</Typography>
                            <Typography level="title-sm">{cell.codes.join(' / ')}</Typography>
                          </Stack>
                        ))}
                        {!isEditingDescription && selectedTaskRaciCells.length === 0 && (
                          <Typography level="body-sm" textColor="neutral">
                            Aucun rôle RACI détecté pour cette tâche.
                          </Typography>
                        )}
                        <Typography level="body-xs" textColor="neutral">
                          R = Réalise · A = Approuve / redevable · C = Consulté · I = Informé
                        </Typography>
                      </Stack>

                      <Divider />
                      <Stack spacing={1}>
                        <Typography level="title-sm">3. Documentation</Typography>
                        {isEditingDescription && (
                          <Input
                            value={urlDraft}
                            onChange={event => setUrlDraft(event.target.value)}
                            placeholder="https://…"
                            aria-label="URL de documentation"
                            disabled={isSavingDescription}
                            size="sm"
                          />
                        )}
                        {!isEditingDescription && selectedTask.externalUrl && (
                          <Typography level="body-sm">
                            <a
                              href={selectedTask.externalUrl.startsWith('http://') || selectedTask.externalUrl.startsWith('https://') ? selectedTask.externalUrl : `https://${selectedTask.externalUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {selectedTask.externalUrl}
                            </a>
                          </Typography>
                        )}
                        {!isEditingDescription && !selectedTask.externalUrl && (
                          <Typography level="body-sm" textColor="neutral">Aucune URL renseignée.</Typography>
                        )}
                      </Stack>
                    </>
                  ) : (
                    <Stack spacing={1}>
                      <Typography level="title-md">Aucun élément sélectionné</Typography>
                      <Typography level="body-sm" textColor="neutral">
                        Sélectionnez un élément dans le diagramme pour afficher ses informations, sa documentation et, pour les activités, son RACI.
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}
              {!taskPanelCollapsed && selectedTask && isEditingDescription && (
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="flex-end"
                  className="processTaskPanelEditActions"
                >
                  <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    disabled={isSavingDescription}
                    onClick={cancelDescriptionEdit}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    variant="solid"
                    color="primary"
                    loading={isSavingDescription}
                    disabled={isSavingDescription}
                    onClick={saveDescriptionEdit}
                  >
                    Enregistrer
                  </Button>
                </Stack>
              )}
            </Sheet>
          )}
          </Box>
        </TabPanel>
        <TabPanel value={1} className="processViewerTabPanel">
          <Sheet className="processViewerInfo" variant="outlined">
            <Stack spacing={2} sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography level="title-lg">Description du processus</Typography>
                {canEditDescription && !isEditingProcessDescription && (
                  <Button
                    size="sm"
                    variant="outlined"
                    color="neutral"
                    disabled={!processResource}
                    onClick={() => {
                      setProcessDescriptionDraft(processResource?.description ?? '');
                      setIsEditingProcessDescription(true);
                    }}
                  >
                    Modifier
                  </Button>
                )}
              </Stack>
              {resourceShares?.shared && (
                <Stack spacing={0.75}>
                  <Box>
                    <Chip size="sm" color="primary" variant="soft">Partagé</Chip>
                  </Box>
                  {resourceShares.projects.length > 0 && (
                    <Stack spacing={0.5}>
                      <Typography level="body-sm" textColor="neutral">Projets associés :</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {resourceShares.projects.map(project => project.canNavigate ? (
                          <Button
                            key={project.id}
                            size="sm"
                            variant="outlined"
                            color="neutral"
                            onClick={() => navigate(`/projects/${project.id}/viewer`)}
                          >
                            {project.name}
                          </Button>
                        ) : (
                          <Typography key={project.id} level="body-sm" sx={{ alignSelf: 'center' }}>
                            {project.name}
                          </Typography>
                        ))}
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              )}
              {isEditingProcessDescription ? (
                <>
                  <Stack spacing={1}>
                    <Typography level="title-sm">Type de processus</Typography>
                    <Select value={processMetadata.processType || null} placeholder="Choisir un type" onChange={(_, value) => setProcessMetadata(current => ({ ...current, processType: value ?? '' }))} disabled={isSavingProcessDescription}>
                      {PROCESS_TYPES.map(type => <Option key={type.value} value={type.value}><Chip size="sm" variant="soft" color={type.color}>{type.label}</Chip></Option>)}
                    </Select>
                  </Stack>
                  <Input value={processMetadata.pilot} onChange={event => setProcessMetadata(current => ({ ...current, pilot: event.target.value }))} placeholder="Pilote du processus" aria-label="Pilote du processus" disabled={isSavingProcessDescription} />
                  <Stack spacing={0.5}>
                    <Typography level="title-sm">Surveillance</Typography>
                    <Textarea value={processMetadata.surveillance} onChange={event => setProcessMetadata(current => ({ ...current, surveillance: event.target.value }))} minRows={2} placeholder="Indicateurs, fréquence et modalités de surveillance…" aria-label="Surveillance du processus" disabled={isSavingProcessDescription} />
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography level="title-sm">Risques / prévention</Typography>
                    <Textarea value={processMetadata.riskPrevention} onChange={event => setProcessMetadata(current => ({ ...current, riskPrevention: event.target.value }))} minRows={2} placeholder="Risques identifiés et mesures de prévention…" aria-label="Risques et prévention" disabled={isSavingProcessDescription} />
                  </Stack>
                  <Divider />
                  <Typography level="title-sm">Description générale</Typography>
                  <Textarea value={processDescriptionDraft} onChange={event => setProcessDescriptionDraft(event.target.value)} minRows={6} maxRows={18} aria-label="Description du processus" placeholder="Décrire l’objectif, le périmètre et les règles principales du processus…" disabled={isSavingProcessDescription} />
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="sm"
                      variant="outlined"
                      color="neutral"
                      disabled={isSavingProcessDescription}
                      onClick={() => {
                        setProcessDescriptionDraft(processResource?.description ?? '');
                        setIsEditingProcessDescription(false);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      loading={isSavingProcessDescription}
                      disabled={isSavingProcessDescription || !processResource}
                      onClick={() => void saveProcessDescription()}
                    >
                      Enregistrer
                    </Button>
                  </Stack>
                </>
              ) : (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography level="title-sm">Type :</Typography>
                    {(() => { const type = PROCESS_TYPES.find(item => item.value === processMetadata.processType); return type ? <Chip size="md" variant="soft" color={type.color}>{type.label}</Chip> : <Typography level="body-sm" textColor="neutral">Non renseigné</Typography>; })()}
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="baseline"><Typography level="title-sm">Pilote :</Typography><Typography level="body-sm">{processMetadata.pilot || 'Non renseigné'}</Typography></Stack>
                  <Box><Typography level="title-sm">Surveillance</Typography><Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{processMetadata.surveillance || 'Non renseignée'}</Typography></Box>
                  <Box><Typography level="title-sm">Risques / prévention</Typography><Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>{processMetadata.riskPrevention || 'Non renseignés'}</Typography></Box>
                  <Divider />
                  <Box><Typography level="title-sm">Description générale</Typography><Typography level="body-md" sx={{ whiteSpace: 'pre-wrap' }}>{processResource?.description?.trim() || 'Aucune description renseignée pour ce processus.'}</Typography></Box>
                </Stack>
              )}
            </Stack>
          </Sheet>
        </TabPanel>

        <TabPanel value={2} className="processViewerTabPanel">
          <Sheet className="processViewerInfo" variant="outlined">
            <Stack spacing={1.5} className="processViewerInfoHeader">
              <Typography level="title-lg">Historique des versions</Typography>
              {publishedContent && (
                <Typography level="body-sm">
                  Dernière version publiée : v{publishedContent.version ?? 'N/A'} —{' '}
                  {publishedContent.updatedBy}
                </Typography>
              )}
            </Stack>
            <Divider />
            <Stack spacing={1} padding={1}>
              {readOnlyShell && !canManageVersions ? (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="flex-end">
                    <IconButton
                      title="Comparer les deux versions sélectionnées"
                      aria-label="Comparer les deux versions sélectionnées"
                      variant="plain"
                      color="neutral"
                      size="sm"
                      disabled={isCompareDisabled}
                      onClick={() => onCompareClick(contentIdsToCompare[0], contentIdsToCompare[1])}
                    >
                      <Compare />
                    </IconButton>
                  </Stack>
                  {contents.map(content => (
                    <Sheet key={content.id} variant="soft" sx={{ p: 1.5, borderRadius: 'sm' }}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Checkbox
                            size="sm"
                            checked={contentIdsToCompare.includes(content.id)}
                            disabled={content.status === ContentStatusEnum.Draft}
                            onChange={event => onContentChecked(
                              event.target.checked
                                ? [...contentIdsToCompare, content.id]
                                : contentIdsToCompare.filter(id => id !== content.id),
                            )}
                            aria-label={`Sélectionner la version v${content.version ?? 'N/A'} pour comparaison`}
                          />
                          <Typography level="title-sm">Version v{content.version ?? 'N/A'}</Typography>
                        </Stack>
                        <Chip size="sm" variant="soft" color={getContentStatusColor(content.status)}>
                          {getContentStatusLabel(content.status)}
                        </Chip>
                      </Stack>
                      <Typography level="body-sm" textColor="neutral">
                        {content.updatedBy ? `Modifiée par : ${content.updatedBy}` : 'Auteur non renseigné'}
                      </Typography>
                      {content.status !== ContentStatusEnum.Draft && (
                        <Button
                          size="sm"
                          variant={viewerContent?.id === content.id ? 'soft' : 'outlined'}
                          color="neutral"
                          aria-label={`Afficher la version v${content.version ?? 'N/A'}`}
                          onClick={() => navigate(`/${resourceId}?contentId=${encodeURIComponent(content.id)}`)}
                        >
                          {viewerContent?.id === content.id ? 'Version affichée' : 'Afficher cette version'}
                        </Button>
                      )}
                    </Sheet>
                  ))}
                  {!contents.length && (
                    <Typography level="body-sm" textColor="neutral">Aucune version disponible.</Typography>
                  )}
                </>
              ) : (
                <>
                  <ConditionalRender condition={Boolean(draftContent) || Boolean(publishedContent)}>
                    <Stack direction="row" justifyContent="flex-end">
                      <IconButton
                        title="Comparer les versions"
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
                      resourceId={resourceId}
                      contents={contents}
                      onContentChecked={onContentChecked}
                      onContentPublish={onContentPublish}
                      onContentErase={onContentErase}
                      onContentClone={onContentClone}
                      canManageVersions={canManageVersions}
                      editingChangeCommentId={editingChangeCommentId}
                      changeCommentDrafts={changeCommentDrafts}
                      savingChangeCommentId={savingChangeCommentId}
                      onEditChangeComment={contentId => {
                        const content = contents.find(item => item.id === contentId);
                        setChangeCommentDrafts(previous => ({ ...previous, [contentId]: previous[contentId] ?? content?.changeComment ?? '' }));
                        setEditingChangeCommentId(contentId);
                      }}
                      onChangeCommentDraft={(contentId, value) => setChangeCommentDrafts(previous => ({ ...previous, [contentId]: value }))}
                      onSaveChangeComment={async contentId => {
                        await saveChangeComment(contentId);
                        setEditingChangeCommentId(null);
                      }}
                      onCancelChangeComment={contentId => {
                        const content = contents.find(item => item.id === contentId);
                        setChangeCommentDrafts(previous => ({ ...previous, [contentId]: content?.changeComment ?? '' }));
                        setEditingChangeCommentId(null);
                      }}
                    />
                  </ConditionalRender>
                  <ConditionalRender condition={Boolean(!contents.length)}>
                    <DropZone onFileUploaded={onFilesUploaded} />
                  </ConditionalRender>
                </>
              )}

            </Stack>
          </Sheet>
        </TabPanel>

        <TabPanel value={3} className="processViewerTabPanel">
          <Sheet className="processViewerInfo processViewerRaci" variant="outlined">
            <Box className="raci-header">
              <Box>
                <Typography level="title-lg">Matrice RACI</Typography>
                <Box className="raci-legend" sx={{ mt: 1, flexWrap: 'wrap' }}>
                  <span><b className="raci-code-badge raci-code-R">R</b> Responsable</span>
                  <span><b className="raci-code-badge raci-code-A">A</b> Acteur</span>
                  <span><b className="raci-code-badge raci-code-C">C</b> Consulté</span>
                  <span><b className="raci-code-badge raci-code-I">I</b> Informé</span>
                </Box>
              </Box>
            </Box>
            <Box className="raci-table-wrapper processViewerRaciTableWrapper">
              {raciMatrix.activities.length ? (
                <table className="raci-table" aria-label="Matrice RACI en lecture seule">
                  <thead>
                    <tr>
                      <th>Activité</th>
                      {raciMatrix.roles.map(role => <th key={role}>{role}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {raciMatrix.activities.map(activity => (
                      <tr key={activity.elementId}>
                        <th className="raci-activity">
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography level="body-sm" sx={{ flex: 1, minWidth: 0 }}>{activity.activity}</Typography>
                            <IconButton size="sm" variant="plain" color="primary" title="Voir l’activité dans le BPMN" aria-label="Voir l’activité dans le BPMN" onClick={() => { setActiveViewerTab(0); onElementSelect?.(activity.elementId); }} disabled={!onElementSelect || !activity.elementId} sx={{ flex: '0 0 auto' }}>
                              <CenterFocusStrong />
                            </IconButton>
                          </Stack>
                        </th>
                        {activity.cells.map(cell => (
                          <td
                            key={cell.role}
                            className={getRaciCellStatusClass(cell.status)}
                            title={getRaciCellStatusLabel(cell.status)}
                          >
                            <Box className="raci-cell-code">
                              {cell.codes.length ? cell.codes.map(code => (
                                <span key={code} className={`raci-code-badge raci-code-${code}`} title={code}>{code}</span>
                              )) : '—'}
                            </Box>
                            <Box className="raci-cell-status">
                              {getRaciCellStatusLabel(cell.status)}
                            </Box>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Typography level="body-sm" textColor="neutral" sx={{ p: 2 }}>
                  {viewerContent
                    ? 'Aucune activité BPMN détectée dans ce contenu.'
                    : 'Aucune version publiée.'}
                </Typography>
              )}
            </Box>
            <Box className="raci-footer processViewerRaciFooter">
              <span>{raciMatrix.activities.length} activité(s)</span>
              <span>{raciMatrix.roles.length} acteur(s)</span>
              <span>{raciAnalysis.issues.length} anomalie(s)</span>
              <span>🟢 Explicite</span>
              <span>🟠 Inféré</span>
              <span>⚪ Manquant</span>
              <span>Lecture seule dans le Viewer</span>
            </Box>
          </Sheet>
        </TabPanel>

        <TabPanel value={5} className="processViewerTabPanel">
          <Sheet className="processViewerInfo" variant="outlined" sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Stack spacing={1.5}>
              <Typography level="title-md">Remarques liées au processus</Typography>
              <Typography level="body-sm" textColor="neutral">
                Les remarques sont rattachées à un élément BPMN et conservées hors du fichier XML. Le validateur peut les accepter ou les refuser avant publication.
              </Typography>
              {remarkWarning && <Alert color="warning">{remarkWarning}</Alert>}
              {proposalRemarksLoading && <Typography level="body-sm">Chargement des remarques…</Typography>}
              {proposalRemarksError && <Alert color="danger">Impossible de charger les remarques.</Alert>}
              {!proposalRemarksLoading && !proposalRemarksError && proposalRemarks.length === 0 && (
                <Typography level="body-sm" textColor="neutral">Aucune remarque enregistrée pour cette version.</Typography>
              )}
              {proposalRemarks.map((remark, index) => (
                <Sheet key={remark.id} variant="soft" sx={{ p: 1.25, borderRadius: 'sm' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography level="title-sm">Remarque {index + 1} — {remark.elementId}</Typography>
                    <Chip size="sm" color={remark.status === 'accepted' ? 'success' : remark.status === 'rejected' ? 'danger' : 'warning'}>
                      {remark.status === 'accepted' ? 'Acceptée' : remark.status === 'rejected' ? 'Refusée' : 'En attente'}
                    </Chip>
                  </Stack>
                  <Typography level="body-sm">{remark.comment}</Typography>
                  <Typography level="body-xs" textColor="neutral">
                    Déposée le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(remark.createdAt))} · {remark.authorName || remark.authorUserId}
                  </Typography>
                  {remark.decidedAt && (
                    <Typography level="body-xs" textColor="neutral">
                      Décision le {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(remark.decidedAt))}
                      {(remark.decisionByName || remark.decisionBy) ? ` · ${remark.decisionByName || remark.decisionBy}` : ''}
                      {remark.decisionComment ? ` · ${remark.decisionComment}` : ''}
                    </Typography>
                  )}
                </Sheet>
              ))}
            </Stack>
          </Sheet>
        </TabPanel>

        <TabPanel value={4} className="processViewerTabPanel">
          <Sheet className="processViewerInfo" variant="outlined" sx={{ height: '100%', overflow: 'auto' }}>
            <DataInventory
              xmlContent={xmlContent}
              canEdit={canEditDescription}
              onSave={async updatedXml => {
                if (!viewerContent) throw new Error('Aucune version publiée à mettre à jour.');
                await saveContent(resourceId, viewerContent.id, { content: updatedXml });
                await queryClient.invalidateQueries(xmlContentQuery.queryKey);
                showAlert({ message: 'Inventaire des données enregistré.', severity: 'success' });
              }}
              onElementSelect={elementId => { setActiveViewerTab(0); onElementSelect?.(elementId); }}
              onShowDiagram={() => setActiveViewerTab(0)}
            />
          </Sheet>
        </TabPanel>
      </Tabs>
      <Modal open={remarkModalOpen} onClose={() => { if (!submittingRemark) setRemarkModalOpen(false); }}>
        <ModalDialog>
          <DialogTitle>Déposer une remarque</DialogTitle>
          <DialogContent>Élément BPMN sélectionné : {selectedElementId || 'aucun'}</DialogContent>
          <Textarea
            minRows={3}
            value={undefined}
            placeholder="Décrivez le point à examiner ou la modification souhaitée…"
            onChange={() => undefined}
          />
          {remarkError && <Alert color="danger">{remarkError}</Alert>}
          <DialogActions>
            <Button variant="plain" color="neutral" disabled={submittingRemark} onClick={() => setRemarkModalOpen(false)}>Annuler</Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

    </Box>
  );
};
