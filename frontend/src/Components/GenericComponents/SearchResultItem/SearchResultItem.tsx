import React, { cloneElement, isValidElement } from 'react';
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
  processName?: string;
  similarity?: number;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

const editDistance = (left: string, right: string): number => {
  const initialRow = Array.from({ length: right.length + 1 }, (_, index) => index);
  let previous = initialRow;
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
};

const highlightText = (value: string, query: string): React.ReactNode => {
  const term = normalize(query.trim());
  if (!term) return value;

  const sourceMap: Array<{ start: number; end: number }> = [];
  let searchable = '';
  let sourceOffset = 0;

  for (const character of value) {
    const normalizedCharacter = normalize(character);
    for (let index = 0; index < normalizedCharacter.length; index += 1) {
      searchable += normalizedCharacter[index];
      sourceMap.push({ start: sourceOffset, end: sourceOffset + character.length });
    }
    sourceOffset += character.length;
  }

  const queryWords = term.split(/[^a-z0-9]+/).filter(Boolean);
  const valueWords = [...searchable.matchAll(/[a-z0-9]+/g)];
  const ranges: Array<{ start: number; end: number }> = [];

  for (const queryWord of queryWords) {
    let best: { start: number; end: number; distance: number; exact: boolean } | undefined;
    for (const token of valueWords) {
      const candidate = token[0];
      const tokenStart = token.index ?? 0;
      const tokenEnd = tokenStart + candidate.length;
      const substringIndex = candidate.indexOf(queryWord);
      if (substringIndex !== -1) {
        const exactRange = {
          start: tokenStart + substringIndex,
          end: tokenStart + substringIndex + queryWord.length,
          distance: 0,
          exact: true,
        };
        if (!best || !best.exact) best = exactRange;
        continue;
      }

      if (queryWord.length < 5) continue;
      const maxDistance = queryWord.length >= 8 ? 2 : 1;
      if (Math.abs(candidate.length - queryWord.length) > maxDistance) continue;
      const distance = editDistance(candidate, queryWord);
      if (distance <= maxDistance && (!best || (!best.exact && distance < best.distance))) {
        best = { start: tokenStart, end: tokenEnd, distance, exact: false };
      }
    }

    if (best) {
      const start = sourceMap[best.start]?.start;
      const end = sourceMap[best.end - 1]?.end;
      if (start !== undefined && end !== undefined) ranges.push({ start, end });
    }
  }

  const mergedRanges = ranges
    .sort((a, b) => a.start - b.start)
    .reduce<Array<{ start: number; end: number }>>((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
      else merged.push({ ...range });
      return merged;
    }, []);

  if (!mergedRanges.length) return value;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  mergedRanges.forEach(({ start, end }) => {
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
  });
  if (cursor < value.length) parts.push(value.slice(cursor));
  return <>{parts}</>;
};

const highlightNode = (node: React.ReactNode, query: string): React.ReactNode => {
  if (!query.trim()) return node;
  if (typeof node === 'string' || typeof node === 'number') {
    return highlightText(String(node), query);
  }
  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <React.Fragment key={index}>{highlightNode(child, query)}</React.Fragment>
    ));
  }
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return cloneElement(node, undefined, highlightNode(node.props.children, query));
  }
  return node;
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
  processName,
  similarity,
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
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {processName && processName !== title && (
            <Typography level="title-sm" sx={{ fontWeight: 800 }}>
              {highlightNode(processName, query)}
            </Typography>
          )}
          <Typography level={processName ? 'body-sm' : 'title-sm'} sx={processName ? { fontWeight: 650, mt: 0.15 } : undefined}>
            {highlightNode(title, query)}
          </Typography>
          {description && (
            <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {highlightNode(description, query)}
            </Typography>
          )}
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            {highlightNode(detail, query)}
          </Typography>
        </Box>
        {typeof similarity === 'number' && (
          <Box
            component="span"
            aria-label={`Similarité ${similarity} pour cent`}
            sx={{ flex: '0 0 auto', ml: 1, px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: 'neutral.softBg', color: 'text.secondary', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
          >
            {similarity} %
          </Box>
        )}
      </Box>
    </Button>
  </ListItem>
);
