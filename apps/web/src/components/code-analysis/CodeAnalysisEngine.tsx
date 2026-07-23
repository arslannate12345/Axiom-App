'use client';

import { motion } from 'motion/react';
import Editor from '@monaco-editor/react';
import { useCodeAnalysisStore } from '@/stores/codeAnalysisStore';
import { CodeAnalysisResults } from './CodeAnalysisResults';
import { cn } from '@/lib/utils';

export function CodeAnalysisEngine() {
  const {
    inputMode,
    code,
    language,
    filename,
    githubUrl,
    isAnalyzing,
    activeAudit,
    error,
    setInputMode,
    setCode,
    setLanguage,
    setFilename,
    setGithubUrl,
    startAnalysis,
  } = useCodeAnalysisStore();

  const handleLanguageChange = (newLang: 'javascript' | 'typescript' | 'python') => {
    setLanguage(newLang);
    if (newLang === 'python') setFilename('script.py');
    else if (newLang === 'typescript') setFilename('app.ts');
    else setFilename('app.js');
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-950/40 border-emerald-500/40 shadow-sm';
      case 'B':
        return 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-500/40 shadow-sm';
      case 'C':
        return 'text-amber-600 dark:text-amber-400 bg-white dark:bg-amber-950/40 border-amber-500/40 shadow-sm';
      case 'D':
        return 'text-orange-600 dark:text-orange-400 bg-white dark:bg-orange-950/40 border-orange-500/40 shadow-sm';
      default:
        return 'text-red-600 dark:text-red-400 bg-white dark:bg-red-950/40 border-red-500/40 shadow-sm';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-600/30">
                <span
                  className="material-symbols-outlined text-white text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  code_blocks
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Static Code Analysis Engine
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              White-box code inspection: AST parsing, GitHub repository scanning, security smells, and code quality scoring.
            </p>
          </div>
        </div>

        {/* Input Mode Selector Tabs */}
        <div className="flex border-b border-border/80 gap-6 text-sm font-extrabold">
          <button
            onClick={() => setInputMode('paste')}
            className={cn(
              'pb-2.5 transition-all flex items-center gap-2 border-b-2',
              inputMode === 'paste'
                ? 'border-slate-600 text-slate-700 dark:text-slate-200'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            <span>Paste / Code Editor</span>
          </button>
          <button
            onClick={() => setInputMode('github')}
            className={cn(
              'pb-2.5 transition-all flex items-center gap-2 border-b-2',
              inputMode === 'github'
                ? 'border-slate-600 text-slate-700 dark:text-slate-200'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">folder_git</span>
            <span>GitHub Repository</span>
          </button>
        </div>

        {/* MODE 1: PASTE / EDITOR */}
        {inputMode === 'paste' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-border/80 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Language:</label>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value as any)}
                    className="h-8 px-2.5 rounded-lg border border-border/80 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground">File:</label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="app.js"
                    className="h-8 px-2.5 w-32 rounded-lg border border-border/80 bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                  />
                </div>
              </div>

              <button
                onClick={() => startAnalysis()}
                disabled={isAnalyzing}
                className="h-9 px-5 rounded-xl font-extrabold text-white shadow-lg shadow-slate-600/25 transition-all duration-200 hover:shadow-slate-600/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 text-xs"
                style={{ background: 'linear-gradient(135deg, #475569 0%, #334155 100%)' }}
              >
                {isAnalyzing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">
                      autorenew
                    </span>
                    <span>Analyzing Code...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">code</span>
                    <span>Run Code Analysis</span>
                  </>
                )}
              </button>
            </div>

            {/* Monaco Editor Container */}
            <div className="border border-border/80 rounded-2xl overflow-hidden bg-slate-950 shadow-md">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-slate-200 font-bold">{filename}</span>
                </div>
                <span>{code.split('\n').length} lines</span>
              </div>
              <div className="h-64 sm:h-80">
                <Editor
                  height="100%"
                  language={
                    language === 'typescript' ? 'typescript' : language === 'python' ? 'python' : 'javascript'
                  }
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* MODE 2: GITHUB REPOSITORY */
          <div className="space-y-3 p-5 rounded-2xl bg-white dark:bg-card border border-border/80 shadow-sm space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">GitHub Public Repository URL:</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                    link
                  </span>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/expressjs/express or owner/repo"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/80 bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                  />
                </div>
                <button
                  onClick={() => startAnalysis()}
                  disabled={isAnalyzing}
                  className="h-11 px-6 rounded-xl font-extrabold text-white shadow-lg shadow-slate-600/25 transition-all duration-200 hover:shadow-slate-600/40 hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 text-xs shrink-0"
                  style={{ background: 'linear-gradient(135deg, #475569 0%, #334155 100%)' }}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        autorenew
                      </span>
                      <span>Fetching & Scanning Repo...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">folder_git</span>
                      <span>Scan Repository</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Try sample repos:</span>
              <button
                type="button"
                onClick={() => setGithubUrl('https://github.com/expressjs/express')}
                className="px-2 py-0.5 rounded bg-muted/60 hover:bg-muted font-mono text-foreground transition-colors"
              >
                expressjs/express
              </button>
              <button
                type="button"
                onClick={() => setGithubUrl('https://github.com/lodash/lodash')}
                className="px-2 py-0.5 rounded bg-muted/60 hover:bg-muted font-mono text-foreground transition-colors"
              >
                lodash/lodash
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}
      </div>

      {/* Main Analysis Display */}
      {activeAudit && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto w-full space-y-6"
        >
          {/* Overview Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Grade & Score */}
            <div className="md:col-span-2 bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Code Health Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{activeAudit.score}</span>
                  <span className="text-sm font-bold text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono truncate max-w-xs">
                  {activeAudit.github_url || activeAudit.filename} (
                  {activeAudit.summary.linesOfCode} LOC)
                </p>
              </div>

              <div
                className={cn(
                  'w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-black',
                  getGradeColor(activeAudit.grade)
                )}
              >
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-0.5">
                  Grade
                </span>
                <span className="text-3xl">{activeAudit.grade}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Critical & High
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-red-500">
                  {activeAudit.summary.criticalCount + activeAudit.summary.highCount}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">issues</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Requires immediate fix</span>
            </div>

            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Files Analyzed
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
                  {activeAudit.summary.filesAnalyzedCount || 1}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">files</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">
                {activeAudit.summary.linesOfCode} total lines
              </span>
            </div>
          </div>

          {/* GitHub File Summaries Breakdown */}
          {activeAudit.file_summaries && activeAudit.file_summaries.length > 1 && (
            <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-lg">folder_open</span>
                Analyzed Repository Files ({activeAudit.file_summaries.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {activeAudit.file_summaries.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-mono font-bold text-foreground truncate">{f.filename}</p>
                      <span className="text-[10px] text-muted-foreground">{f.linesOfCode} LOC</span>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold shrink-0',
                        f.findingsCount > 0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      )}
                    >
                      {f.findingsCount} issues
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Breakdown */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                checklist
              </span>
              Static Analysis Findings ({activeAudit.findings.length})
            </h3>
            <CodeAnalysisResults findings={activeAudit.findings} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
