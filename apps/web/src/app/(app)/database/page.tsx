import { DatabaseAuditEngine } from '@/components/database/DatabaseAuditEngine';

export const metadata = {
  title: 'Database Testing | Axiom',
  description: 'API-driven database health, query latency, schema validation, and vulnerability auditing.',
};

export default function DatabasePage() {
  return <DatabaseAuditEngine />;
}
