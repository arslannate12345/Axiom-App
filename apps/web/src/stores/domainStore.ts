import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TestingDomainId } from '@axiom/core/types';
import { DEFAULT_DOMAIN, getDomain } from '@/lib/domainRegistry';

interface DomainState {
  activeDomainId: TestingDomainId;
  setDomain: (id: TestingDomainId) => void;
}

export const useDomainStore = create<DomainState>()(
  persist(
    (set) => ({
      activeDomainId: DEFAULT_DOMAIN,

      setDomain: (id) => {
        // Validate the domain exists before setting
        const domain = getDomain(id);
        if (domain) {
          set({ activeDomainId: id });
        }
      },
    }),
    {
      name: 'axiom-domain',
    },
  ),
);

// ─── Selectors ─────────────────────────────────────────────

/** Get the full domain config for the active domain */
export function useActiveDomain() {
  const id = useDomainStore((s) => s.activeDomainId);
  return getDomain(id);
}
