
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
4. LIABILITY. Provider's total liability shall not exceed $10,000.
5. GOVERNING LAW. This agreement is governed by the laws of California.`;

const SAMPLE_DOC_2 = `SOFTWARE SERVICES AGREEMENT

1. SERVICES. Provider shall provide enhanced software services to Client.
2. FEES. Client shall pay Provider $6,500 per month starting next quarter.
3. TERM. The agreement shall be for 24 months.
4. LIABILITY. Provider's total liability is uncapped for any breaches.
5. GOVERNING LAW. This agreement is governed by the laws of Delaware.`;

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

  const videoRef = useRef<HTMLVideoElement>(null);

  const hasContent = doc1.trim().length > 0 || doc2.trim().length > 0 || analysis !== null;

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear your documents and current progress?")) {
      setDoc1(""); setDoc2(""); setAlignedRows([]); setSmartExplanations([]); setComments([]); setCaseNotes(""); setAnalysis(null); setError(null);
    }
  };

  const handleCompare = async () => {
    if (!doc1.trim() || !doc2.trim()) {
      setError("Please provide text for both document versions before comparing.");
      return;
    }
    setError(null);
    const newAligned = computeAlignedDiff(doc1, doc2);
    setAlignedRows(newAligned);
    
    try {
      const explanations = await getSmartExplanations(newAligned);
      setSmartExplanations(explanations);
    } catch (e) {
      console.warn("Legal AI Insights were skipped.");
    }
    if (viewMode === 'analysis') setViewMode('split');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: '1' | '2') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(target);
    setError(null);
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
    } catch (err) {
      setError("File processing error. Please try a different format.");
    } finally {
      setIsExtracting(null);
    }
  };

  const startCamera = async (target: '1' | '2') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setShowCamera(target);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      setError("Unable to access camera.");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !showCamera) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const target = showCamera;
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
    setShowCamera(null);
    setIsExtracting(target);
    try {
      const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
      const text = await extractTextFromBlob(base64, 'image/jpeg');
      if (target === '1') setDoc1(text); else setDoc2(text);
    } catch (e) { setError("OCR processing failed."); }
    finally { setIsExtracting(null); }
  };

  const handleRunAnalysis = async () => {
    if (!doc1.trim() || !doc2.trim()) return;
    setIsAnalyzing(true);
    setViewMode('analysis');
    setError(null);
    try {
      const res = await analyzeDocuments(doc1, doc2);
      setAnalysis(res);
    } catch (e) {
      setError("AI Engine is momentarily busy. Please try again.");
      setViewMode('split');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">LEX<span className="text-indigo-600">DIFF</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">AI-Powered Legal Comparative Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setViewMode('split')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Comparison
              </button>
              <button 
                onClick={() => setViewMode('analysis')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'analysis' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                AI Insights
              </button>
            </div>
            
            {hasContent && (
              <button onClick={handleReset} className="text-slate-400 hover:text-rose-600 p-2 transition-colors rounded-lg hover:bg-rose-50" title="Reset All">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            <button onClick={() => { setDoc1(SAMPLE_DOC_1); setDoc2(SAMPLE_DOC_2); }} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all hidden md:block">Samples</button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full p-4 md:p-8 gap-6 md:gap-8 overflow-hidden">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-6 py-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
        )}

        {/* Camera Overlay */}
        {showCamera && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-6">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10" />
            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowCamera(null)} className="px-8 py-3 rounded-xl bg-white/10 text-white font-bold">Cancel</button>
              <button onClick={capturePhoto} className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/20">Capture</button>
            </div>
          </div>
        )}

        {viewMode === 'split' ? (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:h-[350px]">
              {[
                { id: '1', val: doc1, set: setDoc1, label: 'Document A', sub: 'Original / Signed' },
                { id: '2', val: doc2, set: setDoc2, label: 'Document B', sub: 'Proposed / New' }
              ].map(item => (
                <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative group">
                  <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{item.sub}</span>
                      <h3 className="text-sm font-bold text-slate-800">{item.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                       <label className="cursor-pointer p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-indigo-600">
                          <input type="file" className="hidden" accept=".docx,.pdf,.txt,image/*" onChange={(e) => handleFileUpload(e, item.id as '1' | '2')} />
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                       </label>
                       <button onClick={() => startCamera(item.id as '1' | '2')} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                    </div>
                  </div>
                  <textarea 
                    value={item.val} 
                    onChange={(e) => item.set(e.target.value)} 
                    placeholder="Paste text or import document..."
                    className="flex-1 p-6 text-sm font-medium resize-none focus:outline-none text-slate-700 bg-transparent leading-relaxed"
                  />
                  {isExtracting === item.id && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                       <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 py-4">
              <button 
                onClick={handleCompare} 
                disabled={!doc1 || !doc2}
                className="px-12 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-40"
              >
                Compare & Sync
              </button>
              <button 
                onClick={handleRunAnalysis} 
                disabled={!doc1 || !doc2 || isAnalyzing}
                className="px-12 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 disabled:opacity-40 flex items-center gap-2"
              >
                {isAnalyzing && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Deep Legal Analysis
              </button>
            </div>

            {alignedRows.length > 0 && (
              <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
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
          <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-12 overflow-y-auto custom-scrollbar">
            <AnalysisView analysis={analysis} loading={isAnalyzing} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center px-4">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Enterprise Legal AI v2.5.0</p>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Gemini 3.0 Engine
             </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
