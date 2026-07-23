// ─── Domain Types ─────────────────────────────────────────
// Shared type definitions for the multi-domain testing platform.
// Used by the domain registry, domain store, and layout navigation.

export type TestingDomainId =
  | 'api'
  | 'performance'
  | 'accessibility'
  | 'security'
  | 'visual';

export type DomainStatus = 'active' | 'coming_soon';

export interface DomainNavItem {
  href: string;
  label: string;
  icon: string; // material-symbols icon name
}

export interface TestingDomain {
  id: TestingDomainId;
  label: string;
  tagline: string;
  icon: string;           // material-symbols icon name
  gradient: string;       // CSS gradient for domain accent
  accentColor: string;    // primary accent hex
  description: string;
  navItems: DomainNavItem[];
  status: DomainStatus;
  /** Primary action button label (e.g. "New Request", "New Audit") */
  primaryAction: {
    label: string;
    icon: string;
    href: string;
  };
  /** Search placeholder text */
  searchPlaceholder: string;
  /** Domain-specific light mode background color tint */
  lightBg?: string;
  /** Primary orb glow color for mesh background */
  orbColor?: string;
}

/** Roadmap-only domains shown as disabled tiles */
export type RoadmapDomainId =
  | 'seo'
  | 'database'
  | 'compliance'
  | 'mobile_app';

export interface RoadmapDomain {
  id: RoadmapDomainId;
  label: string;
  icon: string;
  description: string;
  gradient: string;
  accentColor: string;
}
