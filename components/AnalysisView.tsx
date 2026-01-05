
import React from 'react';
import { LegalAnalysis } from '../types';

interface AnalysisViewProps {
  analysis: LegalAnalysis | null;
  loading: boolean;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 md:h-96 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-t-2 border-b-2 border-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="h-1.5 w-1.5 md:h-2 md:w-2 bg-indigo-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-4 md:mt-6 text-slate-800 font-bold tracking-tight text-sm md:text-base">AI Analysis in progress...</p>
        <p className="text-slate-400 text-[10px] md:text-sm mt-1 max-w-xs text-center px-4">Checking for important changes in rules, payments, and risk factors.</p>
      </div>
    );
  }

  if (!analysis) return null;

  const riskColors = {
    Low: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    Medium: 'border-amber-200 bg-amber-50 text-amber-900',
    High: 'border-rose-200 bg-rose-50 text-rose-900',
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 font-serif">Analysis Report</h2>
          <p className="text-xs md:text-base text-slate-500 font-medium mt-1">{analysis.contractType && `Document Type: ${analysis.contractType}`}</p>
        </div>
        <div className={`px-4 md:px-6 py-2 md:py-3 rounded-full border-2 font-bold text-xs md:text-sm flex items-center gap-2 ${riskColors[analysis.riskAssessment.level]}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          Overall Risk: {analysis.riskAssessment.level}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Summary */}
          <section className="bg-white p-6 md:p-8 rounded-2xl border shadow-sm">
            <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Summary</h3>
            <p className="text-slate-700 leading-relaxed text-sm md:text-lg">{analysis.summary}</p>
          </section>

          {/* Detailed Changes */}
          <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 md:px-8 py-4 md:py-5 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Significant Changes</h3>
              <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase">Risk Score</span>
            </div>
            <div className="divide-y">
              {analysis.keyChanges.map((item, idx) => (
                <div key={idx} className="p-6 md:p-8 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-3">
                    <h4 className="font-bold text-slate-900 text-base md:text-xl">{item.clause}</h4>
                    <span className={`px-3 py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase border shrink-0 ${
                      item.impact === 'positive' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 
                      item.impact === 'negative' ? 'border-rose-200 text-rose-700 bg-rose-50' : 
                      'border-slate-200 text-slate-600 bg-slate-50'
                    }`}>
                      {item.impact === 'positive' ? 'Favorable' : item.impact === 'negative' ? 'Unfavorable' : 'Neutral'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">{item.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${item.riskScore > 7 ? 'bg-rose-500' : item.riskScore > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${item.riskScore * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-400 shrink-0">Impact Score: {item.riskScore}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 md:space-y-8">
          <section className={`p-6 md:p-8 rounded-2xl border shadow-sm ${riskColors[analysis.riskAssessment.level]}`}>
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 opacity-70">Expert Risk Profile</h3>
            <p className="text-sm md:text-base font-medium leading-relaxed italic text-slate-800">"{analysis.riskAssessment.explanation}"</p>
          </section>

          <section className="p-6 md:p-8 bg-slate-900 text-white rounded-2xl shadow-xl border-t-4 border-indigo-500">
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6 text-indigo-400">Next Steps</h3>
            <ul className="space-y-5">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-4 text-sm md:text-base leading-relaxed">
                  <span className="text-indigo-500 font-bold mt-1 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="text-slate-300">{rec}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
