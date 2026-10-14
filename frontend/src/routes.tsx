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
    // An unavailable session endpoint must fail closed, not expose app routes.
  }
  throw redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
}

export const routes = [
  {
    loader: requireSession,
    children: [
      {
        path: '/',
        loader: () => redirect('/root'),
      },
      {
        path: '/organization',
        loader: () => redirect('/organization/overview'),
      },
      {
        path: '/organization/overview',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/organization/governance',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/organization/settings',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/organization/users',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/organization/projects',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/organization/processes',
        lazy: () => import('./Containers/OrganizationAdmin'),
      },
      {
        path: '/workspace',
        lazy: () => import('./Containers/MyWorkspace'),
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
        path: '/compare-resources/:leftResourceId/:leftContentId/:rightResourceId/:rightContentId',
        lazy: () => import('./Containers/ContentCompare'),
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
            path: '/:resourceId/comments',
            lazy: () => import('./Containers/Comments'),
          },
          {
            path: '/:resourceId/publish',
            lazy: () => import('./Containers/PublishResource'),
          },
        ],
      },
      {
        path: '/:resourceId/modeler',
        lazy: () => import('./Containers/ContentModeler'),
        children: [
          {
            path: '/:resourceId/modeler/publish',
            lazy: () => import('./Containers/PublishResource'),
          },
        ],
      },
      {
        path: '/:resourceId/viewer/:contentId',
        lazy: () => import('./Containers/ContentViewer'),
      },
      {
        path: '/:resourceId/compare/:leftContentId/:rightContentId',
        lazy: () => import('./Containers/ContentCompare'),
      },
    ],
  },
  {
    path: '/login',
    lazy: () => import('./Containers/Login'),
  },
];
