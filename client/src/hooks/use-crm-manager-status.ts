import { useEffect, useMemo, useRef, useState } from 'react';
import { crmFetch } from '@/lib/utils';

type ManagerStatus = {
  unlocked: boolean;
  remainingMs: number;
  ttlMs: number;
  isExpiringWarning: boolean; // true if < 60s remaining
};

export function useCrmManagerStatus(pollMs: number = 10000) {
  const [status, setStatus] = useState<ManagerStatus>({ unlocked: false, remainingMs: 0, ttlMs: 0, isExpiringWarning: false });
  const lastFetchAt = useRef<number>(Date.now());
  const wasUnlocked = useRef<boolean>(false);
  const hasWarnedExpiry = useRef<boolean>(false);

  // Smooth countdown tick every 1s based on last server reading
  useEffect(() => {
    const tick = setInterval(() => {
      setStatus((prev) => {
        if (!prev.unlocked || prev.remainingMs <= 0) return prev;
        const delta = Date.now() - lastFetchAt.current;
        const estRemaining = Math.max(0, prev.remainingMs - delta);
        const isExpiringWarning = estRemaining <= 60000 && estRemaining > 0; // 60s warning
        
        // Reset base for next tick
        lastFetchAt.current = Date.now();
        const next = { ...prev, remainingMs: estRemaining, unlocked: estRemaining > 0, isExpiringWarning };
        
        // Fire warning event at 60s mark
        if (isExpiringWarning && !hasWarnedExpiry.current && estRemaining > 0) {
          hasWarnedExpiry.current = true;
          try { 
            window.dispatchEvent(new CustomEvent('crm-manager-expiring-soon', { 
              detail: { remainingMs: estRemaining, source: 'useCrmManagerStatus' } 
            })); 
          } catch {}
        }
        
        // Fire lock event when expired
        if (prev.unlocked && !next.unlocked) {
          hasWarnedExpiry.current = false; // Reset for next session
          try { window.dispatchEvent(new CustomEvent('crm-manager-locked', { detail: { source: 'useCrmManagerStatus' } })); } catch {}
        }
        
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Poll server periodically for authoritative values
  useEffect(() => {
    let stop = false;
    async function fetchStatus() {
      try {
        const resp = await crmFetch('/api/crm/auth/manager-status');
        if (!resp.ok) return; // 401 means not authenticated; ignore
        const data = await resp.json();
        if (stop) return;
        setStatus((prev) => {
          lastFetchAt.current = Date.now();
          const remainingMs = Math.max(0, Number(data.remainingMs) || 0);
          const isExpiringWarning = remainingMs <= 60000 && remainingMs > 0;
          const next = {
            unlocked: !!data.unlocked && remainingMs > 0,
            remainingMs,
            ttlMs: Math.max(0, Number(data.ttlMs) || 0),
            isExpiringWarning,
          } as ManagerStatus;
          if (wasUnlocked.current && !next.unlocked) {
            hasWarnedExpiry.current = false; // Reset for next session
            try { window.dispatchEvent(new CustomEvent('crm-manager-locked', { detail: { source: 'useCrmManagerStatus:poll' } })); } catch {}
          }
          wasUnlocked.current = next.unlocked;
          return next;
        });
      } catch {}
    }
    fetchStatus();
    const id = setInterval(fetchStatus, pollMs);
    return () => { stop = true; clearInterval(id); };
  }, [pollMs]);

  const formatted = useMemo(() => {
    const sec = Math.ceil(status.remainingMs / 1000);
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, [status.remainingMs]);

  return { ...status, formatted };
}
