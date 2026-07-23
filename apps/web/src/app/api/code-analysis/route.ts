import { NextResponse } from 'next/server';
import * as acorn from 'acorn';
import type {
  CodeAnalysisAudit,
  CodeFinding,
  FindingSeverity,
  AnalysisRuleCategory,
  FileAnalysisSummary,
} from '@axiom/core/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inputMode = 'paste', code, language = 'javascript', filename, githubUrl } = body;

    // ─── GITHUB REPOSITORY MODE ─────────────────────────────────
    if (inputMode === 'github' || githubUrl) {
      if (!githubUrl || typeof githubUrl !== 'string' || !githubUrl.trim()) {
        return NextResponse.json(
          { error: 'Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo).' },
          { status: 400 }
        );
      }

      const parsedRepo = parseGitHubUrl(githubUrl);
      if (!parsedRepo) {
        return NextResponse.json(
          { error: 'Invalid GitHub URL format. Use https://github.com/owner/repo' },
          { status: 400 }
        );
      }

      const { owner, repo } = parsedRepo;

      // 1. Fetch Repo tree structure from GitHub API
      let branch = 'main';
      let treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
        headers: { 'User-Agent': 'Axiom-CodeAnalyzer/1.0', Accept: 'application/vnd.github.v3+json' },
      });

      if (!treeRes.ok && treeRes.status === 404) {
        branch = 'master';
        treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
          headers: { 'User-Agent': 'Axiom-CodeAnalyzer/1.0', Accept: 'application/vnd.github.v3+json' },
        });
      }

      if (!treeRes.ok) {
        return NextResponse.json(
          { error: `Could not fetch GitHub repository ${owner}/${repo}. Verify the repository is public.` },
          { status: 400 }
        );
      }

      const treeData = await treeRes.json();
      const items: Array<{ path: string; type: string; size?: number }> = treeData.tree || [];

      // Filter for JavaScript, TypeScript, and Python code files
      const codeFiles = items.filter(
        (item) =>
          item.type === 'blob' &&
          /\.(js|jsx|ts|tsx|py)$/i.test(item.path) &&
          !item.path.includes('node_modules/') &&
          !item.path.includes('dist/') &&
          !item.path.includes('.min.')
      );

      if (codeFiles.length === 0) {
        return NextResponse.json(
          { error: `No JavaScript, TypeScript, or Python files found in ${owner}/${repo}.` },
          { status: 400 }
        );
      }

      // Limit to top 12 relevant files
      const selectedFiles = codeFiles.slice(0, 12);
      const findings: CodeFinding[] = [];
      const fileSummaries: FileAnalysisSummary[] = [];
      const categoryBreakdown: Record<AnalysisRuleCategory, number> = {
        bug: 0,
        security: 0,
        quality: 0,
        maintainability: 0,
        best_practice: 0,
      };

      let totalLoc = 0;

      // 2. Fetch file contents in parallel
      const filePromises = selectedFiles.map(async (fileItem) => {
        try {
          const rawRes = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileItem.path}`,
            { headers: { 'User-Agent': 'Axiom-CodeAnalyzer/1.0' } }
          );
          if (!rawRes.ok) return null;
          const content = await rawRes.text();
          return { path: fileItem.path, content };
        } catch {
          return null;
        }
      });

      const fetchedResults = await Promise.all(filePromises);
      const validFiles = fetchedResults.filter((f): f is { path: string; content: string } => f !== null);

      // 3. Analyze each file
      validFiles.forEach((f) => {
        const fileLines = f.content.split('\n');
        const loc = fileLines.length;
        totalLoc += loc;

        const fileFindingsBefore = findings.length;
        const ext = f.path.split('.').pop()?.toLowerCase() || '';

        if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
          analyzeJavaScriptTypeScript(f.content, fileLines, findings, categoryBreakdown, f.path);
        } else if (ext === 'py') {
          analyzePython(f.content, fileLines, findings, categoryBreakdown, f.path);
        }

        runUniversalRegexChecks(f.content, fileLines, findings, categoryBreakdown, f.path);

        const newFindingsCount = findings.length - fileFindingsBefore;
        fileSummaries.push({
          filename: f.path,
          linesOfCode: loc,
          findingsCount: newFindingsCount,
          language: ext.toUpperCase(),
        });
      });

      // Calculate score
      let score = 100;
      findings.forEach((find) => {
        switch (find.severity) {
          case 'critical':
            score -= 15;
            break;
          case 'high':
            score -= 10;
            break;
          case 'medium':
            score -= 5;
            break;
          case 'low':
            score -= 2;
            break;
          case 'info':
            break;
        }
      });

      score = Math.max(0, Math.min(100, Math.round(score)));

      let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
      if (score >= 95) grade = 'A+';
      else if (score >= 85) grade = 'A';
      else if (score >= 70) grade = 'B';
      else if (score >= 55) grade = 'C';
      else if (score >= 40) grade = 'D';

      const auditResult: CodeAnalysisAudit = {
        id: `code-audit-gh-${Date.now()}`,
        input_mode: 'github',
        github_url: `https://github.com/${owner}/${repo}`,
        language: 'multi',
        filename: `${owner}/${repo}`,
        code_snippet: `Analyzed repository: ${owner}/${repo} (${validFiles.length} files, ${totalLoc} LOC)`,
        score,
        grade,
        findings,
        file_summaries: fileSummaries,
        summary: {
          criticalCount: findings.filter((f) => f.severity === 'critical').length,
          highCount: findings.filter((f) => f.severity === 'high').length,
          mediumCount: findings.filter((f) => f.severity === 'medium').length,
          lowCount: findings.filter((f) => f.severity === 'low').length,
          infoCount: findings.filter((f) => f.severity === 'info').length,
          passedRulesCount: Math.max(0, 25 - findings.length),
          linesOfCode: totalLoc,
          filesAnalyzedCount: validFiles.length,
        },
        category_breakdown: categoryBreakdown,
        created_at: new Date().toISOString(),
      };

      return NextResponse.json(auditResult);
    }

    // ─── PASTE CODE MODE ─────────────────────────────────────────
    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'Please provide valid source code to analyze.' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim();
    const lines = trimmedCode.split('\n');
    const loc = lines.length;

    const findings: CodeFinding[] = [];
    const categoryBreakdown: Record<AnalysisRuleCategory, number> = {
      bug: 0,
      security: 0,
      quality: 0,
      maintainability: 0,
      best_practice: 0,
    };

    const normLang = (language || 'javascript').toLowerCase();

    if (normLang === 'javascript' || normLang === 'typescript' || normLang === 'js' || normLang === 'ts') {
      analyzeJavaScriptTypeScript(trimmedCode, lines, findings, categoryBreakdown, filename || 'app.js');
    } else if (normLang === 'python' || normLang === 'py') {
      analyzePython(trimmedCode, lines, findings, categoryBreakdown, filename || 'script.py');
    } else {
      analyzeGeneral(trimmedCode, lines, findings, categoryBreakdown, filename || 'code.txt');
    }

    runUniversalRegexChecks(trimmedCode, lines, findings, categoryBreakdown, filename || 'app.js');

    let score = 100;
    findings.forEach((f) => {
      switch (f.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
        case 'info':
          break;
      }
    });

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    const auditResult: CodeAnalysisAudit = {
      id: `code-audit-${Date.now()}`,
      input_mode: 'paste',
      language: normLang.includes('python') ? 'python' : normLang.includes('ts') ? 'typescript' : 'javascript',
      filename: filename || (normLang.includes('python') ? 'script.py' : normLang.includes('ts') ? 'app.ts' : 'app.js'),
      code_snippet: trimmedCode.slice(0, 2000),
      score,
      grade,
      findings,
      file_summaries: [
        {
          filename: filename || 'app.js',
          linesOfCode: loc,
          findingsCount: findings.length,
          language: normLang.toUpperCase(),
        },
      ],
      summary: {
        criticalCount: findings.filter((f) => f.severity === 'critical').length,
        highCount: findings.filter((f) => f.severity === 'high').length,
        mediumCount: findings.filter((f) => f.severity === 'medium').length,
        lowCount: findings.filter((f) => f.severity === 'low').length,
        infoCount: findings.filter((f) => f.severity === 'info').length,
        passedRulesCount: Math.max(0, 20 - findings.length),
        linesOfCode: loc,
        filesAnalyzedCount: 1,
      },
      category_breakdown: categoryBreakdown,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(auditResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to complete static code analysis' },
      { status: 500 }
    );
  }
}

