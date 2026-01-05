
import React, { useState, useRef } from 'react';
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
  const [activeCommentIndex, setActiveCommentIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const hasAnyData = doc1.trim() !== "" || doc2.trim() !== "" || alignedRows.length > 0 || analysis !== null;

  const handleReset = () => {
    setDoc1("");
    setDoc2("");
    setAlignedRows([]);
    setSmartExplanations({});
    setComments([]);
    setCaseNotes("");
    setAnalysis(null);
    setError(null);
    setViewMode('split');
  };

  const handleCompare = async () => {
    if (!doc1.trim() || !doc2.trim()) {
      setError("Please add text to both sides to start the comparison.");
      return;
    }
    setError(null);
    const newAligned = computeAlignedDiff(doc1, doc2);
    setAlignedRows(newAligned);
    
    try {
      const explanations = await getSmartExplanations(newAligned);
      setSmartExplanations(explanations);
    } catch (e) {
      console.error("Failed to get smart explanations");
    }

    if (viewMode === 'analysis') setViewMode('split');
  };

  const toBase64 = (file: File | Blob): Promise<string> => 
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });

  const startCamera = async (target: '1' | '2') => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setShowCamera(target);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
    } catch (err) {
      setError("Cannot open camera. Please check your browser settings.");
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
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(t => t.stop());
    const target = showCamera;
    setShowCamera(null);

    if (blob) {
      setIsExtracting(target);
      try {
        const base64 = await toBase64(blob);
        const text = await extractTextFromBlob(base64, 'image/jpeg');
        if (target === '1') setDoc1(text); else setDoc2(text);
      } catch (err) {
        setError("Could not read text from the photo.");
      } finally {
        setIsExtracting(null);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: '1' | '2') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(target);
    setError(null);
    try {
      let text = "";
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const base64 = await toBase64(file);
        text = await extractTextFromBlob(base64, file.type);
      } else {
        text = await file.text();
      }
      if (target === '1') setDoc1(text); else setDoc2(text);
    } catch (err) {
      setError("Could not open this file type. Try a PDF, Word doc, or image.");
    } finally {
      setIsExtracting(null);
    }
  };

  const handleRunAnalysis = async () => {
    if (!doc1.trim() || !doc2.trim()) {
      setError("Please add two documents to run an AI analysis.");
      return;
    }
    setIsAnalyzing(true);
    setViewMode('analysis');
    setError(null);
    try {
      const res = await analyzeDocuments(doc1, doc2);
      setAnalysis(res);
    } catch (e) {
      setError("The AI is taking a break. Please try again in a moment.");
      setViewMode('split');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis && alignedRows.length === 0) {
      setError("No analysis or comparison results to download yet.");
      return;
    }

    let reportText = `LEXIDIFF DOCUMENT ANALYSIS REPORT\n`;
    reportText += `Generated on: ${new Date().toLocaleString()}\n\n`;

    if (analysis) {
      reportText += `SUMMARY:\n${analysis.summary}\n\n`;
      reportText += `RISK LEVEL: ${analysis.riskAssessment.level}\n`;
      reportText += `RISK EXPLANATION: ${analysis.riskAssessment.explanation}\n\n`;
      reportText += `KEY CHANGES:\n`;
      analysis.keyChanges.forEach((item, idx) => {
        reportText += `${idx + 1}. [${item.clause}] Impact: ${item.impact.toUpperCase()}, Risk Score: ${item.riskScore}/10\n`;
        reportText += `   Description: ${item.description}\n\n`;
      });
      reportText += `RECOMMENDATIONS:\n`;
      analysis.recommendations.forEach(rec => {
        reportText += `- ${rec}\n`;
      });
      reportText += `\n`;
    }

    if (alignedRows.length > 0) {
      reportText += `DETAILED TEXT DIFFERENCES:\n`;
      alignedRows.forEach((row, idx) => {
        if (row.left?.type === 'removed') {
          reportText += `[REMOVE] ${row.left.value}\n`;
        }
        if (row.right?.type === 'added') {
          reportText += `[ADD]    ${row.right.value}\n`;
        }
        if (smartExplanations[idx]) {
          reportText += `(AI Insight: ${smartExplanations[idx]})\n`;
        }
      });
    }

    if (caseNotes.trim()) {
      reportText += `\nUSER NOTES:\n${caseNotes}\n`;
    }

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LexiDiff_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadSamples = () => {
    setDoc1(SAMPLE_DOC_1);
    setDoc2(SAMPLE_DOC_2);
  };

  const DocumentInput = ({ target, value, onChange }: { target: '1' | '2', value: string, onChange: (v: string) => void }) => (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-lg transition-all duration-500 h-[350px] md:h-[500px]">
      <div className="px-4 md:px-8 py-3 md:py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
        <h3 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 md:gap-3">
          <span className={`w-2 md:w-2.5 h-2 md:h-2.5 rounded-full ${target === '1' ? 'bg-slate-300' : 'bg-indigo-400'}`}></span>
          {target === '1' ? 'First Version' : 'Second Version'}
        </h3>
        {value.length > 0 && (
          <div className="flex gap-1 md:gap-2">
            <button onClick={() => startCamera(target)} className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></button>
            <button onClick={() => onChange("")} className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
        )}
      </div>
      <div className="flex-1 relative">
        {value.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-12 text-center animate-in fade-in duration-700">
            <div className="w-12 h-12 md:w-20 md:h-20 bg-slate-50 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-8 border border-slate-100 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-10 md:w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">Add Document {target}</h4>
            <p className="text-[10px] md:text-xs text-slate-400 max-w-[200px] mb-4 md:mb-8 leading-relaxed font-medium">Scan, upload, or paste text.</p>
            
            <div className="grid grid-cols-2 gap-2 md:gap-3 w-full max-w-xs px-4">
              <button 
                onClick={() => startCamera(target)}
                className="flex flex-col items-center justify-center p-3 md:p-5 bg-white border-2 border-slate-100 rounded-2xl md:rounded-3xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-50 transition-all group/btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-indigo-600 mb-1 md:mb-2 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900">Scan</span>
              </button>
              
              <label className="flex flex-col items-center justify-center p-3 md:p-5 bg-white border-2 border-slate-100 rounded-2xl md:rounded-3xl hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer group/btn">
                <input type="file" onChange={(e) => handleFileUpload(e, target)} className="hidden" />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-indigo-600 mb-1 md:mb-2 group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900">Upload</span>
              </label>
            </div>
            
            <button 
              onClick={() => onChange(" ")}
              className="mt-4 md:mt-6 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-colors"
            >
              Or paste text
            </button>
          </div>
        ) : (
          <textarea 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="w-full h-full p-6 md:p-10 font-mono text-xs md:text-sm leading-relaxed text-slate-700 bg-transparent focus:outline-none resize-none animate-in fade-in duration-500" 
            placeholder="Type or paste here..." 
          />
        )}
        {isExtracting === target && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center z-10 animate-in fade-in">
            <div className="w-12 h-12 md:w-16 md:h-16 border-[4px] md:border-[5px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4 md:mb-6 shadow-xl shadow-indigo-100"></div>
            <p className="text-xs md:text-sm font-black text-indigo-900 uppercase tracking-[0.3em]">AI Reading...</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-10 py-4 md:py-6 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="bg-indigo-600 text-white p-2 md:p-3 rounded-xl md:rounded-2xl shadow-xl shadow-indigo-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-7 md:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black font-serif tracking-tight text-slate-900">LexiDiff</h1>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] leading-none mt-1">Smart Comparator</p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
            <div className="flex gap-4 items-center">
              {hasAnyData && (
                <button 
                  onClick={handleReset} 
                  className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors animate-in fade-in slide-in-from-right-4"
                >
                  Reset All
                </button>
              )}
              <button onClick={loadSamples} className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Try Example</button>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-2xl border border-slate-200 shadow-inner">
              {['split', 'analysis'].map((m) => (
                <button key={m} onClick={() => setViewMode(m as any)} className={`px-4 md:px-10 py-2 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-[12px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === m ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>
                  {m === 'split' ? 'Review' : 'Analysis'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {showCamera && (
        <div className="fixed inset-0 bg-slate-900/98 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-3xl">
          <div className="relative w-full max-w-3xl bg-black rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 scale-in-center">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover" />
            <div className="absolute inset-x-0 bottom-8 md:bottom-16 flex justify-center items-center gap-8 md:gap-16">
              <button onClick={() => { (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); setShowCamera(null); }} className="bg-white/10 hover:bg-white/20 text-white p-4 md:p-7 rounded-full backdrop-blur-2xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button onClick={capturePhoto} className="group bg-white p-0.5 md:p-1 rounded-full shadow-2xl hover:scale-110 transition-transform">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-[4px] md:border-[6px] border-slate-900 flex items-center justify-center"><div className="w-12 h-12 md:w-20 md:h-20 bg-indigo-600 rounded-full"></div></div>
              </button>
            </div>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 md:px-8 py-2 md:py-3 bg-slate-900/50 backdrop-blur-xl rounded-full border border-white/10">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-white flex items-center gap-2 md:gap-3"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Scanning Version {showCamera}</p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-10 overflow-hidden flex flex-col gap-6 md:gap-10 pb-48 md:pb-40">
        {error && (
          <div className="bg-white border-l-[4px] md:border-l-[8px] border-rose-500 text-slate-800 px-6 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-50 rounded-full flex items-center justify-center shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-rose-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg></div>
              <span className="text-sm md:text-base font-bold tracking-tight text-slate-900">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-slate-300 hover:text-slate-900 font-bold text-2xl md:text-3xl transition-colors shrink-0">&times;</button>
          </div>
        )}

        {viewMode !== 'analysis' ? (
          <div className="flex flex-col flex-1 gap-8 md:gap-12 overflow-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-10">
              <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <DocumentInput target="1" value={doc1} onChange={setDoc1} />
                <DocumentInput target="2" value={doc2} onChange={setDoc2} />
              </div>

              <div className="xl:col-span-1 flex flex-col gap-4 md:gap-6">
                <h3 className="px-4 text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Notes
                </h3>
                <div className="flex-1 bg-white rounded-[1.5rem] md:rounded-[3rem] border border-slate-200 shadow-sm p-6 md:p-10 group relative min-h-[200px] xl:h-[500px]">
                   <textarea value={caseNotes} onChange={(e) => setCaseNotes(e.target.value)} className="w-full h-full bg-transparent text-sm md:text-base leading-relaxed text-slate-800 focus:outline-none resize-none placeholder:text-slate-300 font-medium" placeholder="Add your own notes here..." />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:gap-8 flex-1 min-h-[400px] md:min-h-[600px] mb-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-slate-200 pt-6 md:pt-10 gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
                  <h2 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-[0.4em]">Comparison</h2>
                  <div className="flex flex-wrap gap-4 md:gap-6">
                    <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 md:px-5 py-1.5 md:py-2 rounded-xl border border-emerald-100 shadow-sm"><span className="w-2 md:w-3 h-2 md:h-3 rounded bg-emerald-500"></span> ADDED</div>
                    <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] font-black text-rose-700 bg-rose-50 px-3 md:px-5 py-1.5 md:py-2 rounded-xl border border-rose-100 shadow-sm"><span className="w-2 md:w-3 h-2 md:h-3 rounded bg-rose-500"></span> REMOVED</div>
                  </div>
                </div>
                <p className="hidden md:flex text-[11px] text-slate-400 font-bold uppercase tracking-widest italic items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Hover for AI insights
                </p>
              </div>
              <div className="flex-1 bg-white rounded-[2rem] md:rounded-[4rem] border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-900/5 transition-all duration-700">
                {alignedRows.length > 0 ? (
                  <ComparisonPanel rows={alignedRows} smartExplanations={smartExplanations} viewMode={viewMode} comments={comments} onAddComment={(idx) => setActiveCommentIndex(idx)} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-10 md:p-20 text-center bg-slate-50/30">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-xl mb-6 md:mb-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-4">Compare View</h3>
                    <p className="text-xs md:text-sm text-slate-400 max-w-sm font-medium leading-relaxed">Add two documents and click <b>Compare Documents</b> below to see what changed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-32 animate-in fade-in zoom-in-95 duration-1000">
            <AnalysisView analysis={analysis} loading={isAnalyzing} />
            <div className="mt-12 md:mt-20 flex justify-center">
              <button onClick={() => setViewMode('split')} className="flex items-center gap-3 md:gap-4 px-8 md:px-12 py-3 md:py-4 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl md:rounded-3xl transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Go back to Review
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-3xl border-t border-slate-200 p-4 md:p-8 z-40 flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5">
        <div className="flex w-full md:w-auto gap-4">
          <button onClick={handleCompare} className="flex-1 md:flex-none group flex items-center justify-center gap-3 md:gap-5 bg-slate-100 text-slate-900 hover:bg-slate-200 px-6 md:px-10 py-3 md:py-5 rounded-2xl md:rounded-[2.5rem] text-[11px] md:text-[13px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-slate-400 group-hover:text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2" /></svg>
            Compare
          </button>
          <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="flex-1 md:flex-none flex items-center justify-center gap-3 md:gap-5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 px-6 md:px-14 py-3 md:py-5 rounded-2xl md:rounded-[2.5rem] text-[11px] md:text-[13px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all hover:scale-105 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {isAnalyzing ? "..." : "AI Analysis"}
          </button>
        </div>
        <button onClick={handleDownloadReport} className="w-full md:w-auto flex items-center justify-center gap-3 md:gap-5 bg-slate-900 text-white hover:bg-black px-6 md:px-10 py-3 md:py-5 rounded-2xl md:rounded-[2.5rem] text-[11px] md:text-[13px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586" /></svg>
          Download Report
        </button>
      </footer>
    </div>
  );
};

export default App;
