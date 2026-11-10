import React, { ReactNode } from 'react';
import { Chip, Stack } from '@mui/joy';
import { useNavigate } from 'react-router-dom';
import { WorkspacePageLayout } from '../../Components/GenericComponents/WorkspacePageLayout/WorkspacePageLayout';
import { Breadcrumbs, type BreadcrumbItem } from '../../Components/GenericComponents/Breadcrumbs/Breadcrumbs';

export type OrganizationAdminSection = 'overview' | 'users' | 'projects' | 'processes' | 'governance' | 'functions';

type OrganizationAdminLayoutProps = {
  activeSection: OrganizationAdminSection;
  title: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
};

const navigation: Array<{ key: OrganizationAdminSection; label: string; icon: string }> = [
  { key: 'overview', label: 'Vue d’ensemble', icon: '▦' },
  { key: 'users', label: 'Utilisateurs', icon: '♙' },
  { key: 'projects', label: 'Projets', icon: '▣' },
  { key: 'processes', label: 'Processus', icon: '⌘' },
  { key: 'governance', label: 'Acteurs et RACI', icon: '⬡' },
  { key: 'functions', label: 'Fiches de fonction', icon: '▤' },
];

export const OrganizationAdminLayout = ({
  activeSection,
  title,
  breadcrumbs,
  children,
}: OrganizationAdminLayoutProps) => {
  const navigate = useNavigate();

  return (
    <WorkspacePageLayout className="org-admin-v2__page">
      <Stack spacing={2}>
        <div className="org-admin-v2">
          <aside className="org-admin-v2__sidebar">
            <div className="org-admin-v2__brand">
              <img className="org-admin-v2__brand-logo" src="/bpmn-tool-logo.svg" alt="" />
              <div><strong>KHI Flows</strong><small>Organisation</small></div>
            </div>
            <div className="org-admin-v2__nav-group">
              <div className="org-admin-v2__nav-label">Administration</div>
              <nav className="org-admin-v2__nav" aria-label="Navigation de l’administration">
                {navigation.map((item) => (
                  <button
                    type="button"
                    key={item.key}
                    className={`org-admin-v2__nav-item${activeSection === item.key ? ' is-active' : ''}`}
                    aria-current={activeSection === item.key ? 'page' : undefined}
                    onClick={() => navigate(`/organization/${item.key}`)}
                  >
                    <span className="org-admin-v2__nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="org-admin-v2__sidebar-foot">
              <strong>Accès sécurisés</strong>
              <span>Les droits sont contrôlés par l’API, indépendamment de l’interface.</span>
            </div>
          </aside>
          <main className="org-admin-v2__main">
            <header className="org-admin-v2__topbar">
              <div>
                <div className="org-admin-v2__crumb">
                  <Breadcrumbs breadcrumbItems={breadcrumbs} />
                </div>
                <div className="org-admin-v2__top-title">{title}</div>
              </div>
              <Chip size="sm" color="primary" variant="soft">Accès organisationnel</Chip>
            </header>
            <div className="org-admin-v2__content">{children}</div>
          </main>
        </div>
      </Stack>
    </WorkspacePageLayout>
  );
};