// ─── GitHub URL Helper ─────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.trim().replace(/\/+$/, '').replace(/\.git$/i, '');
  const match = cleaned.match(/(?:github\.com\/|^)([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

// ─── JS/TS AST & Pattern Inspector ───────────────────────────────

function analyzeJavaScriptTypeScript(
  code: string,
  lines: string[],
  findings: CodeFinding[],
  categoryBreakdown: Record<AnalysisRuleCategory, number>,
  filePath: string
) {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });

    walkAST(ast, (node: any) => {
      // Rule: eval() usage
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'eval'
      ) {
        addFinding(findings, categoryBreakdown, {
          id: `finding-${findings.length + 1}`,
          ruleId: 'js-eval-usage',
          category: 'security',
          title: 'Dangerous eval() Function Execution',
          severity: 'critical',
          line: node.loc?.start.line || 1,
          column: node.loc?.start.column,
          filePath,
          snippet: lines[(node.loc?.start.line || 1) - 1]?.trim(),
          description: 'The global eval() function executes string inputs as executable code.',
          impact: 'Critical vulnerability enabling arbitrary Code Injection and Cross-Site Scripting (XSS).',
          recommendation: 'Refactor code to use safer alternatives like JSON.parse() or standard data lookups.',
        });
      }

      // Rule: innerHTML assignment
      if (
        node.type === 'AssignmentExpression' &&
        node.left &&
        node.left.type === 'MemberExpression' &&
        node.left.property &&
        node.left.property.name === 'innerHTML'
      ) {
        addFinding(findings, categoryBreakdown, {
          id: `finding-${findings.length + 1}`,
          ruleId: 'js-innerhtml-xss',
          category: 'security',
          title: 'Direct innerHTML DOM Assignment',
          severity: 'high',
          line: node.loc?.start.line || 1,
          filePath,
          snippet: lines[(node.loc?.start.line || 1) - 1]?.trim(),
          description: 'Assigning unsanitized input to element.innerHTML bypasses HTML escaping.',
          impact: 'Exposes application users to DOM-based XSS attacks.',
          recommendation: 'Use element.textContent or element.setAttribute() instead.',
        });
      }

      // Rule: var declaration usage
      if (node.type === 'VariableDeclaration' && node.kind === 'var') {
        addFinding(findings, categoryBreakdown, {
          id: `finding-${findings.length + 1}`,
          ruleId: 'js-var-usage',
          category: 'maintainability',
          title: 'Legacy "var" Keyword Usage',
          severity: 'low',
          line: node.loc?.start.line || 1,
          filePath,
          snippet: lines[(node.loc?.start.line || 1) - 1]?.trim(),
          description: 'Variable declared using function-scoped "var" keyword.',
          impact: 'Can cause scope hoisting bugs and variable shadow pollution.',
          recommendation: 'Replace "var" declarations with block-scoped "let" or "const".',
        });
      }

      // Rule: Loose equality == or !=
      if (node.type === 'BinaryExpression' && (node.operator === '==' || node.operator === '!=')) {
        addFinding(findings, categoryBreakdown, {
          id: `finding-${findings.length + 1}`,
          ruleId: 'js-loose-equality',
          category: 'bug',
          title: `Loose Equality Operator ("${node.operator}")`,
          severity: 'medium',
          line: node.loc?.start.line || 1,
          filePath,
          snippet: lines[(node.loc?.start.line || 1) - 1]?.trim(),
          description: `Using loose equality "${node.operator}" causes implicit type coercion.`,
          impact: 'Unexpected boolean evaluation bugs when comparing falsey values (0, "", null, undefined).',
          recommendation: `Use strict equality operator "${node.operator}=" instead.`,
        });
      }

      // Rule: Empty catch block
      if (
        node.type === 'CatchClause' &&
        node.body &&
        node.body.type === 'BlockStatement' &&
        node.body.body.length === 0
      ) {
        addFinding(findings, categoryBreakdown, {
          id: `finding-${findings.length + 1}`,
          ruleId: 'js-empty-catch',
          category: 'best_practice',
          title: 'Empty Exception Catch Block',
          severity: 'medium',
          line: node.loc?.start.line || 1,
          filePath,
          snippet: lines[(node.loc?.start.line || 1) - 1]?.trim(),
          description: 'Catch block swallows errors without logging or handling them.',
          impact: 'Makes runtime bugs completely silent and extremely difficult to debug.',
          recommendation: 'Log the error or re-throw it after performing cleanup.',
        });
      }
    });
  } catch (_astErr) {
    // AST parse fallback
  }

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    if (/console\.(log|debug|trace)\s*\(/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'js-console-log',
        category: 'maintainability',
        title: 'Development console.log Statement',
        severity: 'info',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Console logging statement found in source code.',
        impact: 'Can leak sensitive runtime telemetry or clutter user browser logs.',
        recommendation: 'Remove debugging logs or use a dedicated logger module.',
      });
    }

    if (/dangerouslySetInnerHTML/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'js-dangerously-set-inner-html',
        category: 'security',
        title: 'React dangerouslySetInnerHTML Usage',
        severity: 'high',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'React property dangerouslySetInnerHTML bypasses JSX escaping.',
        impact: 'Exposes application to XSS if injected string is not sanitized with DOMPurify.',
        recommendation: 'Sanitize dynamic HTML content using DOMPurify before injecting.',
      });
    }

    if (/: \bany\b/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'ts-explicit-any',
        category: 'best_practice',
        title: 'Explicit "any" Type Annotation',
        severity: 'low',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Explicitly typing variables or function parameters as "any".',
        impact: 'Disables TypeScript compile-time safety and type checking benefits.',
        recommendation: 'Use "unknown" or define specific interface types.',
      });
    }

    if (/\bdebugger\b\s*;?/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'js-debugger-statement',
        category: 'bug',
        title: 'Active "debugger" Breakpoint Statement',
        severity: 'high',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'A debugger breakpoint statement is left in code.',
        impact: 'Will freeze page execution for users with Developer Tools open.',
        recommendation: 'Remove all debugger statements prior to committing.',
      });
    }
  });
}

