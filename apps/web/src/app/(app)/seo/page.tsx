import { SeoAuditEngine } from '@/components/seo/SeoAuditEngine';

export const metadata = {
  title: 'SEO Audit | Axiom',
  description: 'Meta tags, heading hierarchy, Open Graph previews, broken links, and search engine optimization scoring.',
};

export default function SeoPage() {
  return <SeoAuditEngine />;
}
