
export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface UserComment {
  id: string;
  diffIndex: number;
  text: string;
  author: string;
  timestamp: number;
}

export interface LegalAnalysis {
  summary: string;
  keyChanges: {
    clause: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
    riskScore: number; // 1-10
  }[];
  riskAssessment: {
    level: 'Low' | 'Medium' | 'High';
    explanation: string;
  };
  recommendations: string[];
  contractType?: string;
}

export type ViewMode = 'split' | 'unified' | 'analysis';
