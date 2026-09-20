// PromptFlow-Hub v2.0.0 - Semantic Variable Interpolation & Myers LCS Diff Engine

/**
 * Extracts {{variable_name}} or {{variable_name:default_value}} tokens
 */
function extractVariables(text) {
  if (!text || typeof text !== 'string') return [];
  const regex = /\{\{\s*([a-zA-Z0-9_-]+)(?::([^}]*))?\s*\}\}/g;
  const vars = new Map();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1];
    const defaultValue = match[2] !== undefined ? match[2].trim() : null;
    if (!vars.has(key)) {
      vars.set(key, { name: key, defaultValue, occurrences: 1 });
    } else {
      vars.get(key).occurrences++;
    }
  }
  return Array.from(vars.values());
}

/**
 * Interpolates variables into template with fallback to default values
 */
function interpolateVariables(template, variablesObj = {}) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)(?::([^}]*))?\s*\}\}/g, (match, varName, defVal) => {
    if (variablesObj[varName] !== undefined && variablesObj[varName] !== null) {
      return String(variablesObj[varName]);
    }
    if (defVal !== undefined) {
      return defVal.trim();
    }
    return match;
  });
}

/**
 * Computes Longest Common Subsequence (LCS) matrix between two arrays
 */
function computeLCS(tokensA, tokensB) {
  const m = tokensA.length;
  const n = tokensB.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Computes Myers/LCS Line-Level and Token-Level Diff with Similarity Score
 */
function computeLineDiff(oldText = '', newText = '') {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  const m = oldLines.length;
  const n = newLines.length;
  const dp = computeLCS(oldLines, newLines);

  const diff = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: 'unchanged', text: oldLines[i - 1], oldLineNum: i, newLineNum: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', text: newLines[j - 1], newLineNum: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'removed', text: oldLines[i - 1], oldLineNum: i });
      i--;
    }
  }

  const lcsLength = dp[m][n];
  const totalLength = m + n;
  const similarityScore = totalLength === 0 ? 1.0 : parseFloat(((2 * lcsLength) / totalLength).toFixed(4));

  const stats = {
    addedLines: diff.filter(d => d.type === 'added').length,
    removedLines: diff.filter(d => d.type === 'removed').length,
    unchangedLines: diff.filter(d => d.type === 'unchanged').length,
    similarityScore
  };

  return { diff, stats };
}

module.exports = {
  extractVariables,
  interpolateVariables,
  computeLineDiff,
  computeLCS
};
