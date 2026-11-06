import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActiveProject } from '../../shared/hooks/useActiveProject';

export const Component = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setActiveProject } = useActiveProject();

  useEffect(() => {
    if (projectId) setActiveProject(projectId);
    navigate('/root', { replace: true });
  }, [projectId, setActiveProject, navigate]);

  return null;
};

Component.displayName = 'ProjectWorkspaceRedirect';