// ─── Python Pattern Inspector ───────────────────────────────────

function analyzePython(
  _code: string,
  lines: string[],
  findings: CodeFinding[],
  categoryBreakdown: Record<AnalysisRuleCategory, number>,
  filePath: string
) {
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    if (/\b(eval|exec)\s*\(/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'py-eval-exec',
        category: 'security',
        title: 'Dynamic eval() / exec() Code Execution',
        severity: 'critical',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Python eval() or exec() dynamically compiles and executes code strings.',
        impact: 'Allows Remote Code Execution (RCE) if untrusted input reaches function parameters.',
        recommendation: 'Use ast.literal_eval() or native dictionary lookup functions instead.',
      });
    }

    if (/except\s*:/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'py-bare-except',
        category: 'best_practice',
        title: 'Bare "except:" Clause',
        severity: 'medium',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Catching exceptions without specifying an exception class.',
        impact: 'Catches SystemExit and KeyboardInterrupt, preventing graceful process termination.',
        recommendation: 'Catch specific exceptions like "except Exception:" or "except ValueError:".',
      });
    }

    if (/\bprint\s*\(/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'py-print-statement',
        category: 'maintainability',
        title: 'Raw print() Statement',
        severity: 'info',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Using print() instead of python logging module.',
        impact: 'Lacks log levels, timestamps, and log rotation capabilities.',
        recommendation: 'Use Python logging module (import logging; logging.info(...)).',
      });
    }

    if (/\bassert\b\s+/.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'py-assert-usage',
        category: 'bug',
        title: 'Production "assert" Statement Usage',
        severity: 'medium',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Using assert statements for validation logic.',
        impact: 'Assert statements are completely ignored when Python is executed with -O (optimized) flag.',
        recommendation: 'Use explicit if statements and raise ValueError/TypeError instead.',
      });
    }
  });
}

