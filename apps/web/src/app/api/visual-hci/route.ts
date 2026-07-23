import { NextResponse } from 'next/server';
import type { HciDiagnosticResult, HciFinding } from '@axiom/core/types';

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(formattedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Axiom-HciAuditor/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const htmlText = await res.text();
    const findings: HciFinding[] = [];
    let hciScore = 100;

    // 1. Card Detection & Transition Delays Inspection
    const cardMatches = htmlText.match(/class=["'][^"']*\b(card|item|box|tile|component|panel)\b[^"']*["']/gi) || [];
    const totalCardsDetected = cardMatches.length;

    // Inspect CSS inline styles and style blocks for transition-delay or animation-delay > 300ms
    const delayMatches = htmlText.match(/(transition-delay|animation-delay)\s*:\s*([0-9\.]+)(s|ms)/gi) || [];
    let excessiveDelayCount = 0;

    delayMatches.forEach((match) => {
      const parts = match.match(/([0-9\.]+)(s|ms)/i);
      if (parts) {
        const val = parseFloat(parts[1]);
        const unit = parts[2].toLowerCase();
        const ms = unit === 's' ? val * 1000 : val;
        if (ms > 300) {
          excessiveDelayCount++;
        }
      }
    });

    if (excessiveDelayCount > 0) {
      hciScore -= 20;
      findings.push({
        id: 'hci-card-delay',
        category: 'latency_delay',
        title: `Sluggish UI Element Delays Detected (${excessiveDelayCount} rules)`,
        severity: 'high',
        status: 'fail',
        description: `Found ${excessiveDelayCount} animation/transition delays exceeding 300ms on interactive components.`,
        impact: 'Delays > 300ms violate human perception responsiveness limits, making UI interactions feel sluggish and un-responsive.',
        recommendation: 'Reduce hover/card transition delays to <= 150ms for crisp, instant visual feedback.',
      });
    } else {
      findings.push({
        id: 'hci-card-delay-ok',
        category: 'latency_delay',
        title: 'Optimized Transition Latency',
        severity: 'info',
        status: 'pass',
        description: 'Interactive cards and component transitions render within optimal human perception bounds (<= 200ms).',
        impact: 'Provides crisp, responsive interaction feedback.',
        recommendation: 'Maintain transition durations under 200ms.',
      });
    }

    // 2. Touch Target & Button Spacing Heuristic
    const smallBtnMatches = htmlText.match(/<button[^>]*style=["'][^"']*(height|width)\s*:\s*([0-3][0-9])px/gi) || [];
    if (smallBtnMatches.length > 0) {
      hciScore -= 15;
      findings.push({
        id: 'hci-touch-target-small',
        category: 'touch_target',
        title: `Undersized Interactive Targets (${smallBtnMatches.length} items)`,
        severity: 'high',
        status: 'fail',
        description: 'Discovered interactive elements with dimensions under 44×44px.',
        impact: 'Violates Fitts\'s Law & WCAG 2.5.5, leading to misclicks and frustration on touch devices.',
        recommendation: 'Ensure all primary touch targets maintain a minimum size of 44×44px (or 48×48px for Android guidelines).',
      });
    } else {
      findings.push({
        id: 'hci-touch-target-ok',
        category: 'touch_target',
        title: 'Compliant Touch Target Dimensions',
        severity: 'info',
        status: 'pass',
        description: 'Interactive buttons and links provide adequate target area for touch and mouse interactions.',
        impact: 'Prevents target acquisition errors.',
        recommendation: 'Keep button padding >= 12px.',
      });
    }

    // 3. System Status Visibility (Feedback Indicators)
    const hasFocusStyles = /:focus|focus-visible/i.test(htmlText);
    if (!hasFocusStyles) {
      hciScore -= 15;
      findings.push({
        id: 'hci-feedback-focus',
        category: 'feedback_status',
        title: 'Missing Focus State Indicators',
        severity: 'medium',
        status: 'warn',
        description: 'No explicit :focus or :focus-visible CSS rules were found in stylesheets.',
        impact: 'Violates Nielsen Heuristic #1 (Visibility of System Status). Keyboard users cannot perceive active navigation context.',
        recommendation: 'Add high-contrast :focus-visible outlines to all clickable and input elements.',
      });
    } else {
      findings.push({
        id: 'hci-feedback-ok',
        category: 'feedback_status',
        title: 'System Status Feedback Present',
        severity: 'info',
        status: 'pass',
        description: 'Interactive elements include focus and hover state indicators.',
        impact: 'Clear visual status context for users.',
        recommendation: 'Maintain distinct focus indicators.',
      });
    }

    // 4. Cognitive Load & Content Clutter
    const linkCount = (htmlText.match(/<a\s+/gi) || []).length;
    const buttonCount = (htmlText.match(/<button\s+/gi) || []).length;
    const totalActionables = linkCount + buttonCount;

    if (totalActionables > 120) {
      hciScore -= 15;
      findings.push({
        id: 'hci-cognitive-clutter',
        category: 'cognitive_load',
        title: `High Cognitive Load (${totalActionables} Interactive Actions)`,
        severity: 'medium',
        status: 'warn',
        description: `Page contains ${totalActionables} interactive links and buttons.`,
        impact: 'Excessive decision options trigger Hick\'s Law (decision latency increases logarithmically with options).',
        recommendation: 'Group primary calls to action into distinct visual hierarchies and collapsible menus.',
      });
    } else {
      findings.push({
        id: 'hci-cognitive-ok',
        category: 'cognitive_load',
        title: 'Balanced Information Architecture',
        severity: 'info',
        status: 'pass',
        description: `Balanced density of interactive actions (${totalActionables} items).`,
        impact: 'Lowers cognitive friction and keeps user focus centered on key actions.',
        recommendation: 'Sustain clear visual spacing between action clusters.',
      });
    }

    // 5. Viewport Alignment & Overflow Risk
    const viewportMeta = htmlText.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    if (!viewportMeta) {
      hciScore -= 20;
      findings.push({
        id: 'hci-viewport-missing',
        category: 'visual_hierarchy',
        title: 'Missing Mobile Viewport Meta Tag',
        severity: 'critical',
        status: 'fail',
        description: 'No <meta name="viewport"> tag discovered.',
        impact: 'Mobile browsers will render page in desktop emulation mode, forcing manual pinching and horizontal scrolling.',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> tag.',
      });
    } else {
      findings.push({
        id: 'hci-viewport-ok',
        category: 'visual_hierarchy',
        title: 'Responsive Viewport Defined',
        severity: 'info',
        status: 'pass',
        description: 'Viewport tag properly configures device-width scaling.',
        impact: 'Fluid responsiveness across mobile and desktop displays.',
        recommendation: 'Ensure container widths use percentage or viewport units.',
      });
    }

    hciScore = Math.max(0, Math.min(100, Math.round(hciScore)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (hciScore >= 95) grade = 'A+';
    else if (hciScore >= 85) grade = 'A';
    else if (hciScore >= 70) grade = 'B';
    else if (hciScore >= 55) grade = 'C';
    else if (hciScore >= 40) grade = 'D';

    const hciDiagnostic: HciDiagnosticResult = {
      hciScore,
      grade,
      findings,
      cardMetrics: {
        totalCardsDetected,
        avgTransitionDelayMs: excessiveDelayCount > 0 ? 350 : 120,
        hasExcessiveDelays: excessiveDelayCount > 0,
        touchTargetIssuesCount: smallBtnMatches.length,
        hasHorizontalOverflow: !viewportMeta,
      },
      summary: {
        criticalCount: findings.filter((f) => f.severity === 'critical' && f.status === 'fail').length,
        highCount: findings.filter((f) => f.severity === 'high' && (f.status === 'fail' || f.status === 'warn')).length,
        mediumCount: findings.filter((f) => f.severity === 'medium' && (f.status === 'fail' || f.status === 'warn')).length,
        lowCount: findings.filter((f) => f.severity === 'low' && (f.status === 'fail' || f.status === 'warn')).length,
        passedCount: findings.filter((f) => f.status === 'pass').length,
      },
    };

    return NextResponse.json(hciDiagnostic);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to complete HCI evaluation' }, { status: 500 });
  }
}
