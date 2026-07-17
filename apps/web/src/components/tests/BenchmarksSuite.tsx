'use client';

import { useState, useRef, useCallback } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const RAMP_PATTERNS = ['Load', 'Stress', 'Spike', 'Soak'] as const;
type RampPattern = (typeof RAMP_PATTERNS)[number];

interface Stats {
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  peakThroughput: number;
  p50Delta?: number;
  p95Label?: string;
  p99Delta?: number;
  p99Status?: 'ok' | 'degraded';
  throughputLabel?: string;
}

const MOCK_STATS: Stats = {
  p50: 142,
  p95: 218,
  p99: 345,
  throughput: 1.2,
  peakThroughput: 1.45,
  p50Delta: -12,
  p95Label: 'Stable threshold',
  p99Delta: 42,
  p99Status: 'degraded',
  throughputLabel: 'Peak: 1.45k req/s',
};

const CHART_LABELS = Array.from({ length: 20 }, (_, i) => `${i * 5}s`);
const CHART_DATA = [150, 140, 160, 130, 170, 140, 155, 120, 145, 135, 165, 150, 138, 162, 128, 158, 142, 148, 132, 155];

const MOCK_ITERATIONS = [
  { id: '#AX-9942', timestamp: '2023-10-24 14:02:11.452', latency: 145, size: '1.2 KB', status: 'Pass' },
  { id: '#AX-9941', timestamp: '2023-10-24 14:02:11.410', latency: 138, size: '1.2 KB', status: 'Pass' },
  { id: '#AX-9940', timestamp: '2023-10-24 14:02:11.388', latency: 192, size: '1.2 KB', status: 'Pass' },
  { id: '#AX-9939', timestamp: '2023-10-24 14:02:11.320', latency: 141, size: '1.2 KB', status: 'Pass' },
  { id: '#AX-9938', timestamp: '2023-10-24 14:02:11.280', latency: 312, size: '1.2 KB', status: 'Pass' },
] as const;

