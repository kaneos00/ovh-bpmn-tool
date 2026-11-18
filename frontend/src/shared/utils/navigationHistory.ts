export type NavigationHistoryEntry = {
  key: string;
  href: string;
  label: string;
  visitedAt: number;
};

export type NavigationHistoryState = {
  entries: NavigationHistoryEntry[];
  index: number;
};

export const NAVIGATION_HISTORY_STORAGE_KEY = 'khi-flows-navigation-history';
export const NAVIGATION_HISTORY_EVENT = 'khi-navigation-history-updated';
export const RECENT_PAGES_STORAGE_KEY = 'khi-flows-recent-pages';
export const RECENT_PAGES_EVENT = 'khi-recent-pages-updated';

const emptyHistory = (): NavigationHistoryState => ({ entries: [], index: -1 });

export const readNavigationHistory = (): NavigationHistoryState => {
  if (typeof window === 'undefined') return emptyHistory();
  try {
    const value = JSON.parse(window.sessionStorage.getItem(NAVIGATION_HISTORY_STORAGE_KEY) || 'null');
    if (
      value &&
      Array.isArray(value.entries) &&
      Number.isInteger(value.index) &&
      value.index >= 0 &&
      value.index < value.entries.length
    ) {
      return value as NavigationHistoryState;
    }
  } catch {
    // Ignore malformed or unavailable browser storage.
  }
  return emptyHistory();
};

export const recordNavigation = (
  entry: NavigationHistoryEntry,
  navigationType: 'POP' | 'PUSH' | 'REPLACE',
): NavigationHistoryState => {
  const current = readNavigationHistory();
  const existingIndex = current.entries.findIndex(item => item.key === entry.key);
  let entries = [...current.entries];
  let index = current.index;

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
    index = existingIndex;
  } else if (navigationType === 'REPLACE' && index >= 0) {
    entries[index] = entry;
  } else {
    entries = entries.slice(0, index + 1);
    entries.push(entry);
    index = entries.length - 1;
  }

  // Keep a bounded session history while retaining the current position.
  if (entries.length > 100) {
    const removeCount = entries.length - 100;
    entries = entries.slice(removeCount);
    index = Math.max(0, index - removeCount);
  }

  const next = { entries, index };
  try {
    window.sessionStorage.setItem(NAVIGATION_HISTORY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NAVIGATION_HISTORY_EVENT));
  } catch {
    // Navigation itself must continue if storage is unavailable.
  }
  return next;
};

export const recordRecentPage = (entry: NavigationHistoryEntry): void => {
  if (entry.href === '/home' || entry.href === '/' || entry.href === '/login') return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_PAGES_STORAGE_KEY) || '[]');
    const pages = Array.isArray(stored) ? stored : [];
    const updated = [entry, ...pages.filter((page: { href?: string }) => page?.href !== entry.href)].slice(0, 10);
    window.localStorage.setItem(RECENT_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(RECENT_PAGES_EVENT));
  } catch {
    // Recent pages are a convenience; they must never block navigation.
  }
};
