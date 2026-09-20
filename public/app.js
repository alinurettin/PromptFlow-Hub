// PromptFlow-Hub v2.0.0 - Interactive Studio Controller
let prompts = [];
let currentPromptId = null;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchPrompts();

  const editor = document.getElementById('promptEditor');
  const btnSave = document.getElementById('btnSaveNewVersion');
  const btnRollback = document.getElementById('btnRollback');
  const selectVersion = document.getElementById('selectVersion');
  const btnNewPrompt = document.getElementById('btnNewPrompt');

  // Modals
  const btnTestRender = document.getElementById('btnTestRender');
  const renderModal = document.getElementById('renderModal');
  const btnCloseRenderModal = document.getElementById('btnCloseRenderModal');
  const btnExecuteRender = document.getElementById('btnExecuteRender');

  const btnDiffModal = document.getElementById('btnDiffModal');
  const diffModal = document.getElementById('diffModal');
  const btnCloseDiffModal = document.getElementById('btnCloseDiffModal');
  const btnRunDiff = document.getElementById('btnRunDiff');
  const diffCompareTargetSelect = document.getElementById('diffCompareTargetSelect');

  // Editor Input Listener (Debounced)
  editor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      calculateMetrics(editor.value);
    }, 200);
  });

  // Version Select Switcher
  selectVersion.addEventListener('change', () => {
    const prompt = prompts.find(p => p.id === currentPromptId);
    if (!prompt) return;
    const selectedV = prompt.versions.find(v => v.version === selectVersion.value);
    if (selectedV) {
      editor.value = selectedV.content;
      calculateMetrics(selectedV.content);
    }
  });

  // Save as New Version
  btnSave.addEventListener('click', async () => {
    if (!currentPromptId) return;
    const changelog = prompt('Enter a short changelog note for this version:');
    if (changelog === null) return;

    try {
      const res = await fetch(`/api/prompts/${currentPromptId}/version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editor.value,
          changelog: changelog || 'Manual update'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchPrompts();
      }
    } catch (err) {
      alert('Save error: ' + err.message);
    }
  });

  // Rollback to Selected Version
  btnRollback.addEventListener('click', async () => {
    if (!currentPromptId) return;
    const targetVer = selectVersion.value;
    if (!confirm(`Are you sure you want to rollback to version ${targetVer}?`)) return;

    try {
      const res = await fetch(`/api/prompts/${currentPromptId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: targetVer })
      });
      const data = await res.json();
      if (data.success) {
        await fetchPrompts();
      }
    } catch (err) {
      alert('Rollback error: ' + err.message);
    }
  });

  // New Prompt Creation
  btnNewPrompt.addEventListener('click', async () => {
    const title = prompt('Enter Prompt Title:');
    if (!title) return;
    const desc = prompt('Enter Short Description (optional):') || '';

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: desc,
          initialContent: 'You are an AI assistant tasked with {{task:summarization}}.\nFormat as {{format:bullet points}}.'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchPrompts();
        selectPrompt(data.prompt.id);
      }
    } catch (err) {
      alert('Create error: ' + err.message);
    }
  });

  // Test Render Modal Handlers
  btnTestRender.addEventListener('click', () => {
    const vars = extractVars(editor.value);
    const container = document.getElementById('renderInputsGrid');
    container.innerHTML = '';

    if (vars.length === 0) {
      container.innerHTML = '<span style="font-size:12px; color:var(--text-muted);">No dynamic variables found in template.</span>';
    } else {
      vars.forEach(v => {
        const div = document.createElement('div');
        div.className = 'render-input-group';
        div.innerHTML = `
          <label>{{${v.name}}}</label>
          <input type="text" data-var="${v.name}" value="${v.defaultValue || ''}" placeholder="${v.defaultValue || 'value...'}">
        `;
        container.appendChild(div);
      });
    }

    document.getElementById('renderedOutputText').textContent = editor.value;
    renderModal.style.display = 'flex';
  });

  btnCloseRenderModal.addEventListener('click', () => {
    renderModal.style.display = 'none';
  });

  btnExecuteRender.addEventListener('click', async () => {
    const inputs = document.querySelectorAll('#renderInputsGrid input');
    const variables = {};
    inputs.forEach(inp => {
      variables[inp.dataset.var] = inp.value;
    });

    try {
      const res = await fetch('/api/interpolate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: editor.value,
          variables,
          model: 'gpt-4o'
        })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('renderedOutputText').textContent = data.rendered;
      }
    } catch (err) {
      alert('Interpolation error: ' + err.message);
    }
  });

  // Diff Modal Handlers
  btnDiffModal.addEventListener('click', () => {
    const prompt = prompts.find(p => p.id === currentPromptId);
    if (!prompt) return;

    diffCompareTargetSelect.innerHTML = '';
    prompt.versions.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.version;
      opt.textContent = `${v.version} - ${v.changelog}`;
      diffCompareTargetSelect.appendChild(opt);
    });

    diffModal.style.display = 'flex';
    runDiffComparison();
  });

  btnCloseDiffModal.addEventListener('click', () => {
    diffModal.style.display = 'none';
  });

  btnRunDiff.addEventListener('click', runDiffComparison);

  async function runDiffComparison() {
    const prompt = prompts.find(p => p.id === currentPromptId);
    if (!prompt) return;

    const targetVer = prompt.versions.find(v => v.version === diffCompareTargetSelect.value);
    const oldText = targetVer ? targetVer.content : '';
    const newText = editor.value;

    try {
      const res = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldText, newText })
      });
      const data = await res.json();
      if (data.success) {
        renderDiffOutput(data.diff, data.stats);
      }
    } catch (err) {
      alert('Diff error: ' + err.message);
    }
  }

  function renderDiffOutput(diffLines, stats) {
    const strip = document.getElementById('diffStatsStrip');
    strip.innerHTML = `
      <span>Similarity: <strong>${(stats.similarityScore * 100).toFixed(1)}%</strong></span>
      <span style="color:#34d399;">+${stats.addedLines} Added</span>
      <span style="color:#f87171;">-${stats.removedLines} Removed</span>
      <span>${stats.unchangedLines} Unchanged</span>
    `;

    const container = document.getElementById('diffViewContainer');
    container.innerHTML = diffLines.map(line => {
      const sign = line.type === 'added' ? '+' : (line.type === 'removed' ? '-' : ' ');
      return `<div class="diff-line ${line.type}"><span>${sign}</span><span>${escapeHtml(line.text || ' ')}</span></div>`;
    }).join('');
  }
});

