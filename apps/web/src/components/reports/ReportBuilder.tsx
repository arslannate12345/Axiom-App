'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { generateReport } from '@/lib/reportGenerator';
import * as service from '@/lib/supabase-service';
import type { AggregatedSection } from '@/lib/reportGenerator';
import type { RequestRecord } from '@/lib/supabase-service';

interface ReportBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestRecord;
  sections: AggregatedSection;
  baselineId?: string | null;
  onReportGenerated?: (report: service.ReportRecord) => void;
}

const SECTION_LABELS: Record<string, string> = {
  benchmarks: 'Benchmarks',
  security: 'Security',
  fuzz: 'Fuzzing',
  chaos: 'Chaos',
  idempotency: 'Idempotency',
  regression: 'Regression',
};

export function ReportBuilder({ open, onOpenChange, request, sections, baselineId, onReportGenerated }: ReportBuilderProps) {
  const [reportName, setReportName] = useState(`Report: ${request.name}`);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const availableSections = Object.entries(sections).filter(([, v]) => v !== undefined) as [string, unknown][];
  const enabledSections = new Set(availableSections.map(([k]) => k));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const filtered: AggregatedSection = {};
      for (const [key] of availableSections) {
        if (enabledSections.has(key)) {
          (filtered as any)[key] = (sections as any)[key];
        }
      }

      const report = generateReport({ request, sections: filtered, baselineId });

      const rec = await service.createReport({
        request_id: request.id,
        name: reportName || report.request.name,
        report_type: 'request',
        report_data: report,
        overall_health_score: report.healthScore,
      });

      if (rec) {
        setShareUrl(`${window.location.origin}/reports/${rec.share_token}`);
        if (report.healthScore > 0 || report.issues.length > 0) {
          try {
            await service.createReportIssues(
              report.issues.map((issue, idx) => ({
                report_id: rec.id,
                section: issue.section,
                title: issue.title,
                severity: issue.severity,
                status: 'open',
                description: issue.description,
                developer_note: '',
                resolved_at: null,
                sort_order: idx,
              })),
            );
          } catch { /* report_issues table may not exist until migration is applied */ }
        }
        toast.success('Report generated');
        onReportGenerated?.(rec);
      } else {
        toast.error('Failed to create report');
      }
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const score = generateReport({ request, sections, baselineId }).healthScore;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !generating) { setShareUrl(null); onOpenChange(false); } }}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">description</span>
            Generate Test Report
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create an aggregated report from your test results to share with your team.
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Report Name</label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="h-8 bg-background border-border text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Included Sections ({availableSections.length})
              </label>
              <div className="space-y-1.5">
                {availableSections.map(([key]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-1.5 bg-muted/20 rounded text-xs">
                    <span className="text-foreground">{SECTION_LABELS[key] || key}</span>
                    <span className="material-symbols-outlined text-[14px] text-[#10B981]">check_circle</span>
                  </div>
                ))}
              </div>
              {availableSections.length === 0 && (
                <p className="text-xs text-muted-foreground">No test results available. Run tests first.</p>
              )}
            </div>

            <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/20 rounded">
              <span className="text-xs font-semibold text-primary">Estimated Health Score</span>
              <span className={`text-lg font-bold font-mono ${score >= 70 ? 'text-[#10B981]' : score >= 40 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                {score}/100
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#10B981]">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span className="text-sm font-semibold">Report Generated</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Share Link</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="h-8 bg-background border-border text-xs font-mono"
                />
                <Button
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied'); }}
                  className="h-8 px-3 text-xs bg-primary text-primary-foreground shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!shareUrl ? (
            <Button
              onClick={handleGenerate}
              disabled={generating || availableSections.length === 0}
              className="h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {generating ? (
                <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />Generating...</>
              ) : (
                <><span className="material-symbols-outlined text-[14px] mr-1">description</span>Generate Report</>
              )}
            </Button>
          ) : (
            <Button onClick={() => { setShareUrl(null); onOpenChange(false); }} className="h-8 px-4 text-xs">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