function analyzeGeneral(
  _code: string,
  lines: string[],
  findings: CodeFinding[],
  categoryBreakdown: Record<AnalysisRuleCategory, number>,
  filePath: string
) {
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'gen-todo-comment',
        category: 'maintainability',
        title: 'Unresolved TODO / FIXME Comment',
        severity: 'info',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Comment indicates incomplete or temporary code implementation.',
        impact: 'Accumulates technical debt over time.',
        recommendation: 'Resolve the task or create a tracked issue in your issue tracker.',
      });
    }
  });
}

function runUniversalRegexChecks(
  _code: string,
  lines: string[],
  findings: CodeFinding[],
  categoryBreakdown: Record<AnalysisRuleCategory, number>,
  filePath: string
) {
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    if (
      /(api[_-]?key|secret|password|passwd|auth[_-]?token|bearer)\s*[:=]\s*["'][A-Za-z0-9_\-\.]{8,}["']/i.test(
        lineText
      )
    ) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'sec-hardcoded-secret',
        category: 'security',
        title: 'Hardcoded Secret / API Key Detected',
        severity: 'critical',
        line: lineNum,
        filePath,
        snippet: lineText.trim().replace(/(["']).*?\1/g, '"********"'),
        description: 'Hardcoded credentials or API tokens discovered in source code.',
        impact: 'Allows attackers who access source repositories to compromise services and APIs.',
        recommendation: 'Extract secrets to environment variables (process.env or os.environ).',
      });
    }

    if (
      /(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s+.*?\+.*?\$?[A-Za-z0-9_]+/i.test(lineText) ||
      /SELECT\s+.*?\$\{[^}]+\}/i.test(lineText)
    ) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'sec-sql-injection-concat',
        category: 'security',
        title: 'Potential SQL Injection via String Concatenation',
        severity: 'high',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Constructing SQL queries using dynamic string concatenation or template literals.',
        impact: 'Exposes database to SQL Injection queries (unauthorized data read/write/deletion).',
        recommendation: 'Use parameterized queries ($1, ?) or an ORM query builder.',
      });
    }

    if (/\/[^\/\n]+\*\+[^\/\n]+\//.test(lineText)) {
      addFinding(findings, categoryBreakdown, {
        id: `finding-${findings.length + 1}`,
        ruleId: 'sec-redos-risk',
        category: 'security',
        title: 'Potential Regular Expression Denial of Service (ReDoS)',
        severity: 'medium',
        line: lineNum,
        filePath,
        snippet: lineText.trim(),
        description: 'Nested quantifiers in regular expressions can cause exponential backtracking.',
        impact: 'An attacker can send crafted inputs causing CPU 100% thread lockups.',
        recommendation: 'Simplify regular expression or use non-backtracking regex engines.',
      });
    }
  });
}

function addFinding(
  findings: CodeFinding[],
  categoryBreakdown: Record<AnalysisRuleCategory, number>,
  finding: CodeFinding
) {
  const exists = findings.some(
    (f) => f.ruleId === finding.ruleId && f.line === finding.line && f.filePath === finding.filePath
  );
  if (!exists) {
    findings.push(finding);
    categoryBreakdown[finding.category] = (categoryBreakdown[finding.category] || 0) + 1;
  }
}

function walkAST(node: any, callback: (node: any) => void) {
  if (!node || typeof node !== 'object') return;
  callback(node);

  for (const key in node) {
    if (key === 'loc' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walkAST(c, callback));
    } else if (child && typeof child === 'object' && child.type) {
      walkAST(child, callback);
    }
  }
}
