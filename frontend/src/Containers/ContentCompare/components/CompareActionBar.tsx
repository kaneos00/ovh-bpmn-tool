import React from 'react';
import { Button, Stack } from '@mui/joy';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compare, Home } from '@mui/icons-material';

import { ActionBar } from '../../../Components/GenericComponents/ActionBar/ActionBar';
import { UserAccountMenu } from '../../../Components/GenericComponents/UserAccountMenu/UserAccountMenu';

type CompareActionBarProps = {
  resourceId: string;
  onDiffsDisplay: () => void;
};

export const CompareActionBar = ({
  resourceId,
  onDiffsDisplay,
}: CompareActionBarProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//')
    ? requestedReturnTo
    : `/${resourceId}`;

  return (
    <ActionBar>
      <Stack gap={1} direction="row">
        <Button
          variant="outlined"
          color="neutral"
          onClick={() => navigate(returnTo)}
        >
          <Home fontSize="small" />
        </Button>
        <Button
          onClick={onDiffsDisplay}
          variant="outlined"
          color="neutral"
          startDecorator={<Compare fontSize="small" />}
        >
          Voir les différences
        </Button>
      </Stack>
      <Stack gap={1} direction="row" justifyContent="flex-end">
        <UserAccountMenu dark={false} />
      </Stack>
    </ActionBar>
  );
};
