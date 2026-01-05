
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
  onAddComment: (index: number) => void;
  isLeft: boolean;
}> = ({ part, index, explanation, onAddComment, isLeft }) => {
  if (!part) {
    return (
      <div className="flex-1 min-h-[3rem] bg-slate-50/10 flex items-center justify-center p-3 md:p-4">
        <div className="w-full border-t border-dashed border-slate-200 opacity-20"></div>
      </div>
    );
  }

  const isChange = part.type !== 'unchanged';

  return (
    <div 
      onClick={() => isChange && onAddComment(index)}
      className={`
        flex-1 relative group cursor-pointer p-4 md:p-6 min-h-[3rem] transition-all duration-300
        ${part.type === 'added' ? 'bg-emerald-50/40 text-emerald-900' : ''}
        ${part.type === 'removed' ? 'bg-rose-50/40 text-rose-900 line-through opacity-40' : ''}
        ${part.type === 'unchanged' ? 'text-slate-600' : ''}
        ${isChange ? 'hover:bg-indigo-50/60 ring-1 ring-inset ring-indigo-100/30' : ''}
      `}
    >
      <span className="font-mono text-sm md:text-[15px] leading-relaxed md:leading-[1.6] break-words block whitespace-pre-wrap">{part.value}</span>
      
      {explanation && isChange && (
        <div className={`
          hidden md:block absolute top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-500 translate-x-4 group-hover:translate-x-0 w-80
          ${isLeft ? 'left-[calc(100%+1.5rem)]' : 'right-[calc(100%+1.5rem)]'}
        `}>
           <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 ring-8 ring-slate-900/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">AI Explanation</span>
              </div>
              <p className="text-sm font-medium leading-relaxed italic text-slate-200">"{explanation}"</p>
           </div>
           <div className={`
             absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rotate-45 border-white/10
             ${isLeft ? 'left-[-8px] border-l border-b' : 'right-[-8px] border-r border-t'}
           `}></div>
        </div>
      )}

      {/* Mobile Inline Insight */}
      {explanation && isChange && (
        <div className="md:hidden mt-3 p-3 bg-slate-900 text-white rounded-xl text-[11px] font-medium leading-relaxed italic border border-white/10">
          <span className="block text-indigo-400 font-black uppercase tracking-widest text-[8px] mb-1">AI Insight</span>
          "{explanation}"
        </div>
      )}

      {isChange && !explanation && (
        <div className={`hidden md:block absolute -top-8 ${isLeft ? 'left-4' : 'right-4'} bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 shadow-xl pointer-events-none`}>
          Click to add a note
        </div>
      )}
    </div>
  );
};

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ rows, smartExplanations, viewMode, comments, onAddComment }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-y-auto scroll-smooth custom-scrollbar">
      {/* Sticky Labels */}
      <div className="sticky top-0 z-40 flex bg-white/90 backdrop-blur-xl border-b border-slate-200 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] shadow-sm">
        <div className="flex-1 p-3 md:p-4 px-6 md:px-10 border-r border-slate-200 flex items-center gap-2 md:gap-3">
          <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-slate-200"></div> First
        </div>
        <div className="flex-1 p-3 md:p-4 px-6 md:px-10 flex items-center gap-2 md:gap-3">
          <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-indigo-500"></div> Second
        </div>
      </div>
      
      {/* Aligned Rows */}
      <div className="divide-y divide-slate-100/50 bg-white">
        {rows.map((row, idx) => (
          <div 
            key={idx} 
            className="flex group divide-x divide-slate-100/50 min-h-[3.5rem] hover:bg-slate-50/20 transition-colors"
          >
            {/* Version 1 Side */}
            <div className="flex-1 flex">
              <DiffCell 
                part={row.left} 
                index={idx} 
                onAddComment={onAddComment}
                isLeft={true}
              />
            </div>
            
            {/* Version 2 Side */}
            <div className="flex-1 flex">
              <DiffCell 
                part={row.right} 
                index={idx} 
                explanation={smartExplanations[idx]}
                onAddComment={onAddComment}
                isLeft={false}
              />
            </div>
          </div>
        ))}
        
        {/* End of Document Padding */}
        <div className="h-48 md:h-64 bg-slate-50/20 flex items-center justify-center">
           <p className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">End of Document</p>
        </div>
      </div>
    </div>
  );
};
