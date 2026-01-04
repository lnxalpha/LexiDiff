
import React from 'react';
import { DiffChange, ViewMode, UserComment } from '../types';

interface ComparisonPanelProps {
  diff: DiffChange[];
  viewMode: ViewMode;
  comments: UserComment[];
  onAddComment: (index: number) => void;
}

interface DiffPartProps {
  change: DiffChange;
  index: number;
  hideType?: 'added' | 'removed';
  viewMode: ViewMode;
  comment?: UserComment;
  onAddComment: (index: number) => void;
}

// Extracted DiffPart component to resolve TypeScript property 'key' does not exist errors
// This also improves performance by avoiding component re-definition on every render
const DiffPart: React.FC<DiffPartProps> = ({ 
  change, 
  index, 
  hideType, 
  viewMode, 
  comment, 
  onAddComment 
}) => {
  if (change.type === hideType) return null;
  
  const isChange = change.type !== 'unchanged';

  return (
    <span 
      onClick={() => isChange && onAddComment(index)}
      className={`
        relative group cursor-pointer
        ${change.type === 'added' ? 'bg-green-100 text-green-800' : ''}
        ${change.type === 'removed' ? 'bg-red-100 text-red-800' : ''}
        ${change.type === 'unchanged' ? 'text-slate-700' : ''}
        ${viewMode === 'unified' && change.type === 'removed' ? 'line-through opacity-60' : ''}
        ${isChange ? 'hover:ring-2 ring-indigo-400 ring-offset-1 rounded-sm transition-all' : ''}
      `}
    >
      {change.value}
      {comment && (
        <span className="absolute -top-3 left-0 bg-indigo-600 text-white text-[8px] px-1 rounded shadow-sm z-10 font-bold animate-bounce">
          NOTE
        </span>
      )}
      {isChange && !comment && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
          + Add Legal Note
        </span>
      )}
    </span>
  );
};

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ diff, viewMode, comments, onAddComment }) => {
  const getCommentForIndex = (index: number) => comments.find(c => c.diffIndex === index);

  if (viewMode === 'split') {
    return (
      <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
        <div className="border rounded-lg bg-white overflow-y-auto p-4 shadow-sm relative">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 sticky top-0 bg-white/90 backdrop-blur-sm py-1 border-b z-10">Document 1 (Base)</h3>
          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {diff.map((change, idx) => (
              <DiffPart 
                key={idx} 
                change={change} 
                index={idx} 
                hideType="added" 
                viewMode={viewMode}
                comment={getCommentForIndex(idx)}
                onAddComment={onAddComment}
              />
            ))}
          </div>
        </div>
        <div className="border rounded-lg bg-white overflow-y-auto p-4 shadow-sm relative">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 sticky top-0 bg-white/90 backdrop-blur-sm py-1 border-b z-10">Document 2 (Modified)</h3>
          <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {diff.map((change, idx) => (
              <DiffPart 
                key={idx} 
                change={change} 
                index={idx} 
                hideType="removed" 
                viewMode={viewMode}
                comment={getCommentForIndex(idx)}
                onAddComment={onAddComment}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-y-auto p-6 shadow-sm">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Unified Negotiating View</h3>
      <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
        {diff.map((change, idx) => (
          <DiffPart 
            key={idx} 
            change={change} 
            index={idx} 
            viewMode={viewMode}
            comment={getCommentForIndex(idx)}
            onAddComment={onAddComment}
          />
        ))}
      </div>
    </div>
  );
};
