import { create } from 'zustand';
import type { CodeAnalysisAudit } from '@axiom/core/types';
import { runCodeAnalysis } from '@/lib/code-analysis-service';

interface CodeAnalysisState {
  inputMode: 'paste' | 'github';
  code: string;
  language: 'javascript' | 'typescript' | 'python';
  filename: string;
  githubUrl: string;
  isAnalyzing: boolean;
  activeAudit: CodeAnalysisAudit | null;
  error: string | null;

  setInputMode: (mode: 'paste' | 'github') => void;
  setCode: (code: string) => void;
  setLanguage: (lang: 'javascript' | 'typescript' | 'python') => void;
  setFilename: (name: string) => void;
  setGithubUrl: (url: string) => void;
  startAnalysis: () => Promise<CodeAnalysisAudit | void>;
  reset: () => void;
}

const DEFAULT_SAMPLE_CODE = `// Sample JavaScript Code for Analysis
function processUserData(user) {
  var apiKey = "sk_live_9876543210abcdef"; // Hardcoded secret
  
  if (user.id == 123) { // Loose equality
    eval("console.log('" + user.name + "')"); // eval execution
  }
  
  try {
    document.getElementById("user-bio").innerHTML = user.bio; // innerHTML XSS
  } catch (e) {
    // Empty catch block
  }
  
  console.log("Processing finished for user: " + user.name);
  return true;
}
`;

export const useCodeAnalysisStore = create<CodeAnalysisState>((set, get) => ({
  inputMode: 'paste',
  code: DEFAULT_SAMPLE_CODE,
  language: 'javascript',
  filename: 'app.js',
  githubUrl: 'https://github.com/expressjs/express',
  isAnalyzing: false,
  activeAudit: null,
  error: null,

  setInputMode: (inputMode: 'paste' | 'github') => set({ inputMode, error: null }),
  setCode: (code: string) => set({ code, error: null }),
  setLanguage: (language: 'javascript' | 'typescript' | 'python') => set({ language, error: null }),
  setFilename: (filename: string) => set({ filename, error: null }),
  setGithubUrl: (githubUrl: string) => set({ githubUrl, error: null }),

  startAnalysis: async () => {
    const state = get();

    if (state.inputMode === 'github') {
      if (!state.githubUrl || !state.githubUrl.trim()) {
        set({ error: 'Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)' });
        return;
      }
    } else {
      if (!state.code || !state.code.trim()) {
        set({ error: 'Please enter or paste valid code to analyze' });
        return;
      }
    }

    set({ isAnalyzing: true, error: null });

    try {
      const audit = await runCodeAnalysis({
        inputMode: state.inputMode,
        code: state.inputMode === 'paste' ? state.code : undefined,
        language: state.language,
        filename: state.filename,
        githubUrl: state.inputMode === 'github' ? state.githubUrl : undefined,
      });

      set({ activeAudit: audit, isAnalyzing: false });
      return audit;
    } catch (err: any) {
      set({
        error: err.message || 'Code analysis failed. Please check your inputs and try again.',
        isAnalyzing: false,
      });
    }
  },

  reset: () =>
    set({
      inputMode: 'paste',
      code: DEFAULT_SAMPLE_CODE,
      language: 'javascript',
      filename: 'app.js',
      githubUrl: 'https://github.com/expressjs/express',
      activeAudit: null,
      error: null,
      isAnalyzing: false,
    }),
}));