async function fetchPrompts() {
  try {
    const res = await fetch('/api/prompts');
    const data = await res.json();
    if (data.success) {
      prompts = data.prompts;
      document.getElementById('promptCount').textContent = prompts.length;
      renderSidebar(prompts);
      if (!currentPromptId && prompts.length > 0) {
        selectPrompt(prompts[0].id);
      } else if (currentPromptId) {
        selectPrompt(currentPromptId);
      }
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

function renderSidebar(list) {
  const container = document.getElementById('promptList');
  container.innerHTML = '';

  list.forEach(p => {
    const item = document.createElement('div');
    item.className = `prompt-item ${p.id === currentPromptId ? 'active' : ''}`;
    item.innerHTML = `
      <h4>${escapeHtml(p.title)}</h4>
      <div class="prompt-item-meta">
        <span>${p.currentVersion}</span>
        <span>${p.versions.length} versions</span>
      </div>
    `;
    item.addEventListener('click', () => selectPrompt(p.id));
    container.appendChild(item);
  });
}

function selectPrompt(id) {
  currentPromptId = id;
  const prompt = prompts.find(p => p.id === id);
  if (!prompt) return;

  renderSidebar(prompts);

  document.getElementById('currentPromptTitle').textContent = prompt.title;
  document.getElementById('currentPromptDesc').textContent = prompt.description || '';

  const versionSelect = document.getElementById('selectVersion');
  versionSelect.innerHTML = '';
  prompt.versions.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.version;
    opt.textContent = `${v.version} (${v.commitHash || 'hash'}) - ${v.changelog}`;
    versionSelect.appendChild(opt);
  });
  versionSelect.value = prompt.currentVersion;

  const editor = document.getElementById('promptEditor');
  editor.value = prompt.activeContent;
  calculateMetrics(prompt.activeContent);
}

async function calculateMetrics(text) {
  try {
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('valCharsWords').textContent = `${data.charCount} / ${data.wordCount}`;
      document.getElementById('valLineCount').textContent = `${data.lineCount} lines`;

      const gemini = data.estimates['gemini-2.0-flash'];
      document.getElementById('valGeminiTokens').textContent = `${gemini.tokens.toLocaleString()} tkn`;
      document.getElementById('valGeminiCost').textContent = `$${gemini.costPerThousandCalls} / 1K calls`;

      const geminiPro = data.estimates['gemini-1.5-pro'];
      document.getElementById('valGeminiProTokens').textContent = `${geminiPro.tokens.toLocaleString()} tkn`;
      document.getElementById('valGeminiProCost').textContent = `$${geminiPro.costPerThousandCalls} / 1K calls`;

      const gpt = data.estimates['gpt-4o'];
      document.getElementById('valGptTokens').textContent = `${gpt.tokens.toLocaleString()} tkn`;
      document.getElementById('valGptCost').textContent = `$${gpt.costPerThousandCalls} / 1K calls`;

      const claude = data.estimates['claude-3.5-sonnet'];
      document.getElementById('valClaudeTokens').textContent = `${claude.tokens.toLocaleString()} tkn`;
      document.getElementById('valClaudeCost').textContent = `$${claude.costPerThousandCalls} / 1K calls`;

      // Extract variables
      const vars = extractVars(text);
      const pillsContainer = document.getElementById('varPills');
      pillsContainer.innerHTML = vars.length > 0
        ? vars.map(v => `<span class="var-pill">{{${escapeHtml(v.name)}${v.defaultValue ? ':' + escapeHtml(v.defaultValue) : ''}}}</span>`).join('')
        : '<span class="empty-hint">No variables detected</span>';
    }
  } catch (err) {
    console.error('Estimate error:', err);
  }
}

function extractVars(text) {
  if (!text) return [];
  const regex = /\{\{\s*([a-zA-Z0-9_-]+)(?::([^}]*))?\s*\}\}/g;
  const set = new Map();
  let m;
  while ((m = regex.exec(text)) !== null) {
    const name = m[1];
    const defaultValue = m[2] ? m[2].trim() : null;
    if (!set.has(name)) {
      set.set(name, { name, defaultValue });
    }
  }
  return Array.from(set.values());
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
