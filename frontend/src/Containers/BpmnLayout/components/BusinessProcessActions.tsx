import React from 'react';
import { ChevronRight } from '@mui/icons-material';

import { ActionButton } from '../../../Components/GenericComponents/ActionButton/ActionButton';

type BusinessProcessActionsProps = {
  onModelerBtnClick: () => void;
};

/** V3 keeps the Modeler entry point and hides resource-management actions. */
export const BusinessProcessActions = ({
  onModelerBtnClick,
}: BusinessProcessActionsProps) => (
  <ActionButton
    onClick={onModelerBtnClick}
    content="Modeleur"
    label="Ouvrir le modeleur BPMN"
    rightIcon={<ChevronRight fontSize="small" />}
  />
);
