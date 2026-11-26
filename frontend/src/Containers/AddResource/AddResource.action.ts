import queryClient, { apiClient } from '../../queryClient';
import { isRoot } from '../../shared/helpers/resource';
import {
  createResource,
  deleteResource,
  QUERY_KEY as resourceQueryKey,
} from '../../api/resources/resources.queries';
import { ResourceType } from '../../shared/types/BpmnResource';

import { AddResourceParams } from '.';

export const action = async ({
  request,
  params,
}: {
  request: Request;
  params: AddResourceParams;
}) => {
  const url = new URL(request.url);
  const resourceType = url.searchParams.get('type');
  const projectId = url.searchParams.get('projectId');
  const { resourceId } = params;

  if (resourceType === ResourceType.Process && !projectId) {
    return { error: new Error('Sélectionnez un projet avant de créer un processus.') };
  }

  const formData = await request.formData();
  const resourceData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    parentId: !isRoot(resourceId) ? resourceId : undefined,
    type: resourceType,
    processMetadata: resourceType === ResourceType.Process ? {
      processType: String(formData.get('processType') || 'operationnel'),
      processNature: String(formData.get('processNature') || 'specific'),
      pilot: String(formData.get('pilot') || ''),
    } : undefined,
  };

  let createdResourceId: string | undefined;
  try {
    const response = await createResource(resourceData) as { id?: string };
    createdResourceId = response.id;
    if (!createdResourceId) {
      throw new Error('Le serveur n’a pas retourné l’identifiant de la ressource créée.');
    }

    // Create the first editable BPMN draft before linking the process to a project.
    if (resourceType === ResourceType.Process) {
      const initialBpmn = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Initial" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Initial" isExecutable="false">
    <bpmn:startEvent id="StartEvent_Initial" name="Début" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Initial">
    <bpmndi:BPMNPlane id="BPMNPlane_Initial" bpmnElement="Process_Initial">
      <bpmndi:BPMNShape id="StartEvent_Initial_di" bpmnElement="StartEvent_Initial">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
      try {
        await apiClient.post(`/resources/${createdResourceId}/contents`, { content: initialBpmn });
      } catch (draftError) {
        try { await deleteResource(createdResourceId); } catch { /* best-effort cleanup */ }
        throw new Error(`Le brouillon initial du processus n’a pas pu être créé : ${draftError instanceof Error ? draftError.message : 'erreur inconnue'}`);
      }
    }

    // A process resource must also be attached to the active project. Keep
    // this second authorization check server-side; if it fails, remove the
    // just-created orphan resource rather than leaving it outside the project.
    if (resourceType === ResourceType.Folder && projectId) {
      try {
        await apiClient.post(`/projects/${projectId}/folders`, { resourceId: createdResourceId });
      } catch (linkError) {
        try { await deleteResource(createdResourceId); } catch { /* best-effort cleanup */ }
        throw linkError;
      }
    }

    if (resourceType === ResourceType.Process && projectId) {
      if (!createdResourceId) {
        throw new Error('Le serveur n’a pas retourné l’identifiant du processus créé.');
      }
      try {
        await apiClient.post(`/projects/${projectId}/processes`, {
          resourceId: createdResourceId,
          usage: 'project-specific',
        });
      } catch (linkError) {
        try {
          await deleteResource(createdResourceId);
        } catch {
          // Preserve the original project-link error; cleanup is best-effort.
        }
        throw linkError;
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [resourceQueryKey] }),
      queryClient.invalidateQueries({ queryKey: [resourceQueryKey, 'explorer'] }),
      queryClient.invalidateQueries({ queryKey: ['my-workspace'] }),
    ]);
    // Ensure the explorer is refreshed before the action returns; otherwise
    // React Router can navigate back while the cached tree still shows the
    // previous resource hierarchy.
    await Promise.all([
      queryClient.refetchQueries([resourceQueryKey, 'explorer']),
      queryClient.refetchQueries(['my-workspace']),
    ]);
    return response;
  } catch (error) {
    return { error };
  }
};
