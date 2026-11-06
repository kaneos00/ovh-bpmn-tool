import React, { ReactNode } from 'react';
import { Sheet } from '@mui/joy';
import { WorkspacePageHeader } from '../WorkspaceNavigation/WorkspaceNavigation';

type WorkspacePageLayoutProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared full-width shell for non-diagram workspace pages.
 * The global header and page gutters are defined here once so page containers
 * cannot drift apart when the navigation or page frame is adjusted.
 */
export const WorkspacePageLayout = ({ children, className }: WorkspacePageLayoutProps) => (
  <Sheet
    className={className}
    sx={{
      width: '100%',
      maxWidth: 'none',
      boxSizing: 'border-box',
      mx: 0,
      p: 2,
      bgcolor: 'transparent',
    }}
  >
    <WorkspacePageHeader />
    {children}
  </Sheet>
);
