import { CodeAnalysisEngine } from '@/components/code-analysis/CodeAnalysisEngine';

export const metadata = {
  title: 'Static Code Analysis | Axiom Platform',
  description: 'White-box static code analysis for JS, TS, and Python with AST parsing and security smell detection.',
};

export default function CodeAnalysisPage() {
  return <CodeAnalysisEngine />;
}
