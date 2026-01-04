
import { DiffChange } from '../types';

/**
 * Enhanced diffing implementation using word-level comparison.
 * This ensures that specific words (like 'pastor dr') are tracked correctly
 * even if they appear in modified sentences.
 */
export function computeDiff(text1: string, text2: string): DiffChange[] {
  // Normalize whitespace but keep line breaks for better legal reading
  const words1 = text1.split(/(\s+)/);
  const words2 = text2.split(/(\s+)/);

  const n = words1.length;
  const m = words2.length;

  // LCS Table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffChange[] = [];
  let i = n, j = m;

  // Backtrack to find the diff
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      result.unshift({ type: 'unchanged', value: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: words2[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] > dp[i][j - 1])) {
      result.unshift({ type: 'removed', value: words1[i - 1] });
      i--;
    }
  }

  // Post-process: merge consecutive changes of the same type for cleaner rendering
  const merged: DiffChange[] = [];
  for (const part of result) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) {
      last.value += part.value;
    } else {
      merged.push(part);
    }
  }

  return merged;
}
