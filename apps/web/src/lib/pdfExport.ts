import jsPDF from 'jspdf';
import type { AggregatedReport, ReportIssue } from './reportGenerator';

const SECTION_LABELS: Record<string, string> = {
  benchmarks: 'Benchmarks',
  security: 'Security',
  fuzz: 'Fuzzing',
  chaos: 'Chaos',
  idempotency: 'Idempotency',
  regression: 'Regression',
};

export async function exportReportToPDF(report: {
  name: string;
  reportData: AggregatedReport;
  shareToken?: string;
}): Promise<void> {
  const { name, reportData: data, shareToken } = report;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  const drawLine = (yPos: number) => {
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.line(14, yPos, pageW - 14, yPos);
  };

  // Header
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241);
  doc.setFont('helvetica', 'bold');
  doc.text('AXIOM', 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('API Testing & QA Report', 14, y);
  y += 4;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date(data.ranAt).toLocaleString()}`, 14, y);
  if (shareToken) {
    doc.text(`Share: ${window.location.origin}/reports/${shareToken}`, pageW - 14, y, { align: 'right' });
  }
  y += 8;
  drawLine(y);
  y += 6;

  // Report name
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(name, 14, y);
  y += 8;

  // Request info
  if (data.request) {
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('courier', 'normal');
    doc.text(`${data.request.method} ${data.request.url}`, 14, y);
    y += 6;
  }

  // Health score
  doc.setFontSize(10);
  const health = data.healthScore;
  const healthColor: [number, number, number] =
    health >= 80 ? [16, 185, 129] : health >= 50 ? [245, 158, 11] : [239, 68, 68];
  doc.setTextColor(...healthColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Health Score: ${health}/100`, 14, y);
  y += 4;

  // Issues summary
  const openCount = data.issues.filter((i) => i.status === 'open').length;
  const fixedCount = data.issues.filter((i) => i.status === 'fixed' || i.status === 'verified').length;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.issues.length} issues (${openCount} open, ${fixedCount} resolved)`, 14, y);
  y += 6;

  drawLine(y);
  y += 6;

  // Test results sections
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Results', 14, y);
  y += 7;

  const sections = data.sections;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  for (const [key, val] of Object.entries(sections)) {
    if (y > 260) { doc.addPage(); y = 20; }

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(SECTION_LABELS[key] || key, 14, y);
    y += 5;
    doc.setFont('courier', 'normal');

    let resultText = 'No data';
    if (key === 'benchmarks' && val) {
      const b = val as any;
      resultText = `p50: ${b.stats?.p50 ?? '—'}ms  p95: ${b.stats?.p95 ?? '—'}ms  p99: ${b.stats?.p99 ?? '—'}ms  avg: ${b.stats?.avgLatency ?? '—'}ms  success: ${b.stats?.successRate ?? '—'}%  throughput: ${b.stats?.throughput ?? '—'} req/s`;
    } else if (key === 'security' && val) {
      const s = val as any;
      resultText = `Health: ${s.healthScore ?? '—'}/100  Checks: ${s.totalChecks ?? 0}  Vulnerabilities: ${s.vulnerabilities ?? 0}  Warnings: ${s.warnings ?? 0}`;
    } else if (key === 'fuzz' && val) {
      const arr = val as any[];
      resultText = arr.map((r: any) => `${r.strategy}: ${r.safe}/${r.total} safe`).join(' | ');
    } else if (key === 'chaos' && val) {
      const arr = val as any[];
      const passed = arr.filter((r: any) => r.status === 'passed').length;
      resultText = `${passed}/${arr.length} passed`;
    } else if (key === 'idempotency' && val) {
      const i = val as any;
      resultText = i.isIdempotent ? 'PASS - Request is idempotent' : `FAIL - ${i.diffs?.length ?? 0} difference(s)`;
    } else if (key === 'regression' && val) {
      const r = val as any;
      resultText = `${r.diffs?.length ?? 0} change(s) from baseline`;
    }

    doc.text(resultText, 18, y, { maxWidth: pageW - 36 });
    y += 6;

    if (key === 'security' && val) {
      const s = val as any;
      for (const check of (s.checks || [])) {
        if (y > 270) { doc.addPage(); y = 20; }
        const icon = check.status === 'pass' ? '[PASS]' : check.status === 'fail' ? '[FAIL]' : '[WARN]';
        doc.text(`${icon} ${check.label}`, 22, y);
        y += 4;
      }
    }
  }

  // Issues checklist
  y += 4;
  drawLine(y);
  y += 6;

  if (y > 250) { doc.addPage(); y = 20; }

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Issue Checklist', 14, y);
  y += 7;

  for (const issue of data.issues) {
    if (y > 270) { doc.addPage(); y = 20; }

    doc.setFontSize(8);
    const severityColor: [number, number, number] =
      issue.severity === 'critical' ? [200, 30, 30] : issue.severity === 'warning' ? [180, 130, 0] : [99, 102, 241];
    doc.setTextColor(...severityColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`[${issue.severity.toUpperCase()}]`, 14, y);

    doc.setTextColor(15, 23, 42);
    doc.text(`${SECTION_LABELS[issue.section] || issue.section}: ${issue.title}`, 38, y, { maxWidth: pageW - 74 });

    const statusLabel = issue.status === 'open' ? 'Open' : issue.status === 'fixed' ? 'Fixed' : issue.status === 'verified' ? 'Verified' : issue.status;
    doc.setTextColor(100, 116, 139);
    doc.text(statusLabel, pageW - 14, y, { align: 'right' });
    y += 5;

    if (issue.description) {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont('courier', 'normal');
      doc.text(issue.description.replace(/\n/g, ' ').slice(0, 150), 38, y, { maxWidth: pageW - 74 });
      y += 4;
      doc.setFont('helvetica', 'normal');
    }

    // Remediation steps
    const rem = issue.remediation;
    if (rem?.steps?.length > 0) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFontSize(7);
      doc.setTextColor(99, 102, 241);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fix: ${rem.summary}`, 38, y, { maxWidth: pageW - 74 });
      y += 4;
      doc.setFont('helvetica', 'normal');
      for (const step of rem.steps.slice(0, 4)) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7);
        doc.text(`  ${step}`, 38, y, { maxWidth: pageW - 74 });
        y += 3.5;
      }
      if (rem.reference) {
        doc.setTextColor(99, 102, 241);
        doc.text(`  Ref: ${rem.reference}`, 38, y, { maxWidth: pageW - 74 });
        y += 3;
      }
    }
  }

  // Footer
  if (y < 270) y = 278;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by Axiom — API Testing & QA Platform', pageW / 2, y, { align: 'center' });

  doc.save(`${name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
