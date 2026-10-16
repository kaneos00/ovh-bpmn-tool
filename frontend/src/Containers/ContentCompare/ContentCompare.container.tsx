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
    leftResource,
    rightResource,
    setIsDiffsModalOpen,
  } = useCompareData();

  let comparisonContent: React.ReactNode;

  if (isLoading) {
    comparisonContent = <>Chargement de la comparaison…</>;
  } else if (hasError) {
    comparisonContent = (
      <div role="alert" style={{ padding: 24 }}>
        Impossible de charger les deux processus. Vérifiez vos droits d’accès et la disponibilité des versions comparées.
      </div>
    );
  } else if (!leftContent || !rightContent) {
    comparisonContent = <>Versions de processus introuvables.</>;
  } else {
    comparisonContent = (
      <Compare
        leftContent={leftXmlContent}
        rightContent={rightXmlContent}
        isDiffsModalOpen={isDiffsModalOpen}
        setIsDiffsModalOpen={setIsDiffsModalOpen}
        leftSideTitle={`${leftResource?.name ?? leftResourceId} · ${leftContent.status} v${leftContent.version ?? '?'}`}
        rightSideTitle={`${rightResource?.name ?? rightResourceId} · ${rightContent.status} v${rightContent.version ?? '?'}`}
      />
    );
  }

  return (
    <>
      <CompareActionBar
        resourceId={resourceId}
        onDiffsDisplay={() => setIsDiffsModalOpen(true)}
      />
      {comparisonContent}
    </>
  );
};

Component.displayName = 'ContentCompareContainer';
