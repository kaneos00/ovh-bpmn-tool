import { useMemo } from 'react';

import {
  analyzeRaciMatrix,
  type RaciCode,
  type RaciMatrix,
} from '../../../extensions/raci-engine';

type ViewerRaciFilters = {
  actorFilter: string;
  codeFilter: RaciCode | '';
  issuesOnly: boolean;
};

export const useViewerRaciFilters = (
  raciMatrix: RaciMatrix,
  filters: ViewerRaciFilters,
) => {
  const { actorFilter, codeFilter, issuesOnly } = filters;

  const raciAnalysis = useMemo(
    () => analyzeRaciMatrix(raciMatrix),
    [raciMatrix],
  );

  const issueByActivity = useMemo(
    () => new Map(raciAnalysis.issues.map(issue => [issue.activityId, issue])),
    [raciAnalysis],
  );

  const filteredActivities = useMemo(
    () =>
      raciMatrix.activities.filter(activity => {
        const issue = issueByActivity.get(activity.elementId);

        if (issuesOnly && !issue) return false;

        if (actorFilter) {
          const actorCell = activity.cells.find(
            cell => cell.role === actorFilter,
          );
          if (!actorCell?.codes.length) return false;
          if (
            codeFilter &&
            !actorCell.codes.includes(codeFilter)
          ) {
            return false;
          }
        } else if (
          codeFilter &&
          !activity.cells.some(cell => cell.codes.includes(codeFilter))
        ) {
          return false;
        }

        return true;
      }),
    [raciMatrix.activities, issueByActivity, actorFilter, codeFilter, issuesOnly],
  );

  return { raciAnalysis, issueByActivity, filteredActivities };
};
