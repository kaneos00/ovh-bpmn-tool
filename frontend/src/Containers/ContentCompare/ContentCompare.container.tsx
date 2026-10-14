import React from 'react';

import { Compare } from '../../Components/BusinessComponents/Compare/Compare';
import { useCompareData } from './hooks/useCompareData';
import { CompareActionBar } from './components/CompareActionBar';

export const Component = () => {
  const {
    resourceId,
    leftContent,
    rightContent,
    isDiffsModalOpen,
    leftXmlContent,
    rightXmlContent,
    hasError,
    isLoading,
    leftResourceId,
    rightResourceId,
    setIsDiffsModalOpen,
  } = useCompareData();

  return (
    <>
      <CompareActionBar
        resourceId={resourceId}
        onDiffsDisplay={() => setIsDiffsModalOpen(true)}
      />
      {isLoading ? (
        <>Chargement de la comparaison…</>
      ) : hasError ? (
        <div role="alert" style={{ padding: 24 }}>
          Impossible de charger les deux processus. Vérifiez vos droits d’accès et la disponibilité des versions comparées.
        </div>
      ) : !leftContent || !rightContent ? (
        <>Versions de processus introuvables.</>
      ) : (
        <Compare
          leftContent={leftXmlContent}
          rightContent={rightXmlContent}
          isDiffsModalOpen={isDiffsModalOpen}
          setIsDiffsModalOpen={setIsDiffsModalOpen}
          leftSideTitle={`${leftResourceId} · ${leftContent.status} v${leftContent.version ?? '?'}`}
          rightSideTitle={`${rightResourceId} · ${rightContent.status} v${rightContent.version ?? '?'}`}
        />
      )}
    </>
  );
};

Component.displayName = 'ContentCompareContainer';
