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

        if (filters.issuesOnly && !issue) return false;

        if (filters.actorFilter) {
          const actorCell = activity.cells.find(
            cell => cell.role === filters.actorFilter,
          );
          if (!actorCell?.codes.length) return false;
          if (
            filters.codeFilter &&
            !actorCell.codes.includes(filters.codeFilter)
          ) {
            return false;
          }
        } else if (
          filters.codeFilter &&
          !activity.cells.some(cell => cell.codes.includes(filters.codeFilter))
        ) {
          return false;
        }

        return true;
      }),
    [raciMatrix.activities, issueByActivity, filters],
  );

  return { raciAnalysis, issueByActivity, filteredActivities };
};
