import { redirect } from 'react-router-dom';
import { AuthGate } from './Providers/Auth/AuthGate';
import { AdminGate } from './Providers/Auth/AdminGate';
import { ModifyGate } from './Providers/Auth/ModifyGate';

export const routes = [
  {
    path: '/login',
    lazy: () => import('./Containers/Login'),
  },
  {
    path: '/setup',
    lazy: () => import('./Containers/Setup'),
  },
  {
    element: <AuthGate />,
    children: [
      {
        path: '/',
        loader: () => {
          return redirect('/root');
        },
      },
      {
        path: '/admin/users',
        element: <AdminGate />,
        children: [
          {
            index: true,
            lazy: () => import('./Containers/UserAdministration'),
          },
        ],
      },
      {
        path: '/:resourceId',
        lazy: () => import('./Containers/BpmnLayout'),
        children: [
          {
            element: <ModifyGate />,
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
            path: '/:resourceId/comments',
            lazy: () => import('./Containers/Comments'),
          },
        ],
      },
      {
        path: '/:resourceId/modeler',
        element: <ModifyGate />,
        children: [
          {
            index: true,
            lazy: () => import('./Containers/ContentModeler'),
          },
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
];

// ANCIEN CODE — conservé pour comparaison / retour arrière.
// Les routes applicatives étaient auparavant exposées sans AuthGate ni ModifyGate.
// L'administration utilisateurs et la première installation n'existaient pas.
