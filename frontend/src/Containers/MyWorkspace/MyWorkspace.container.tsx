import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Compatibility route: personal workspace information is now consolidated
 * into the Projects landing page to avoid two competing project entry points.
 */
export const Component = () => <Navigate to="/projects" replace />;

Component.displayName = 'MyWorkspaceContainer';
