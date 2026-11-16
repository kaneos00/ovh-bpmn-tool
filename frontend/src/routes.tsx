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

async function requireGlobalAdmin({ request }: { request: Request }) {
  const requestedUrl = new URL(request.url);
  const requestedPath = requestedUrl.pathname + requestedUrl.search;
  try {
    const response = await fetch(`${apiBase}/auth/session`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
    }
    const session = await response.json();
    if (session.role !== 'admin' || session.impersonating) {
      throw redirect('/root');
    }
    return null;
  } catch (reason) {
    if (reason instanceof Response) throw reason;
    throw redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
  }
}


const organizationSections = new Set(['overview', 'projects', 'processes', 'governance']);

async function requireOrganizationSection(args: {
  request: Request;
  params: { section?: string };
}) {
  await requireGlobalAdmin(args);
  if (!args.params.section || !organizationSections.has(args.params.section)) {
    throw new Response('Page d’administration introuvable', { status: 404 });
  }
  return null;
}

async function redirectLegacyAccounts({ request }: { request: Request }) {
  await requireGlobalAdmin({ request });
  const url = new URL(request.url);
  throw redirect(`/organization/users${url.search}`);
}

/**
 * V3 application routes: authenticated process workspace plus global-admin
 * organization administration. Account and project access operations reuse
 * their existing backend APIs and keep global and project roles distinct.
 */
export const routes = [
  {
    loader: requireSession,
    children: [
      {
        path: '/organization/users',
        loader: requireGlobalAdmin,
        lazy: () => import('./Containers/UserAccounts'),
      },
      {
        path: '/organization/users/:username',
        loader: requireGlobalAdmin,
        lazy: () => import('./Containers/UserAccounts'),
      },
      {
        // Legacy alias: the canonical user directory is /organization/users.
        path: '/organization/accounts',
        loader: redirectLegacyAccounts,
      },
      {
        path: '/organization/functions',
        loader: requireGlobalAdmin,
        lazy: () => import('./Containers/JobFunctions'),
      },
      {
        path: '/organization/:section',
        loader: requireOrganizationSection,
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/',
        loader: () => redirect('/root'),
      },
      {
        path: '/home',
        loader: () => redirect('/root'),
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
        path: '/search',
        lazy: () => import('./Containers/SearchResults'),
      },
      {
        path: '/mes-demandes',
        lazy: () => import('./Containers/MyProcessChangeProposals/MyProcessChangeProposals.container'),
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
        lazy: () => import('./Containers/ProjectWorkspaceRedirect'),
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
        // Compatibility URL only: historical content is now rendered by the
        // canonical BpmnLayout / ProcessDetails viewer.
        path: '/:resourceId/viewer/:contentId',
        loader: ({
          params,
          request,
        }: {
          params: { resourceId?: string; contentId?: string };
          request: Request;
        }) => {
          const url = new URL(request.url);
          // The path contentId is authoritative; preserve elementId, raci,
          // and any other deep-link context in the query string.
          url.searchParams.set('contentId', params.contentId ?? '');
          return redirect(`/${params.resourceId}?${url.searchParams.toString()}`);
        },
      },
    ],
  },
  {
    path: '/login',
    lazy: () => import('./Containers/Login'),
  },
];
