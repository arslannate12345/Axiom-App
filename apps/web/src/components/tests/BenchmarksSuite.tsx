'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { RequestRecord } from '@/lib/supabase-service';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { runBenchmark } from '@/lib/testEngine';
import type { BenchmarkResult, BenchmarkIteration } from '@/lib/testEngine';
import { useTestResultsStore } from '@/stores/testResultsStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

import { METHOD_COLORS } from '@/lib/constants';

function toNumber(v: string, fb: number): number { const n = parseInt(v); return isNaN(n) ? fb : n; }

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function BenchmarksSuite({ request }: { request: RequestRecord }) {
  const [iterations, setIterations] = useState('1000');
  const [concurrency, setConcurrency] = useState('50');
  const [pattern, setPattern] = useState('Load');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const setSectionResults = useTestResultsStore((s) => s.setSectionResults);

  useEffect(() => {
    if (result) setSectionResults('benchmarks', result);
  }, [result]);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await runBenchmark(request, {
        iterations: toNumber(iterations, 100),
        concurrency: toNumber(concurrency, 10),
      });
      setResult(res);
      toast.success(`Benchmark complete: ${res.iterations.length} iterations, avg ${res.stats.avgLatency}ms`);
    } catch {
      toast.error('Benchmark failed');
    } finally {
      setIsRunning(false);
    }
  }, [request, iterations, concurrency]);

  const chartData = useMemo(() => {
    if (!result) return { labels: [] as string[], datasets: [] };
    return {
      labels: result.chartLabels,
      datasets: [
        {
          label: 'Response Time',
          data: result.chartData,
          borderColor: '#6366F1',
          backgroundColor: (ctx: { chart: { ctx: CanvasRenderingContext2D } }) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
          borderWidth: 2.5,
        },
        {
          label: 'Average',
          data: Array(result.chartData.length).fill(result.stats.avgLatency),
          borderColor: '#8083ff',
          borderDash: [4, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [result]);

  const chartOptions = useMemo(() => {
    const maxY = result ? Math.ceil(Math.max(...result.chartData, 100) / 100) * 100 + 50 : 400;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#e4e1ed',
          bodyColor: '#94A3B8',
          borderColor: '#334155',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          min: 0,
          max: maxY,
          grid: {
            color: 'rgba(51, 65, 85, 0.4)',
            drawBorder: false,
          },
          ticks: {
            color: '#64748B',
            font: { size: 10, family: 'JetBrains Mono' },
            stepSize: 100,
            callback: (v: string | number) => `${v}ms`,
          },
        },
      },
    };
  }, [result]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 bg-muted/20 border-b border-border flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs font-bold" style={{ color: METHOD_COLORS[request.method] || '#64748B' }}>{request.method}</span>
        <span className="text-xs font-mono text-foreground truncate">{request.url || '(no URL)'}</span>
      </div>
      <div className="flex-1 flex gap-6 overflow-auto">
        {/* Left: Configuration */}
      <div className="w-[320px] flex flex-col gap-4 shrink-0">
        <div className="bg-card border border-border p-5 rounded-lg flex flex-col flex-1">
          <h2 className="text-xs font-semibold text-foreground mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">tune</span>
            Configuration
          </h2>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Iterations
              </label>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
                className="w-full bg-background border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:border-primary"
              />
              <p className="text-[12px] text-muted-foreground mt-1">Total requests per scenario batch.</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Concurrency
              </label>
              <Input
                type="number"
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
                className="w-full bg-background border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:border-primary"
              />
              <p className="text-[12px] text-muted-foreground mt-1">Simultaneous workers/threads.</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Ramp Pattern
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Load', 'Stress', 'Spike', 'Soak'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPattern(p)}
                    className={`py-2 text-[12px] font-semibold rounded border transition-colors ${
                      pattern === p
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Target Endpoint
              </label>
              <div className="flex">
                <span className="bg-card px-3 py-2 border border-r-0 border-border rounded-l text-[12px] font-mono font-bold" style={{ color: METHOD_COLORS[request.method] || '#64748B' }}>
                  {request.method}
                </span>
                <Input
                  value={request.url}
                  onChange={() => {}}
                  className="flex-1 bg-background border-border rounded-l-none rounded-r text-xs font-mono text-foreground focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <Button
              onClick={isRunning ? () => setIsRunning(false) : handleStart}
              className={`w-full h-9 text-[13px] font-bold uppercase tracking-widest ${
                isRunning
                  ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm mr-1">
                {isRunning ? 'stop' : 'play_arrow'}
              </span>
              {isRunning ? 'Stop Benchmark' : 'Start Benchmark'}
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Results */}
      <div className="flex-1 flex flex-col gap-5 overflow-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="p50 Latency"
            value={result ? String(result.stats.p50) : '—'}
            unit="ms"
            footer={<span className="text-[12px] text-muted-foreground">{result ? `${result.stats.minLatency}–${result.stats.maxLatency}ms range` : '—'}</span>}
          />
          <StatCard
            title="p95 Latency"
            value={result ? String(result.stats.p95) : '—'}
            unit="ms"
            footer={<span className="text-[12px] text-muted-foreground">{result ? `avg ${result.stats.avgLatency}ms` : '—'}</span>}
          />
          <StatCard
            title="p99 Latency"
            value={result ? String(result.stats.p99) : '—'}
            unit="ms"
            accent
            footer={<span className="text-[12px] text-muted-foreground">{result ? `${result.stats.successRate}% success` : '—'}</span>}
          />
          <StatCard
            title="Throughput"
            value={result ? String(result.stats.throughput) : '—'}
            unit="req/s"
            accentColor="#6366F1"
            footer={<span className="text-[12px] text-muted-foreground">{result ? `${result.stats.totalTime}ms total` : '—'}</span>}
          />
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">
              Latency Distribution (ms)
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-[12px] text-muted-foreground">Response Time</span>
              </div>
              {result && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#8083ff]" />
                  <span className="text-[12px] text-muted-foreground">Average ({result.stats.avgLatency}ms)</span>
                </div>
              )}
            </div>
          </div>
          {result ? (
            <div className="flex-1 relative min-h-0 overflow-hidden">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Run the benchmark to see results
            </div>
          )}
        </div>

        {/* Iterations table */}
        <div className="bg-card border border-border rounded-lg flex flex-col h-52 shrink-0">
          <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-sidebar/50">
            <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wider">
              Recent Iterations
            </h3>
            <div className="flex gap-2">
              <span className="text-[12px] text-muted-foreground px-2 py-0.5 border border-border rounded cursor-pointer hover:text-foreground">
                Filter: All
              </span>
              <span className="text-[12px] text-muted-foreground px-2 py-0.5 border border-border rounded cursor-pointer hover:text-foreground">
                Export CSV
              </span>
            </div>
          </div>
          {result ? (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-[12px] font-bold text-muted-foreground uppercase border-b border-border">
                    <th className="px-4 py-3">Iteration</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payload Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {result.iterations.map((iter) => (
                    <tr key={iter.iteration} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-primary">#{iter.iteration}</td>
                      <td className="px-4 py-3 font-mono">{iter.latency}ms</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold uppercase ${
                          iter.status >= 200 && iter.status < 300
                            ? 'bg-[rgba(16,185,129,0.2)] text-[#10B981]'
                            : iter.status >= 400
                              ? 'bg-[rgba(239,68,68,0.2)] text-[#EF4444]'
                              : iter.status > 0
                                ? 'bg-[rgba(245,158,11,0.2)] text-[#F59E0B]'
                                : 'bg-[rgba(239,68,68,0.2)] text-[#EF4444]'
                        }`}>
                          {iter.status > 0 ? iter.status : 'ERR'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatBytes(iter.size)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Run the benchmark to see results
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────

function StatCard({
  title,
  value,
  unit,
  accent,
  accentColor,
  footer,
}: {
  title: string;
  value: string;
  unit: string;
  accent?: boolean;
  accentColor?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-card border border-border p-4 rounded-lg ${accent ? 'border-l-2' : ''}`}
      style={accent ? { borderLeftColor: '#6366F1' } : {}}
    >
      <p className="text-[12px] text-muted-foreground font-semibold uppercase mb-1">{title}</p>
      <div className="flex items-end gap-1">
        <span className="text-xl font-bold font-mono text-foreground" style={accentColor ? { color: accentColor } : {}}>
          {value}
        </span>
        <span className="text-[13px] text-muted-foreground mb-0.5">{unit}</span>
      </div>
      {footer && <div className="mt-1">{footer}</div>}
    </div>
  );
}
