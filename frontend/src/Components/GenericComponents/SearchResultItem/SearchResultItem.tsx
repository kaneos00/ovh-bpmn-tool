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
  query?: string;
};

/** Shared result row used by the global search and the full search page. */
export const SearchResultItem = ({
  badge,
  title,
  detail,
  description,
  disabled = false,
  onClick,
  query = '',
}: SearchResultItemProps) => {
  const highlight = (node: React.ReactNode): React.ReactNode => {
    if (!query.trim()) return node;
    if (typeof node === 'string' || typeof node === 'number') {
      const value = String(node);
      const term = query.trim();
      const normalized = (input: string) => input
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .toLocaleLowerCase('fr');
      const sourceMap: Array<{ start: number; end: number }> = [];
      let searchable = '';
      let sourceOffset = 0;
      for (const character of value) {
        const normalizedCharacter = normalized(character);
        for (let index = 0; index < normalizedCharacter.length; index += 1) {
          searchable += normalizedCharacter[index];
          sourceMap.push({ start: sourceOffset, end: sourceOffset + character.length });
        }
        sourceOffset += character.length;
      }
      const normalizedTerm = normalized(term);
      if (!normalizedTerm) return node;
      const parts: React.ReactNode[] = [];
      let cursor = 0;
      let match = searchable.indexOf(normalizedTerm, cursor);
      while (match !== -1) {
        const start = sourceMap[match]?.start;
        const end = sourceMap[match + normalizedTerm.length - 1]?.end;
        if (start === undefined || end === undefined) break;
        if (start > cursor) parts.push(value.slice(cursor, start));
        parts.push(
          <Box
            component="mark"
            key={`match-${start}-${end}`}
            sx={{ bgcolor: '#fff1a8', color: 'inherit', px: 0.15, borderRadius: '2px' }}
          >
            {value.slice(start, end)}
          </Box>,
        );
        cursor = end;
        match = searchable.indexOf(normalizedTerm, match + normalizedTerm.length);
      }
      if (!parts.length) return node;
      if (cursor < value.length) parts.push(value.slice(cursor));
      return <>{parts}</>;
    }
    if (Array.isArray(node)) return node.map((child, index) => <React.Fragment key={index}>{highlight(child)}</React.Fragment>);
    if (React.isValidElement(node)) {
      return React.cloneElement(node as React.ReactElement<any>, undefined, highlight(node.props.children));
    }
    return node;
  };

  return (
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
          <Typography level="title-sm">{highlight(title)}</Typography>
          {description && (
            <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {highlight(description)}
            </Typography>
          )}
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>{highlight(detail)}</Typography>
        </Box>
      </Box>
    </Button>
  </ListItem>
  );
};
