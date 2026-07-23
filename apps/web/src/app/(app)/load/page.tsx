import { LoadTestEngine } from '@/components/load/LoadTestEngine';

export const metadata = {
  title: 'Load & Stress Testing | Axiom',
  description: 'Simulate virtual users (VU), ramp-up load, measure throughput limits and latency percentiles.',
};

export default function LoadPage() {
  return <LoadTestEngine />;
}
