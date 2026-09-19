// PromptFlow-Hub Frontend Studio Logic

let prompts = [];
let currentPromptId = null;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  fetchPrompts();

  const editor = document.getElementById('promptEditor');
  const btnSave = document.getElementById('btnSaveNewVersion');
  const selectVersion = document.getElementById('selectVersion');
  const btnNewPrompt = document.getElementById('btnNewPrompt');

  editor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      calculateMetrics(editor.value);
    }, 200);
  });

  selectVersion.addEventListener('change', () => {
    const prompt = prompts.find(p => p.id === currentPromptId);
    if (!prompt) return;
    const selectedV = prompt.versions.find(v => v.version === selectVersion.value);
    if (selectedV) {
      editor.value = selectedV.content;
      calculateMetrics(selectedV.content);
    }
  });

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
        alert('New version saved successfully!');
        fetchPrompts();
      }
    } catch (err) {
      alert('Save error: ' + err.message);
    }
  });

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
          initialContent: 'You are an AI assistant tasked with...'
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
});

async function fetchPrompts() {
  try {
    const res = await fetch('/api/prompts');
    const data = await res.json();
    if (data.success) {
      prompts = data.prompts;
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
      <h4>${p.title}</h4>
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

  document.getElementById('currentPromptTitle').innerText = prompt.title;
  document.getElementById('currentPromptDesc').innerText = prompt.description || '';

  const versionSelect = document.getElementById('selectVersion');
  versionSelect.innerHTML = '';
  prompt.versions.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.version;
    opt.innerText = `${v.version} (${new Date(v.timestamp).toLocaleDateString()}) - ${v.changelog}`;
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
      document.getElementById('valCharsWords').innerText = `${data.charCount} / ${data.wordCount}`;
      
      const gemini = data.estimates['gemini-2.0-flash'];
      document.getElementById('valGeminiTokens').innerText = `${gemini.tokens.toLocaleString()} tkn`;
      document.getElementById('valGeminiCost').innerText = `$${gemini.costPerThousandCalls} / 1K calls`;

      const gpt = data.estimates['gpt-4o'];
      document.getElementById('valGptTokens').innerText = `${gpt.tokens.toLocaleString()} tkn`;
      document.getElementById('valGptCost').innerText = `$${gpt.costPerThousandCalls} / 1K calls`;

      const claude = data.estimates['claude-3.5-sonnet'];
      document.getElementById('valClaudeTokens').innerText = `${claude.tokens.toLocaleString()} tkn`;
      document.getElementById('valClaudeCost').innerText = `$${claude.costPerThousandCalls} / 1K calls`;

      // Extract variables
      const vars = extractVars(text);
      const pillsContainer = document.getElementById('varPills');
      pillsContainer.innerHTML = vars.length > 0 
        ? vars.map(v => `<span class="var-pill">{{${v}}}</span>`).join('')
        : '<span style="font-size:11px; color:#64748b;">No variables detected</span>';
    }
  } catch (err) {
    console.error('Estimate error:', err);
  }
}

function extractVars(text) {
  if (!text) return [];
  const regex = /\{\{([a-zA-Z0-9_-]+)\}\}/g;
  const set = new Set();
  let m;
  while ((m = regex.exec(text)) !== null) {
    set.add(m[1]);
  }
  return Array.from(set);
}
