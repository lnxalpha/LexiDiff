
import React from 'react';
import { LegalAnalysis } from '../types';

interface AnalysisViewProps {
  analysis: LegalAnalysis | null;
  loading: boolean;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="mt-6 text-slate-800 font-bold tracking-tight text-lg">AI Legal Engine Analyzing Risks...</p>
        <p className="text-slate-400 text-sm mt-1">Cross-referencing liability, payments, and termination clauses.</p>
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b pb-8">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 font-serif">Deep Legal Report</h2>
          <p className="text-slate-500 font-medium mt-2">{analysis.contractType || 'Standard Commercial Agreement'}</p>
        </div>
        <div className={`px-6 py-3 rounded-full border-2 font-bold text-sm flex items-center gap-3 ${riskColors[analysis.riskAssessment.level]}`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
          {analysis.riskAssessment.level} Risk Profile
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <section className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Executive Summary</h3>
            <p className="text-slate-700 leading-relaxed text-xl font-medium">{analysis.summary}</p>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Key Variance Indicators</h3>
            <div className="space-y-4">
              {analysis.keyChanges.map((item, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[2.5rem] border hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-xl text-slate-900">{item.clause}</h4>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      item.impact === 'positive' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 
                      item.impact === 'negative' ? 'border-rose-200 text-rose-600 bg-rose-50' : 
                      'border-slate-200 text-slate-500'
                    }`}>
                      {item.impact === 'positive' ? 'Favorable' : item.impact === 'negative' ? 'Unfavorable' : 'Neutral'}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-6">{item.description}</p>
                  <div className="flex items-center gap-6">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.riskScore > 7 ? 'bg-rose-500' : item.riskScore > 4 ? 'bg-amber-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${item.riskScore * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">IMPACT {item.riskScore}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className={`p-8 rounded-[2.5rem] border shadow-sm ${riskColors[analysis.riskAssessment.level]}`}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-60">Risk Evaluation</h3>
            <p className="font-serif text-lg leading-relaxed italic text-slate-800">"{analysis.riskAssessment.explanation}"</p>
          </section>

          <section className="p-10 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl">
            <h3 className="text-[10px] font-bold uppercase tracking-widest mb-8 text-indigo-400">Strategic Recommendations</h3>
            <ul className="space-y-6">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-4">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                  <p className="text-slate-300 text-sm leading-relaxed">{rec}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
