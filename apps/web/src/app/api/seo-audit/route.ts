import { NextResponse } from 'next/server';
import type {
  SeoAudit,
  SeoFinding,
  MetaTagCheck,
  HeadingItem,
  SeoSeverity,
} from '@axiom/core/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrlStr = searchParams.get('url');

  if (!targetUrlStr) {
    return NextResponse.json({ error: 'Missing target URL parameter' }, { status: 400 });
  }

  let formattedUrl = targetUrlStr.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  try {
    const parsedUrl = new URL(formattedUrl);
    const origin = parsedUrl.origin;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(formattedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Axiom-SeoAuditor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok && res.status >= 500) {
      return NextResponse.json({ error: `Server returned HTTP ${res.status} error.` }, { status: 400 });
    }

    const htmlText = await res.text();
    const findings: SeoFinding[] = [];
    const metaChecks: MetaTagCheck[] = [];
    const headings: HeadingItem[] = [];

    let score = 100;

    // 1. Meta Title Analysis
    const titleMatch = htmlText.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleText = titleMatch ? titleMatch[1].trim() : null;

    if (!titleText) {
      score -= 25;
      metaChecks.push({ tag: 'title', present: false, value: null, status: 'fail', notes: 'Missing <title> tag' });
      findings.push({
        id: 'seo-no-title',
        category: 'meta',
        title: 'Missing Page Title Tag',
        severity: 'critical',
        status: 'fail',
        description: 'The HTML document does not specify a <title> element.',
        impact: 'Search engines use titles as primary preview headlines in search engine result pages (SERPs).',
        recommendation: 'Add a descriptive <title> tag between 50 and 60 characters long.',
      });
    } else {
      const len = titleText.length;
      metaChecks.push({ tag: 'title', present: true, value: titleText, status: len >= 30 && len <= 65 ? 'pass' : 'warn' });
      if (len < 30 || len > 65) {
        score -= 10;
        findings.push({
          id: 'seo-title-len',
          category: 'meta',
          title: `Title Tag Suboptimal Length (${len} chars)`,
          severity: 'medium',
          status: 'warn',
          description: `Current title length is ${len} characters. Ideal length is 30–65 characters.`,
          impact: 'Titles that are too long will be truncated in search results; titles that are too short miss keyword opportunities.',
          recommendation: 'Optimize page title length to sit comfortably between 50 and 60 characters.',
        });
      } else {
        findings.push({
          id: 'seo-title-ok',
          category: 'meta',
          title: 'Title Tag Optimal Length',
          severity: 'info',
          status: 'pass',
          description: `Title tag length (${len} chars) is within search engine display thresholds.`,
          impact: 'Clean SERP title rendering.',
        });
      }
    }

    // 2. Meta Description
    const descMatch = htmlText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                      htmlText.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const descText = descMatch ? descMatch[1].trim() : null;

    if (!descText) {
      score -= 20;
      metaChecks.push({ tag: 'description', present: false, value: null, status: 'fail', notes: 'Missing description meta tag' });
      findings.push({
        id: 'seo-no-desc',
        category: 'meta',
        title: 'Missing Meta Description',
        severity: 'high',
        status: 'fail',
        description: 'No meta description tag was found on the page.',
        impact: 'Search engines may extract random body text for snippets, lowering click-through rates (CTR).',
        recommendation: 'Add a compelling <meta name="description"> tag between 120 and 160 characters.',
      });
    } else {
      const len = descText.length;
      metaChecks.push({ tag: 'description', present: true, value: descText, status: len >= 100 && len <= 165 ? 'pass' : 'warn' });
      if (len < 100 || len > 165) {
        score -= 5;
        findings.push({
          id: 'seo-desc-len',
          category: 'meta',
          title: `Meta Description Suboptimal Length (${len} chars)`,
          severity: 'low',
          status: 'warn',
          description: `Description length is ${len} characters. Ideal length is 120–165 characters.`,
          impact: 'Snippets may be truncated or lack descriptive context.',
          recommendation: 'Adjust description length to 140–160 characters.',
        });
      } else {
        findings.push({
          id: 'seo-desc-ok',
          category: 'meta',
          title: 'Meta Description Optimal Length',
          severity: 'info',
          status: 'pass',
          description: `Meta description length (${len} chars) is well optimized for snippet previews.`,
          impact: 'Enhanced search snippet CTR.',
        });
      }
    }

    // 3. Open Graph Checks (og:image, og:title, og:description)
    const ogImage = htmlText.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    metaChecks.push({
      tag: 'og:image',
      present: !!ogImage,
      value: ogImage ? ogImage[1] : null,
      status: ogImage ? 'pass' : 'warn',
    });

    if (!ogImage) {
      score -= 10;
      findings.push({
        id: 'seo-no-og-image',
        category: 'open_graph',
        title: 'Missing Open Graph Image (og:image)',
        severity: 'medium',
        status: 'warn',
        description: 'No og:image tag found for social media card previews.',
        impact: 'Shares on Twitter, LinkedIn, Facebook, and Discord will display without rich media previews.',
        recommendation: 'Add a high-resolution <meta property="og:image" content="..."> image.',
      });
    } else {
      findings.push({
        id: 'seo-og-image-ok',
        category: 'open_graph',
        title: 'Open Graph Image Tag Present',
        severity: 'info',
        status: 'pass',
        description: 'og:image preview present for rich social sharing cards.',
        impact: 'Enhanced engagement on social network link previews.',
      });
    }

    // 4. Headings Analysis (H1 count & hierarchy)
    const h1Matches = Array.from(htmlText.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
    h1Matches.forEach((m) => {
      const clean = m[1].replace(/<[^>]*>/g, '').trim();
      if (clean) headings.push({ level: 1, text: clean });
    });

    if (h1Matches.length === 0) {
      score -= 15;
      findings.push({
        id: 'seo-no-h1',
        category: 'headings',
        title: 'Missing Heading 1 (<h1>) Element',
        severity: 'high',
        status: 'fail',
        description: 'No <h1> heading tag was discovered on the page.',
        impact: 'H1 tags communicate primary page topic hierarchy to web crawlers.',
        recommendation: 'Include exactly one clear, main <h1> heading per page.',
      });
    } else if (h1Matches.length > 1) {
      score -= 5;
      findings.push({
        id: 'seo-multi-h1',
        category: 'headings',
        title: `Multiple <h1> Tags Found (${h1Matches.length})`,
        severity: 'low',
        status: 'warn',
        description: `Found ${h1Matches.length} <h1> tags. Standard SEO best practice favors a single <h1>.`,
        impact: 'May dilute topic focus for indexing algorithms.',
        recommendation: 'Use <h2> or <h3> for section subheadings, keeping one main <h1>.',
      });
    } else {
      findings.push({
        id: 'seo-h1-ok',
        category: 'headings',
        title: 'Single <h1> Heading Tag Present',
        severity: 'info',
        status: 'pass',
        description: 'Document includes a distinct, single main heading tag.',
        impact: 'Clear semantic hierarchy for search indexers.',
      });
    }

    // 5. Canonical Link
    const canonicalMatch = htmlText.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
    metaChecks.push({
      tag: 'canonical',
      present: !!canonicalMatch,
      value: canonicalMatch ? canonicalMatch[1] : null,
      status: canonicalMatch ? 'pass' : 'warn',
    });

    if (!canonicalMatch) {
      score -= 10;
      findings.push({
        id: 'seo-no-canonical',
        category: 'crawlability',
        title: 'Missing Canonical URL Tag',
        severity: 'medium',
        status: 'warn',
        description: 'No <link rel="canonical"> tag was specified.',
        impact: 'Duplicate parameter routes (e.g. ?ref=...) can trigger duplicate content penalties.',
        recommendation: 'Add a self-referencing canonical tag pointing to the authoritative URL.',
      });
    } else {
      findings.push({
        id: 'seo-canonical-ok',
        category: 'crawlability',
        title: 'Canonical URL Specified',
        severity: 'info',
        status: 'pass',
        description: `Canonical link specified: ${canonicalMatch[1]}`,
        impact: 'Protects against duplicate content indexing issues.',
      });
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    const criticalCount = findings.filter(f => f.severity === 'critical' && f.status === 'fail').length;
    const highCount = findings.filter(f => f.severity === 'high' && (f.status === 'fail' || f.status === 'warn')).length;
    const mediumCount = findings.filter(f => f.severity === 'medium' && (f.status === 'fail' || f.status === 'warn')).length;
    const lowCount = findings.filter(f => f.severity === 'low' && (f.status === 'fail' || f.status === 'warn')).length;
    const passedCount = findings.filter(f => f.status === 'pass').length;

    const auditResult: SeoAudit = {
      id: `seo-audit-${Date.now()}`,
      url: formattedUrl,
      score,
      grade,
      findings,
      meta_checks: metaChecks,
      heading_hierarchy: headings,
      summary: {
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        passedCount,
      },
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(auditResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to complete SEO audit' }, { status: 500 });
  }
}
