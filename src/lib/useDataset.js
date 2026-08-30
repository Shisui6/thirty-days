import { useCallback, useEffect, useState } from 'react';
import { normalise } from './state.js';

/**
 * The dataset is fetched at runtime rather than imported at build time.
 *
 * That's deliberate: the daily sync commits a new state.json, and a runtime
 * fetch means the page is live the moment the commit lands — no rebuild, and
 * no window where a failed CI build leaves the site showing last week.
 */
const DATA_URL = `${import.meta.env.BASE_URL}data/state.json`;

export function useDataset() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cache-bust so a phone that has the page installed doesn't serve
      // yesterday's dataset from the HTTP cache.
      const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setState(normalise(await res.json()));
    } catch (e) {
      setError(e.message || 'Could not load the dataset');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch when the page comes back into view, so opening it from the home
  // screen after a few days shows current data without a manual reload.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  return { state, error, loading, reload: load };
}
