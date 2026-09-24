/*
============================================================
ANCIENNE VERSION — conservée pour comparaison / retour arrière
============================================================

Le composant ci-dessous est nouveau dans cette branche.
Il n'existe donc pas d'ancienne version de ce fichier.

============================================================
FIN ANCIENNE VERSION
============================================================
*/

import React from 'react';

import { createRepositoryRechercheProvider } from './recherche-repository-provider';
import type { RechercheContext, RechercheResult, RechercheScope } from './recherche-service';

const SEARCH_BAR_ID = 'bpmn-recherche-global-bar';

const sourceLabels: Record<string, string> = {
  process: 'Processus',
  bpmn: 'BPMN',
  procedure: 'Procédure',
  role: 'Rôle',
  raci: 'RACI',
  ai: 'IA',
};

const sourceFilters = [
  ['all', 'Tous les types'],
  ['process', 'Processus'],
  ['bpmn', 'BPMN'],
  ['procedure', 'Procédures'],
  ['role', 'Rôles'],
  ['raci', 'RACI'],
  ['ai', 'IA'],
] as const;

const getResourceIdFromPath = () => {
  const basePath = (import.meta.env.VITE_APP_BASE_PATH as string || '').replace(/\/$/, '');
  const pathname = window.location.pathname;
  const relativePath = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  return relativePath.split('/').filter(Boolean)[0];
};

const navigateToResult = (result: RechercheResult) => {
  console.debug('[Recherche] navigate', result.link, result);
  if (result.link) {
    window.location.assign(result.link);
  } else {
    console.warn('[Recherche] result has no link', result);
  }
};

export const RechercheBar = () => {
  const [query, setQuery] = React.useState('');
  const [source, setSource] = React.useState('all');
  const [scope, setScope] = React.useState<RechercheScope>('all-processes');
  const [results, setResults] = React.useState<RechercheResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestRef = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const providerRef = React.useRef(createRepositoryRechercheProvider());

  const runSearch = React.useCallback(async (
    nextQuery = query,
    nextScope = scope,
    nextSource = source,
  ) => {
    const currentRequest = ++requestRef.current;
    const trimmedQuery = nextQuery.trim();
    console.debug('[Recherche] runSearch', { query: trimmedQuery, scope: nextScope, source: nextSource });

    if (!trimmedQuery) {
      setLoading(false);
      setResults([]);
      return;
    }

    setLoading(true);

    const context: RechercheContext = {
      scope: nextScope,
      processId: nextScope === 'current-process' ? getResourceIdFromPath() : undefined,
    };

    try {
      console.debug('[Recherche] provider:start', context);
      const found = await providerRef.current(trimmedQuery, context);
      console.debug('[Recherche] provider:done', { count: found.length, results: found });
      const filtered = nextSource === 'all'
        ? found
        : found.filter(result => result.sourceType === nextSource);

      console.debug('[Recherche] filtered', { count: filtered.length, results: filtered });

      if (currentRequest === requestRef.current) {
        setResults(filtered);
        setLoading(false);
      }
    } catch (error) {
      console.error('[Recherche] search:error', error);
      if (currentRequest === requestRef.current) {
        setResults([]);
        setLoading(false);
      }
    }
  }, [query, scope, source]);

  React.useEffect(() => {
    const focusSearch = () => inputRef.current?.focus();

    window.addEventListener('recherche:focus', focusSearch);
    return () => window.removeEventListener('recherche:focus', focusSearch);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleScopeChange = (value: RechercheScope) => {
    setScope(value);
    void runSearch(query, value, source);
  };

  const handleSourceChange = (value: string) => {
    setSource(value);
    void runSearch(query, scope, value);
  };

  return (
    <div
      id={SEARCH_BAR_ID}
      style={{
        position: 'relative',
        zIndex: 1000,
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 16px',
        borderBottom: '1px solid #ddd',
        background: '#fff',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
        }}
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Rechercher dans les processus…"
          autoComplete="off"
          aria-label="Recherche"
          onChange={event => {
            const value = event.target.value;
            setQuery(value);
            void runSearch(value, scope, source);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              void runSearch();
            }
            if (event.key === 'Escape') {
              setResults([]);
            }
          }}
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            height: '38px',
            padding: '8px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            outline: 'none',
          }}
        />

        <button
          type="button"
          title="Lancer la recherche"
          aria-label="Lancer la recherche"
          onClick={() => void runSearch()}
          style={{
            width: '38px',
            height: '38px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '17px',
          }}
        >
          🔍
        </button>

        <select
          aria-label="Type de résultat"
          title="Type de résultat"
          value={source}
          onChange={event => handleSourceChange(event.target.value)}
          style={{ height: '38px', padding: '0 6px' }}
        >
          {sourceFilters.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          aria-label="Périmètre de recherche"
          title="Périmètre de recherche"
          value={scope}
          onChange={event => handleScopeChange(event.target.value as RechercheScope)}
          style={{ height: '38px', padding: '0 6px' }}
        >
          <option value="current-process">Ce processus</option>
          <option value="all-processes">Tous les processus</option>
        </select>
      </div>

      {(loading || results.length > 0) && (
        <div
          style={{
            marginTop: '4px',
            maxHeight: '45vh',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: '#fff',
          }}
        >
          {loading && (
            <div style={{ padding: '10px 12px', color: '#777', fontSize: '12px' }}>
              Recherche…
            </div>
          )}

          {!loading && results.map(result => (
            <button
              key={result.link || result.id}
              type="button"
              onClick={() => navigateToResult(result)}
              style={{
                display: 'block',
                width: '100%',
                padding: '9px 12px',
                border: '0',
                borderBottom: '1px solid #eee',
                background: '#fff',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '10px',
                  padding: '2px 6px',
                  marginBottom: '4px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  color: '#666',
                }}
              >
                {sourceLabels[result.sourceType || 'bpmn'] || result.sourceType || 'BPMN'}
              </span>
              <div style={{ fontWeight: 600 }}>
                {result.name || result.id || result.processName || 'Résultat'}
              </div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>
                {[result.type, result.processName, result.resourceName, result.role, result.raci]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </button>
          ))}

          {!loading && !results.length && (
            <div style={{ padding: '10px 12px', color: '#777', fontSize: '12px' }}>
              Aucun résultat
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RechercheBar;
