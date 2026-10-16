import React, { FC } from 'react';
import { ArrowBack, ChevronRight, Home } from '@mui/icons-material';
import {
  Breadcrumbs as MUIBreadcrumbs,
  Link,
  IconButton,
  Typography,
  Skeleton,
} from '@mui/joy';
import Box from '@mui/joy/Box';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export type BreadcrumbItem = {
  id: string;
  to: string;
  label: string;
};

type BreadcrumbsProps = {
  isLoading?: boolean;
  breadcrumbItems: BreadcrumbItem[];
};

export const Breadcrumbs: FC<BreadcrumbsProps> = ({
  isLoading,
  breadcrumbItems,
}) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {isLoading ? (
        <Skeleton variant="text" width={500} height={24} />
      ) : (
        <>
          {breadcrumbItems.length > 0 && (
            <IconButton
              size="sm"
              variant="plain"
              color="neutral"
              aria-label="Revenir à la page précédente"
              title="Revenir à la page précédente"
              onClick={() => navigate(-1)}
              sx={{ mr: 0.5, flexShrink: 0 }}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
          )}
          <MUIBreadcrumbs
            size="sm"
            aria-label="breadcrumbs"
            separator={<ChevronRight />}
            sx={{
              '--Breadcrumbs-gap': '1rem',
              '--Icon-fontSize': '16px',
              fontWeight: 'lg',
              color: 'neutral.400',
              px: 0,
            }}
          >
            {breadcrumbItems.map((breadcrumbItem, index) => (
              <React.Fragment key={breadcrumbItem.id}>
                {index === breadcrumbItems.length - 1 ? (
                  <Typography fontSize="inherit">
                    {breadcrumbItem.id === 'root' ? (
                      <Home />
                    ) : (
                      breadcrumbItem.label
                    )}
                  </Typography>
                ) : (
                  <Link
                    underline="none"
                    color="neutral"
                    fontSize="inherit"
                    component={RouterLink}
                    to={breadcrumbItem.to}
                  >
                    {breadcrumbItem.id === 'root' ? (
                      <Home />
                    ) : (
                      breadcrumbItem.label
                    )}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </MUIBreadcrumbs>
        </>
      )}
    </Box>
  );
};
