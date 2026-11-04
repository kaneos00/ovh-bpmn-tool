import React from 'react';
import { Box, Button, ListItem, Typography } from '@mui/joy';

export type SearchResultBadge = {
  label: string;
  color: string;
  background: string;
  border: string;
};

type SearchResultItemProps = {
  badge: SearchResultBadge;
  title: React.ReactNode;
  detail: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

/** Shared result row used by the global search and the full search page. */
export const SearchResultItem = ({
  badge,
  title,
  detail,
  description,
  disabled = false,
  onClick,
}: SearchResultItemProps) => (
  <ListItem sx={{ p: 0 }}>
    <Button
      variant="plain"
      color="neutral"
      disabled={disabled}
      onClick={onClick}
      sx={{
        justifyContent: 'flex-start',
        textAlign: 'left',
        width: '100%',
        whiteSpace: 'normal',
        py: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0, width: '100%' }}>
        <Box
          component="span"
          aria-label={badge.label}
          sx={{
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mt: '1px',
            px: 0.75,
            py: 0.25,
            borderRadius: '5px',
            border: '1px solid',
            borderColor: badge.border,
            color: badge.color,
            bgcolor: badge.background,
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}
        >
          {badge.label}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography level="title-sm">{title}</Typography>
          {description && (
            <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {description}
            </Typography>
          )}
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{detail}</Typography>
        </Box>
      </Box>
    </Button>
  </ListItem>
);