export function BenchmarksSuite() {
  const [iterations, setIterations] = useState('1000');
  const [concurrency, setConcurrency] = useState('50');
  const [pattern, setPattern] = useState<RampPattern>('Load');
  const [isRunning, setIsRunning] = useState(false);
  const [stats] = useState<Stats>(MOCK_STATS);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    toast.info('Benchmark starting...');
    setTimeout(() => {
      setIsRunning(false);
      toast.success('Benchmark completed');
    }, 3000);
  }, []);

  const chartData = {
    labels: CHART_LABELS,
    datasets: [
      {
        label: 'Response Time',
        data: CHART_DATA,
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
        data: CHART_DATA.map(() => 148),
        borderColor: '#8083ff',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const chartOptions = {
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
        max: 400,
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

  return (
    <div className="flex-1 flex gap-6 overflow-hidden">
      {/* Left: Configuration */}
      <div className="w-[320px] flex flex-col gap-4 shrink-0">
        <div className="bg-[#1E293B] border border-[#334155] p-5 rounded-lg flex flex-col flex-1">
          <h2 className="text-xs font-semibold text-[#e4e1ed] mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">tune</span>
            Configuration
          </h2>

          <div className="space-y-5 flex-1">
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                Iterations
              </label>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
                className="w-full bg-[#0F172A] border-[#334155] rounded px-3 py-2 text-xs font-mono text-[#e4e1ed] focus:border-[#6366F1]"
              />
              <p className="text-[10px] text-[#64748B] mt-1">Total requests per scenario batch.</p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                Concurrency
              </label>
              <Input
                type="number"
                value={concurrency}
                onChange={(e) => setConcurrency(e.target.value)}
                className="w-full bg-[#0F172A] border-[#334155] rounded px-3 py-2 text-xs font-mono text-[#e4e1ed] focus:border-[#6366F1]"
              />
              <p className="text-[10px] text-[#64748B] mt-1">Simultaneous workers/threads.</p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                Ramp Pattern
              </label>
              <div className="grid grid-cols-2 gap-2">
                {RAMP_PATTERNS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPattern(p)}
                    className={`py-2 text-[10px] font-semibold rounded border transition-colors ${
                      pattern === p
                        ? 'border-[#6366F1] text-[#6366F1] bg-[rgba(99,102,241,0.1)]'
                        : 'border-[#334155] text-[#94A3B8] hover:border-[#64748B]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                Target Endpoint
              </label>
              <div className="flex">
                <span className="bg-[#1E293B] px-3 py-2 border border-r-0 border-[#334155] rounded-l text-[10px] font-mono text-[#94A3B8]">
                  POST
                </span>
                <Input
                  value="https://api.axiom.tech/v1/ingest"
                  onChange={() => {}}
                  className="flex-1 bg-[#0F172A] border-[#334155] rounded-l-none rounded-r text-xs font-mono text-[#e4e1ed] focus:border-[#6366F1]"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <Button
              onClick={isRunning ? () => setIsRunning(false) : handleStart}
              className={`w-full h-9 text-[11px] font-bold uppercase tracking-widest ${
                isRunning
                  ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                  : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white'
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
      <div className="flex-1 flex flex-col gap-5 overflow-hidden">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            title="p50 Latency"
            value={String(stats.p50)}
            unit="ms"
            footer={
              <span className="text-[10px] text-[#10B981] flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">trending_down</span>
                {Math.abs(stats.p50Delta ?? 0)}ms vs last run
              </span>
            }
          />
          <StatCard
            title="p95 Latency"
            value={String(stats.p95)}
            unit="ms"
            footer={<span className="text-[10px] text-[#64748B]">{stats.p95Label}</span>}
          />
          <StatCard
            title="p99 Latency"
            value={String(stats.p99)}
            unit="ms"
            accent
            footer={
              <span className="text-[10px] text-[#EF4444] flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">trending_up</span>
                +{stats.p99Delta}ms (degradation)
              </span>
            }
          />
          <StatCard
            title="Throughput"
            value={`${stats.throughput}k`}
            unit="req/s"
            accentColor="#6366F1"
            footer={<span className="text-[10px] text-[#64748B]">{stats.throughputLabel}</span>}
          />
        </div>

        {/* Chart */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-5 flex-[2] flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">
              Real-time Latency Distribution (ms)
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
                <span className="text-[10px] text-[#64748B]">Response Time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#8083ff]" />
                <span className="text-[10px] text-[#64748B]">Average</span>
              </div>
            </div>
          </div>
          <div className="flex-1 relative min-h-0">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Iterations table */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-lg flex flex-col h-52 shrink-0">
          <div className="px-4 py-3 border-b border-[#334155] flex justify-between items-center bg-[#1b1b23]/50">
            <h3 className="text-[10px] font-semibold text-[#e4e1ed] uppercase tracking-wider">
              Recent Iterations
            </h3>
            <div className="flex gap-2">
              <span className="text-[10px] text-[#64748B] px-2 py-0.5 border border-[#334155] rounded cursor-pointer hover:text-[#e4e1ed]">
                Filter: All
              </span>
              <span className="text-[10px] text-[#64748B] px-2 py-0.5 border border-[#334155] rounded cursor-pointer hover:text-[#e4e1ed]">
                Export CSV
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#1E293B]">
                <tr className="text-[10px] font-bold text-[#94A3B8] uppercase border-b border-[#334155]">
                  <th className="px-4 py-3">Iteration ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Payload Size</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/30 text-xs">
                {MOCK_ITERATIONS.map((iter) => (
                  <tr key={iter.id} className="hover:bg-[#34343d]/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[#6366F1]">{iter.id}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{iter.timestamp}</td>
                    <td className="px-4 py-3 font-mono">{iter.latency}ms</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{iter.size}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[rgba(16,185,129,0.2)] text-[#10B981] px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        {iter.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      className={`bg-[#1E293B] border border-[#334155] p-4 rounded-lg ${accent ? 'border-l-2' : ''}`}
      style={accent ? { borderLeftColor: '#6366F1' } : {}}
    >
      <p className="text-[10px] text-[#94A3B8] font-semibold uppercase mb-1">{title}</p>
      <div className="flex items-end gap-1">
        <span className="text-xl font-bold font-mono text-[#e4e1ed]" style={accentColor ? { color: accentColor } : {}}>
          {value}
        </span>
        <span className="text-[11px] text-[#64748B] mb-0.5">{unit}</span>
      </div>
      {footer && <div className="mt-1">{footer}</div>}
    </div>
  );
}
