import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';

import {
  getContentQuery,
  getXmlContentQuery,
} from '../../../api/contents/contents.queries';
import type { CompareRouteParams } from '..';

export const useCompareData = () => {
  const [isDiffsModalOpen, setIsDiffsModalOpen] = useState(false);

  const params = useParams() as CompareRouteParams;
  const leftResourceId = params.leftResourceId ?? params.resourceId ?? '';
  const rightResourceId = params.rightResourceId ?? params.resourceId ?? '';
  const { leftContentId, rightContentId } = params;
  const resourceId = rightResourceId;

  const { data: leftContent, isLoading: isLeftContentLoading, isError: isLeftContentError } = useQuery({
    ...getContentQuery(leftResourceId, leftContentId),
    enabled: Boolean(leftResourceId && leftContentId),
  });

  const { data: rightContent, isLoading: isRightContentLoading, isError: isRightContentError } = useQuery({
    ...getContentQuery(rightResourceId, rightContentId),
    enabled: Boolean(rightResourceId && rightContentId),
  });

  const { data: leftXmlContent, isLoading: isLeftXmlContentLoading, isError: isLeftXmlContentError } = useQuery({
    ...getXmlContentQuery(leftResourceId, leftContentId),
    enabled: Boolean(leftResourceId && leftContentId),
  });

  const { data: rightXmlContent, isLoading: isRightXmlContentLoading, isError: isRightXmlContentError } = useQuery({
    ...getXmlContentQuery(rightResourceId, rightContentId),
    enabled: Boolean(rightResourceId && rightContentId),
  });

  return {
    resourceId,
    leftResourceId,
    rightResourceId,
    leftContent,
    leftXmlContent: leftXmlContent ?? '',
    rightXmlContent: rightXmlContent ?? '',
    rightContent,
    isLoading:
      isLeftContentLoading ||
      isRightContentLoading ||
      isLeftXmlContentLoading ||
      isRightXmlContentLoading,
    hasError:
      isLeftContentError ||
      isRightContentError ||
      isLeftXmlContentError ||
      isRightXmlContentError,
    isDiffsModalOpen,
    setIsDiffsModalOpen,
  };
};
