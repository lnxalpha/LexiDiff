
import React from 'react';
import { AlignedRow, ViewMode, UserComment, DiffChange } from '../types';

interface ComparisonPanelProps {
  rows: AlignedRow[];
  smartExplanations: Record<number, string>;
  viewMode: ViewMode;
  comments: UserComment[];
  onAddComment: (index: number) => void;
}

const DiffCell: React.FC<{ 
  part: DiffChange | null; 
  index: number; 
  explanation?: string;
  isLeft: boolean;
}> = ({ part, index, explanation, isLeft }) => {
  if (!part) {
    return (
      <div className="flex-1 min-h-[4rem] bg-slate-50/10 flex items-center justify-center p-4">
        <div className="w-full border-t border-dashed border-slate-200 opacity-20"></div>
      </div>
    );
  }

  const isChange = part.type !== 'unchanged';

  return (
    <div 
      className={`
        flex-1 relative group p-6 min-h-[4rem] transition-all duration-300
        ${part.type === 'added' ? 'bg-emerald-50/30 text-emerald-900 font-medium' : ''}
        ${part.type === 'removed' ? 'bg-rose-50/30 text-rose-900 line-through opacity-40' : ''}
        ${part.type === 'unchanged' ? 'text-slate-600' : ''}
        ${isChange ? 'hover:bg-slate-50/60 ring-1 ring-inset ring-slate-100/50' : ''}
      `}
    >
      <span className="font-mono text-[14px] leading-[1.7] break-words block whitespace-pre-wrap">{part.value}</span>
      
      {explanation && isChange && (
        <div className={`
          hidden lg:block absolute top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-500 translate-x-4 group-hover:translate-x-0 w-80
          ${isLeft ? 'left-[calc(100%+1.5rem)]' : 'right-[calc(100%+1.5rem)]'}
        `}>
           <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 ring-8 ring-slate-900/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">AI Legal Insight</span>
              </div>
              <p className="text-xs font-medium leading-relaxed italic text-slate-200">"{explanation}"</p>
           </div>
        </div>
      )}
    </div>
  );
};

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ rows, smartExplanations, onAddComment }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="sticky top-0 z-40 flex bg-white/95 backdrop-blur-md border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] shadow-sm">
        <div className="flex-1 p-4 px-10 border-r border-slate-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-slate-200"></div> Original Text
        </div>
        <div className="flex-1 p-4 px-10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Revised Version
        </div>
      </div>
      
      <div className="divide-y divide-slate-100">
        {rows.map((row, idx) => (
          <div key={idx} className="flex divide-x divide-slate-100 min-h-[4rem] hover:bg-slate-50/10 transition-colors">
            <DiffCell part={row.left} index={idx} isLeft={true} />
            <DiffCell part={row.right} index={idx} explanation={smartExplanations[idx]} isLeft={false} />
          </div>
        ))}
      </div>
    </div>
  );
};
