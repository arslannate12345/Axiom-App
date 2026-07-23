import type { TestingDomain, TestingDomainId, RoadmapDomain } from '@axiom/core/types';

// ─── Active Domains ────────────────────────────────────────

export const DOMAINS: Record<TestingDomainId, TestingDomain> = {
  api: {
    id: 'api',
    label: 'API Testing',
    tagline: 'Build, test & benchmark your APIs',
    icon: 'api',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    accentColor: '#6366F1',
    description: 'Full-featured API client with collections, environments, 6 test suites, and automated reporting.',
    navItems: [
      { href: '/client', label: 'Client', icon: 'api' },
      { href: '/collections', label: 'Collections', icon: 'folder_open' },
      { href: '/environments', label: 'Environments', icon: 'settings_input_component' },
      { href: '/tests', label: 'Tests', icon: 'checklist' },
      { href: '/reports', label: 'Reports', icon: 'description' },
      { href: '/history', label: 'History', icon: 'history' },
    ],
    status: 'active',
    primaryAction: {
      label: 'New Request',
      icon: 'add',
      href: '/client',
    },
    searchPlaceholder: 'Search requests...',
    lightBg: '#F8FAFC',
    orbColor: 'rgba(99, 102, 241, 0.08)',
  },

  performance: {
    id: 'performance',
    label: 'Performance',
    tagline: 'Core Web Vitals & site speed audits',
    icon: 'speed',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    accentColor: '#F59E0B',
    description: 'One-click Lighthouse-backed site audits with Core Web Vitals, load waterfall, and performance scoring.',
    navItems: [
      { href: '/performance', label: 'Audit', icon: 'speed' },
      { href: '/performance/history', label: 'History', icon: 'history' },
      { href: '/performance/reports', label: 'Reports', icon: 'description' },
    ],
    status: 'active',
    primaryAction: {
      label: 'New Audit',
      icon: 'bolt',
      href: '/performance',
    },
    searchPlaceholder: 'Search audits...',
    lightBg: '#FFF7ED',
    orbColor: 'rgba(245, 158, 11, 0.14)',
  },

  accessibility: {
    id: 'accessibility',
    label: 'Accessibility',
    tagline: 'WCAG compliance & a11y audits',
    icon: 'accessibility_new',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    accentColor: '#10B981',
    description: 'WCAG violations, contrast analysis, ARIA/alt-text checks, and accessibility scoring.',
    navItems: [
      { href: '/accessibility', label: 'Audit', icon: 'accessibility_new' },
      { href: '/accessibility/history', label: 'History', icon: 'history' },
      { href: '/accessibility/reports', label: 'Reports', icon: 'description' },
    ],
    status: 'active',
    primaryAction: {
      label: 'New Scan',
      icon: 'search',
      href: '/accessibility',
    },
    searchPlaceholder: 'Search scans...',
    lightBg: '#F0FDF4',
    orbColor: 'rgba(16, 185, 129, 0.14)',
  },

  security: {
    id: 'security',
    label: 'Security',
    tagline: 'Headers, TLS & vulnerability scanning',
    icon: 'shield',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    accentColor: '#EF4444',
    description: 'Web security checks: TLS/certificate validity, security headers, cookie flags, and exposed path scanning.',
    navItems: [
      { href: '/security-web', label: 'Scanner', icon: 'shield' },
      { href: '/security-web/history', label: 'History', icon: 'history' },
      { href: '/security-web/reports', label: 'Reports', icon: 'description' },
    ],
    status: 'active',
    primaryAction: {
      label: 'New Scan',
      icon: 'security',
      href: '/security-web',
    },
    searchPlaceholder: 'Search scans...',
    lightBg: '#FEF2F2',
    orbColor: 'rgba(239, 68, 68, 0.14)',
  },

  visual: {
    id: 'visual',
    label: 'Visual & Responsive',
    tagline: 'Screenshot diffing & breakpoint testing',
    icon: 'devices',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    accentColor: '#8B5CF6',
    description: 'Capture screenshots at multiple breakpoints and detect visual regressions between runs.',
    navItems: [
      { href: '/visual', label: 'Capture', icon: 'photo_camera' },
      { href: '/visual/diffs', label: 'Diffs', icon: 'compare' },
      { href: '/visual/history', label: 'History', icon: 'history' },
      { href: '/visual/reports', label: 'Reports', icon: 'description' },
    ],
    status: 'active',
    primaryAction: {
      label: 'New Capture',
      icon: 'photo_camera',
      href: '/visual',
    },
    searchPlaceholder: 'Search captures...',
    lightBg: '#F5F3FF',
    orbColor: 'rgba(139, 92, 246, 0.14)',
  },

  database: {
    id: 'database',
    label: 'Database Testing',
    tagline: 'Endpoint health, latency & query integrity',
    icon: 'database',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0D9488 100%)',
    accentColor: '#06B6D4',
    description: 'API-driven database health checks: connection latency, schema validation, CRUD response, and integrity scanning.',
    navItems: [
      { href: '/database', label: 'Engine', icon: 'database' },
      { href: '/database/history', label: 'History', icon: 'history' },
      { href: '/database/reports', label: 'Reports', icon: 'description' },
    ],
    status: 'active',
    primaryAction: {
      label: 'New DB Audit',
      icon: 'database',
      href: '/database',
    },
    searchPlaceholder: 'Search database audits...',
    lightBg: '#ECFEFF',
    orbColor: 'rgba(6, 182, 212, 0.14)',
  },
};

// ─── Roadmap Domains ───────────────────────────────────────

export const ROADMAP_DOMAINS: RoadmapDomain[] = [
  {
    id: 'seo',
    label: 'SEO Audit',
    icon: 'travel_explore',
    description: 'Meta tags, headings, broken links, and search engine optimization scoring.',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    accentColor: '#06B6D4',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: 'verified_user',
    description: 'Regulatory and compliance scanning for GDPR, HIPAA, PCI-DSS, and SOC2.',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
    accentColor: '#0EA5E9',
  },
  {
    id: 'mobile_app',
    label: 'Mobile App Testing',
    icon: 'phone_android',
    description: 'Automated mobile app testing leveraging the Axiom native app.',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
    accentColor: '#A855F7',
  },
];

// ─── Helpers ───────────────────────────────────────────────

export const DOMAIN_IDS = Object.keys(DOMAINS) as TestingDomainId[];

export const DEFAULT_DOMAIN: TestingDomainId = 'api';

export function getDomain(id: TestingDomainId): TestingDomain {
  return DOMAINS[id];
}

export function getDomainForRoute(pathname: string): TestingDomainId {
  // Match the current pathname to a domain based on its navItems
  for (const domain of Object.values(DOMAINS)) {
    for (const item of domain.navItems) {
      if (pathname.startsWith(item.href)) {
        return domain.id;
      }
    }
  }
  return DEFAULT_DOMAIN;
}
