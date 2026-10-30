import { useMemo } from 'react';

import { deriveRaciMatrixFromDocument } from '../../../extensions/raci-viewer';
import type { RaciMatrix } from '../../../extensions/raci-engine';

export type ViewerRaciAnalysis = {
  raciMatrix: RaciMatrix;
  laneRoleByElement: Map<string, string>;
  laneIdByRole: Map<string, string>;
};

export const useViewerRaciAnalysis = (
  xmlContent?: string,
): ViewerRaciAnalysis =>
  useMemo(() => {
    const emptyMatrix: RaciMatrix = { roles: [], activities: [] };
    const laneRoleByElement = new Map<string, string>();
    const laneIdByRole = new Map<string, string>();

    if (!xmlContent || typeof DOMParser === 'undefined') {
      return { raciMatrix: emptyMatrix, laneRoleByElement, laneIdByRole };
    }

    const document = new DOMParser().parseFromString(xmlContent, 'application/xml');
    const bpmnNamespace = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

    Array.from(document.getElementsByTagNameNS(bpmnNamespace, 'lane')).forEach(lane => {
      const laneId = lane.getAttribute('id');
      const role = lane.getAttribute('name')?.trim();
      if (!laneId || !role) return;

      laneRoleByElement.set(laneId, role);
      laneIdByRole.set(role, laneId);

      Array.from(lane.getElementsByTagNameNS(bpmnNamespace, 'flowNodeRef')).forEach(reference => {
        const elementId = reference.textContent?.trim();
        if (elementId) laneRoleByElement.set(elementId, role);
      });
    });

    return {
      raciMatrix: deriveRaciMatrixFromDocument(document),
      laneRoleByElement,
      laneIdByRole,
    };
  }, [xmlContent]);
