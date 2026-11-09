import { redirect } from 'react-router-dom';

const apiBase = (import.meta.env.VITE_API_URL || '/bpmn-api').replace(/\/+$/, '');

async function requireSession({ request }: { request: Request }) {
  const requestedUrl = new URL(request.url);
  const requestedPath = requestedUrl.pathname + requestedUrl.search;
  try {
    const response = await fetch(`${apiBase}/auth/session`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (response.ok) return null;
  } catch {
    // Fail closed when the session endpoint is unavailable.
  }
  throw redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
}

/**
 * V3 initial shell: authentication, process/folder viewer and BPMN modeler.
 * Organization administration is exposed through its existing consolidated
 * administration screen; the RACI governance view reuses that screen.
 */
export const routes = [
  {
    loader: requireSession,
    children: [
      {
        path: '/',
        loader: () => redirect('/root'),
      },
      {
        path: '/search',
        lazy: () => import('./Containers/SearchResults'),
      },
      {
        path: '/mes-demandes',
        lazy: () => import('./Containers/MyProcessChangeProposals/MyProcessChangeProposals.container'),
      },
      {
        path: '/projects',
        lazy: () => import('./Containers/Projects'),
      },
      {
        path: '/projects/:projectId',
        lazy: () => import('./Containers/Projects'),
      },
      {
        path: '/organization/accounts',
        lazy: () => import('./Containers/UserAccounts'),
      },
      {
        path: '/organization/:section',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/:resourceId',
        lazy: () => import('./Containers/BpmnLayout'),
        children: [
          {
            path: '/:resourceId/add',
            lazy: () => import('./Containers/AddResource'),
          },
          {
            path: '/:resourceId/edit',
            lazy: () => import('./Containers/EditResource'),
          },
          {
            path: '/:resourceId/share',
            lazy: () => import('./Containers/ShareResource'),
          },
          {
            path: '/:resourceId/delete',
            lazy: () => import('./Containers/DeleteResource'),
          },
          {
            path: '/:resourceId/publish',
            lazy: () => import('./Containers/PublishResource'),
          },
        ],
      },
      {
        // Legacy cross-resource comparison URL: /compare-resources/{leftResourceId}/{leftContentId}/{rightResourceId}/{rightContentId}.
        // Keep it standalone so it does not render the process workspace behind the comparison.
        path: '/compare-resources/:leftResourceId/:leftContentId/:rightResourceId/:rightContentId',
        lazy: () => import('./Containers/ContentCompare'),
      },
      {
        // Keep version comparison as a standalone viewer route: embedding it
        // inside BpmnLayout would also render the process workspace behind it.
        path: '/:resourceId/compare/:leftContentId/:rightContentId',
        lazy: () => import('./Containers/ContentCompare'),
      },
      {
        path: '/projects/:projectId/viewer',
        lazy: () => import('./Containers/ProjectViewer'),
      },
      {
        path: '/:resourceId/modeler',
        lazy: () => import('./Containers/ContentModeler'),
        children: [
          {
            path: 'publish',
            lazy: () => import('./Containers/PublishResource'),
          },
        ],
      },
      {
        path: '/:resourceId/viewer/:contentId',
        lazy: () => import('./Containers/ContentViewer'),
      },
    ],
  },
  {
    path: '/login',
    lazy: () => import('./Containers/Login'),
  },
];
