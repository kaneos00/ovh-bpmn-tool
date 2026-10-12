import { redirect } from 'react-router-dom';

export const routes = [
  {
    path: '/',
    loader: () => {
      return redirect(`/root`);
    },
  },
  {
    path: '/organization',
    loader: () => redirect('/organization/users'),
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
    path: '/projects',
    lazy: () => import('./Containers/Projects'),
  },
  {
    path: '/projects/:projectId',
    lazy: () => import('./Containers/Projects'),
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
];
