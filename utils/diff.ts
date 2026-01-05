
import { DiffChange, AlignedRow } from '../types';

/**
 * Enhanced alignment diff that produces a sequence of AlignedRows.
 * It ensures that matching text is on the same vertical line.
 */
export function computeAlignedDiff(text1: string, text2: string): AlignedRow[] {
  const words1 = text1.split(/(\s+)/).filter(w => w.length > 0);
  const words2 = text2.split(/(\s+)/).filter(w => w.length > 0);

  const n = words1.length;
  const m = words2.length;

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

  const rows: AlignedRow[] = [];
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      rows.unshift({
        left: { type: 'unchanged', value: words1[i - 1] },
        right: { type: 'unchanged', value: words2[j - 1] }
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rows.unshift({
        left: null, // Gap in Doc 1
        right: { type: 'added', value: words2[j - 1] }
      });
      j--;
    } else {
      rows.unshift({
        left: { type: 'removed', value: words1[i - 1] },
        right: null // Gap in Doc 2
      });
      i--;
    }
  }

  // Merge consecutive rows of the same pattern for better rendering
  const merged: AlignedRow[] = [];
  for (const row of rows) {
    const last = merged[merged.length - 1];
    const isMatch = row.left?.type === 'unchanged' && row.right?.type === 'unchanged';
    const isAddition = !row.left && row.right?.type === 'added';
    const isRemoval = row.left?.type === 'removed' && !row.right;

    if (last) {
      const lastIsMatch = last.left?.type === 'unchanged' && last.right?.type === 'unchanged';
      const lastIsAddition = !last.left && last.right?.type === 'added';
      const lastIsRemoval = last.left?.type === 'removed' && !last.right;

      if ((isMatch && lastIsMatch) || (isAddition && lastIsAddition) || (isRemoval && lastIsRemoval)) {
        if (row.left) last.left!.value += row.left.value;
        if (row.right) last.right!.value += row.right.value;
        continue;
      }
    }
    merged.push(row);
  }

  return merged;
}
