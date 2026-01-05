
import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, AlignedRow, LegalAnalysis, UserComment } from './types';
import { computeAlignedDiff } from './utils/diff';
import { analyzeDocuments, extractTextFromBlob, getSmartExplanations } from './services/geminiService';
import { ComparisonPanel } from './components/ComparisonPanel';
import { AnalysisView } from './components/AnalysisView';
import mammoth from 'mammoth';

const SAMPLE_DOC_1 = `SOFTWARE SERVICES AGREEMENT
1. SERVICES. Provider shall provide software services to Client.
2. FEES. Client shall pay Provider $5,000 per month.
3. TERM. The agreement shall be for 12 months.
4. LIABILITY. Provider's total liability shall not exceed $10,000.`;

const SAMPLE_DOC_2 = `SOFTWARE SERVICES AGREEMENT
1. SERVICES. Provider shall provide enhanced software services to Client.
2. FEES. Client shall pay Provider $6,500 per month.
3. TERM. The agreement shall be for 24 months.
4. LIABILITY. Provider's total liability is uncapped for any breaches.`;

const App: React.FC = () => {
  const [doc1, setDoc1] = useState("");
  const [doc2, setDoc2] = useState("");
  const [alignedRows, setAlignedRows] = useState<AlignedRow[]>([]);
  const [smartExplanations, setSmartExplanations] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<UserComment[]>([]);
  const [caseNotes, setCaseNotes] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState<'1' | '2' | null>(null);
  const [showCamera, setShowCamera] = useState<'1' | '2' | null>(null);
  const [analysis, setAnalysis] = useState<LegalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  useEffect(() => {
    // Check for API Key on mount
    if (!process.env.API_KEY || process.env.API_KEY === "") {
      console.warn("API_KEY is missing from environment variables.");
      setIsApiKeyMissing(true);
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hasAnyData = doc1.trim() !== "" || doc2.trim() !== "" || analysis !== null;

  const handleReset = () => {
    if (window.confirm("Clear all data?")) {
      setDoc1(""); setDoc2(""); setAlignedRows([]); setSmartExplanations({}); setAnalysis(null); setError(null);
    }
  };

  const handleCompare = async () => {
    if (isApiKeyMissing) {
      setError("AI features disabled: API_KEY not found in environment.");
      return;
    }
    if (!doc1.trim() || !doc2.trim()) {
      setError("Add text to both versions to compare.");
      return;
    }
    setError(null);
    const newAligned = computeAlignedDiff(doc1, doc2);
    setAlignedRows(newAligned);
    try {
      const explanations = await getSmartExplanations(newAligned);
      setSmartExplanations(explanations);
    } catch (e) { 
      console.warn("AI Insights failed.");
      setError("AI comparison insights failed to load. Check console.");
    }
  };

  const handleRunAnalysis = async () => {
    if (!doc1.trim() || !doc2.trim()) return;
    setIsAnalyzing(true);
    setViewMode('analysis');
    try {
      const res = await analyzeDocuments(doc1, doc2);
      setAnalysis(res);
    } catch (e) {
      setError("Deep analysis failed. Please verify your Gemini API key in Vercel settings.");
      setViewMode('split');
    } finally { setIsAnalyzing(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: '1' | '2') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(target);
    try {
      let text = "";
      if (file.name.toLowerCase().endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        text = await extractTextFromBlob(base64, file.type);
      } else {
        text = await file.text();
      }
      if (target === '1') setDoc1(text); else setDoc2(text);
    } catch (err) { setError("File reading failed."); }
    finally { setIsExtracting(null); }
  };

  const handleDownload = () => {
    const content = analysis ? JSON.stringify(analysis, null, 2) : "Comparison Data";
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexidiff-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">L</div>
          <h1 className="text-xl font-black tracking-tight">LexiDiff</h1>
        </div>
        <div className="flex gap-2">
          {hasAnyData && (
            <button onClick={handleReset} className="px-4 py-2 text-xs font-bold text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-lg transition-all">Reset</button>
          )}
          <button onClick={() => { setDoc1(SAMPLE_DOC_1); setDoc2(SAMPLE_DOC_2); }} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">Try Samples</button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 gap-6">
        {isApiKeyMissing && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            System Warning: Gemini API Key is missing. Please add API_KEY to your environment variables.
          </div>
        )}

        {error && <div className="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-100 text-sm font-bold flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          {error} <button onClick={() => setError(null)} className="text-rose-300 hover:text-rose-500 text-xl">&times;</button>
        </div>}

        <div className="flex bg-slate-100 p-1 rounded-xl self-center w-fit mb-4 border border-slate-200 shadow-inner">
          <button onClick={() => setViewMode('split')} className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'split' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Comparator</button>
          <button onClick={() => setViewMode('analysis')} className={`px-8 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'analysis' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>AI Intelligence</button>
        </div>

        {viewMode === 'split' ? (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[250px] md:h-[400px]">
              {['1', '2'].map(id => (
                <div key={id} className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden relative shadow-sm group focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <div className="px-4 py-2 bg-slate-50/50 border-b flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Version {id === '1' ? 'A (Original)' : 'B (Modified)'}</span>
                    <label className="cursor-pointer text-indigo-600 hover:text-indigo-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                      Import <input type="file" className="hidden" accept=".docx,.pdf,.txt,image/*" onChange={e => handleFileUpload(e, id as '1' | '2')} />
                    </label>
                  </div>
                  <textarea 
                    value={id === '1' ? doc1 : doc2}
                    onChange={e => id === '1' ? setDoc1(e.target.value) : setDoc2(e.target.value)}
                    className="flex-1 p-6 text-sm font-medium focus:outline-none resize-none leading-relaxed text-slate-700 bg-transparent placeholder:text-slate-200"
                    placeholder="Paste or upload document text..."
                  />
                  {isExtracting === id && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">AI Reading...</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-center gap-4">
              <button 
                onClick={handleCompare} 
                disabled={!doc1 || !doc2}
                className="bg-slate-900 text-white px-12 py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                Sync & Align
              </button>
              <button 
                onClick={handleRunAnalysis} 
                disabled={!doc1 || !doc2 || isAnalyzing}
                className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 flex items-center gap-3"
              >
                {isAnalyzing ? "Analyzing..." : "AI Legal Report"}
              </button>
            </div>

            {alignedRows.length > 0 && (
              <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
                <ComparisonPanel 
                  rows={alignedRows} 
                  smartExplanations={smartExplanations} 
                  viewMode={viewMode} 
                  comments={comments} 
                  onAddComment={() => {}} 
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-6 md:p-12 overflow-y-auto custom-scrollbar shadow-2xl">
            <AnalysisView analysis={analysis} loading={isAnalyzing} />
            {analysis && (
              <div className="mt-12 flex justify-center pt-8 border-t border-slate-50">
                <button onClick={handleDownload} className="bg-slate-100 text-slate-600 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   Download Full Report
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 text-center">
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
          LexiDiff AI Professional Edition
          <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
          Powered by Gemini 3.0
        </p>
      </footer>
    </div>
  );
};

export default App;
