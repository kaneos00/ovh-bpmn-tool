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
 * Keep the simplified V3 shell while restoring the V2.3 explorer actions and
 * the project/folder home pages needed by the viewer workflow.
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
        path: '/projects/:projectId/viewer',
        lazy: () => import('./Containers/ContentViewer'),
      },
      {
        path: '/:resourceId',
        lazy: () => import('./Containers/BpmnLayout'),
        children: [
          { path: '/:resourceId/add', lazy: () => import('./Containers/AddResource') },
          { path: '/:resourceId/edit', lazy: () => import('./Containers/EditResource') },
          { path: '/:resourceId/share', lazy: () => import('./Containers/ShareResource') },
          { path: '/:resourceId/delete', lazy: () => import('./Containers/DeleteResource') },
        ],
      },
      {
        path: '/:resourceId/modeler',
        lazy: () => import('./Containers/ContentModeler'),
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
