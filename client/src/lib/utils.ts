import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// CRM fetch helper: includes credentials and dispatches lock event on 403
export async function crmFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const resp = await fetch(input, { credentials: 'include', ...init });
  if (resp.status === 403) {
    try {
      // Fire a global event so dashboards/modals can react
      window.dispatchEvent(new CustomEvent('crm-manager-locked', { detail: { source: 'crmFetch', url: String(input) } }));
    } catch {}
  }
  return resp;
}
