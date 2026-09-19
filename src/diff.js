// Prompt Diff & Variable Interpolation Engine

function extractVariables(text) {
  if (!text) return [];
  const regex = /\{\{([a-zA-Z0-9_-]+)\}\}/g;
  const vars = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

function interpolateVariables(template, variablesObj = {}) {
  if (!template) return '';
  return template.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (match, varName) => {
    return variablesObj[varName] !== undefined ? variablesObj[varName] : match;
  });
}

function computeLineDiff(oldText = '', newText = '') {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const diff = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      diff.push({ type: 'unchanged', text: o, lineNum: i + 1 });
    } else if (o !== undefined && n !== undefined) {
      diff.push({ type: 'removed', text: o, lineNum: i + 1 });
      diff.push({ type: 'added', text: n, lineNum: i + 1 });
    } else if (o !== undefined) {
      diff.push({ type: 'removed', text: o, lineNum: i + 1 });
    } else if (n !== undefined) {
      diff.push({ type: 'added', text: n, lineNum: i + 1 });
    }
  }

  return diff;
}

module.exports = {
  extractVariables,
  interpolateVariables,
  computeLineDiff
};
