
import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, DiffChange, LegalAnalysis, UserComment } from './types';
import { computeDiff } from './utils/diff';
import { analyzeDocuments, extractTextFromBlob } from './services/geminiService';
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
  const [doc1, setDoc1] = useState(SAMPLE_DOC_1);
  const [doc2, setDoc2] = useState(SAMPLE_DOC_2);
  const [diff, setDiff] = useState<DiffChange[]>(computeDiff(SAMPLE_DOC_1, SAMPLE_DOC_2));
  const [comments, setComments] = useState<UserComment[]>([]);
  const [caseNotes, setCaseNotes] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState<'1' | '2' | null>(null);
  const [showCamera, setShowCamera] = useState<'1' | '2' | null>(null);
  const [analysis, setAnalysis] = useState<LegalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCommentIndex, setActiveCommentIndex] = useState<number | null>(null);

  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Keep diff in sync when docs change (optional, but good for manual edits)
    // However, we only trigger on manual 'Compare' for performance
  }, []);

  const handleCompare = () => {
    if (!doc1.trim() && !doc2.trim()) {
      setError("Please enter text or upload documents to compare.");
      return;
    }
    setError(null);
    const newDiff = computeDiff(doc1, doc2);
    setDiff(newDiff);
    // Clear comments if text changes significantly? 
    // In a pro tool we'd map them, but for now we'll just keep them if indices match.
  };

  const handleAddComment = (index: number) => {
    setActiveCommentIndex(index);
  };

  const saveComment = (text: string) => {
    if (activeCommentIndex === null) return;
    
    const newComment: UserComment = {
      id: Math.random().toString(36).substr(2, 9),
      diffIndex: activeCommentIndex,
      text,
      author: "Lead Counsel",
      timestamp: Date.now()
    };

    setComments(prev => [...prev.filter(c => c.diffIndex !== activeCommentIndex), newComment]);
    setActiveCommentIndex(null);
  };

  const downloadReport = () => {
    const reportHtml = `
      <html>
        <head>
          <title>Legal Comparison Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
            .section { margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
            .risk-high { color: #e11d48; font-weight: bold; }
            .comment { background: #fef9c3; padding: 10px; border-left: 4px solid #eab308; margin: 10px 0; font-size: 0.9em; }
            .diff-added { background: #dcfce7; color: #166534; }
            .diff-removed { background: #fee2e2; color: #991b1b; text-decoration: line-through; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 0.85em; }
          </style>
        </head>
        <body>
          <h1>LexiDiff Legal Intelligence Report</h1>
          <div class="section">
            <h3>Executive Summary</h3>
            <p>${analysis?.summary || 'No AI analysis performed.'}</p>
          </div>
          
          <div class="section">
            <h3>Counsel's Case Notes</h3>
            <p>${caseNotes || 'No general notes provided.'}</p>
          </div>

          <div class="section">
            <h3>Human Annotations on Changes</h3>
            ${comments.map(c => `
              <div class="comment">
                <strong>Change:</strong> "${diff[c.diffIndex]?.value.trim()}"<br/>
                <strong>Note:</strong> ${c.text}<br/>
                <small>${new Date(c.timestamp).toLocaleString()}</small>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h3>AI Risk Audit</h3>
            ${analysis?.keyChanges.map(change => `
              <div style="margin-bottom: 15px;">
                <strong>${change.clause}</strong> (Impact: ${change.impact}, Risk: ${change.riskScore}/10)<br/>
                ${change.description}
              </div>
            `).join('') || 'N/A'}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Legal_Review_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: '1' | '2') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(target);
    try {
      let text = "";
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        text = await extractTextFromBlob(base64, file.type);
      } else {
        text = await file.text();
      }
      if (target === '1') setDoc1(text); else setDoc2(text);
    } catch (err) {
      setError("Failed to extract text from " + file.name);
    } finally {
      setIsExtracting(null);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setViewMode('analysis');
    try {
      const res = await analyzeDocuments(doc1, doc2);
      setAnalysis(res);
    } catch (e) {
      setError("AI Analysis failed.");
      setViewMode('split');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-xl border-b border-indigo-900/30 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif tracking-tight">LexiDiff AI</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Counsel's Decision Support</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-1 rounded-lg flex text-[10px] font-bold uppercase tracking-wider">
              {['split', 'unified', 'analysis'].map((m) => (
                <button key={m} onClick={() => setViewMode(m as any)} className={`px-3 py-1.5 rounded transition-all ${viewMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>{m}</button>
              ))}
            </div>
            <button onClick={downloadReport} className="bg-slate-100 text-slate-900 hover:bg-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase border shadow-sm transition-all flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Brief
            </button>
            <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold text-[10px] uppercase shadow-lg shadow-indigo-500/20">
              {isAnalyzing ? "Processing..." : "Run AI Audit"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden flex flex-col gap-6">
        {activeCommentIndex !== null && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                Add Professional Note
              </h3>
              <p className="text-xs text-slate-500 mb-4 italic">"Annotating the change: ${diff[activeCommentIndex]?.value.trim()}"</p>
              <textarea 
                autoFocus
                className="w-full h-32 p-4 border rounded-xl bg-slate-50 text-sm focus:ring-2 ring-indigo-500 outline-none"
                placeholder="e.g. This change is unacceptable per corporate policy. Revert to original terms."
                onKeyDown={(e) => { if(e.key === 'Enter' && e.ctrlKey) saveComment((e.target as any).value); }}
                id="comment-input"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setActiveCommentIndex(null)} className="px-4 py-2 text-sm font-bold text-slate-400">Cancel</button>
                <button 
                  onClick={() => saveComment((document.getElementById('comment-input') as HTMLTextAreaElement).value)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg"
                >
                  Save Annotation
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMode !== 'analysis' ? (
          <div className="flex flex-col flex-1 overflow-hidden gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
              <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                <div className="flex flex-col gap-2 min-h-0">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document 1</span>
                    <input type="file" onChange={(e) => handleFileUpload(e, '1')} className="hidden" id="f1" />
                    <label htmlFor="f1" className="cursor-pointer text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Upload Source</label>
                  </div>
                  <textarea value={doc1} onChange={(e) => setDoc1(e.target.value)} className="flex-1 p-4 border rounded-xl font-mono text-xs bg-white focus:ring-2 ring-indigo-100 outline-none resize-none shadow-sm" />
                </div>
                <div className="flex flex-col gap-2 min-h-0">
                   <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document 2</span>
                    <input type="file" onChange={(e) => handleFileUpload(e, '2')} className="hidden" id="f2" />
                    <label htmlFor="f2" className="cursor-pointer text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Upload Modified</label>
                  </div>
                  <textarea value={doc2} onChange={(e) => setDoc2(e.target.value)} className="flex-1 p-4 border rounded-xl font-mono text-xs bg-white focus:ring-2 ring-indigo-100 outline-none resize-none shadow-sm" />
                </div>
              </div>
              
              <div className="lg:col-span-1 flex flex-col gap-2 min-h-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Counsel's Case Notes</span>
                <textarea 
                  value={caseNotes}
                  onChange={(e) => setCaseNotes(e.target.value)}
                  placeholder="General strategy or notes for this case file..."
                  className="flex-1 p-4 border-2 border-dashed border-slate-200 rounded-xl font-sans text-xs bg-slate-50/50 focus:bg-white focus:border-indigo-400 outline-none resize-none transition-all"
                />
              </div>
            </div>

            <div className="h-[35vh] flex flex-col gap-4">
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                 <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                   Interactive Difference Engine
                   <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[8px]">PRO MODE</span>
                 </h2>
                 <button onClick={handleCompare} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Refresh Diff</button>
              </div>
              <ComparisonPanel diff={diff} viewMode={viewMode === 'analysis' ? 'unified' : viewMode} comments={comments} onAddComment={handleAddComment} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-12">
            <AnalysisView analysis={analysis} loading={isAnalyzing} />
            {comments.length > 0 && (
              <div className="mt-8 bg-white p-6 rounded-xl border shadow-sm">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Counsel's Annotations Summary</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {comments.map(c => (
                     <div key={c.id} className="p-3 bg-slate-50 border rounded-lg text-xs">
                        <div className="text-slate-400 mb-1 flex justify-between">
                          <span className="font-bold">Change Fragment:</span>
                          <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-mono text-slate-600 bg-white p-1 rounded border mb-2 italic">"...${diff[c.diffIndex]?.value.trim()}..."</p>
                        <p className="text-indigo-900 font-bold leading-relaxed">{c.text}</p>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-500 p-4 text-[10px] text-center font-bold uppercase tracking-[0.2em] shrink-0 border-t border-slate-800">
        Internal Legal Use Only • Confidential Data Processing • LexiDiff Pro v2.1
      </footer>
    </div>
  );
};

export default App;
