const API_BASE = '';

let currentVariant = null;
let selectedTaskType = 'auto'; // 'auto' or a specific task category

// ─── Variant management ───────────────────────────────────────────────────────

async function ensureVariant() {
  if (currentVariant) return currentVariant;
  const stored = localStorage.getItem('ab_variant');
  if (stored === 'control' || stored === 'clair') {
    currentVariant = stored;
    return currentVariant;
  }
  const res = await fetch(`${API_BASE}/api/variant`);
  const { variant } = await res.json();
  currentVariant = variant;
  localStorage.setItem('ab_variant', variant);
  return variant;
}

function renderVariantBadge(variant) {
  const el = document.getElementById('variant-badge');
  el.textContent = variant === 'control' ? 'A: Control (full load)' : 'B: CLAIR (lazy)';
  el.className = `variant-badge ${variant}`;
}

// ─── Task type chip selection ─────────────────────────────────────────────────

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    selectedTaskType = chip.dataset.task;
  });
});

// ─── Example query buttons ────────────────────────────────────────────────────

document.querySelectorAll('.example-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('query').value = btn.dataset.query;
    document.getElementById('query').focus();
  });
});

// ─── Token bar rendering ──────────────────────────────────────────────────────

function renderTokenBar(tokensUsed, fullLoadBaseline) {
  const container = document.getElementById('token-bar-container');
  const fill = document.getElementById('token-bar-fill');
  const value = document.getElementById('token-bar-value');
  const max = document.getElementById('token-bar-max');

  const pct = Math.min(100, Math.round((tokensUsed / fullLoadBaseline) * 100));
  fill.style.width = `${pct}%`;
  fill.className = `token-bar-fill ${pct < 40 ? 'low' : pct < 70 ? 'mid' : 'high'}`;
  value.textContent = `${tokensUsed.toLocaleString()} tokens (${pct}% of full load)`;
  max.textContent = `${fullLoadBaseline.toLocaleString()} (full load)`;
  container.classList.remove('hidden');
}

// ─── Stats rendering ──────────────────────────────────────────────────────────

async function refreshStats() {
  const res = await fetch(`${API_BASE}/api/ab-stats`);
  const data = await res.json();
  const el = document.getElementById('stats-content');

  if (data.total_events === 0) {
    el.innerHTML = '<p class="muted">No data yet. Submit a few queries to see stats.</p>';
    return;
  }

  const categoryRows = (data.by_category || []).map((cat) => {
    const name = cat.category.replace(/_/g, ' ');
    const controlStr = cat.avg_tokens_control !== null
      ? `${cat.avg_tokens_control.toLocaleString()} tokens (${cat.avg_skills_control} skills)`
      : '—';
    const clairStr = cat.avg_tokens_clair !== null
      ? `${cat.avg_tokens_clair.toLocaleString()} tokens (${cat.avg_skills_clair} skills)`
      : '—';
    const savedStr = cat.avg_tokens_saved !== null
      ? `<span class="savings">−${cat.avg_tokens_saved.toLocaleString()} (${cat.savings_percent}%)</span>`
      : '—';
    return `
      <tr>
        <td>${name}</td>
        <td>${cat.control_count}</td>
        <td>${cat.clair_count}</td>
        <td>${controlStr}</td>
        <td>${clairStr}</td>
        <td>${savedStr}</td>
      </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="stats-summary">
      <div class="stat-card">
        <div class="stat-label">Total requests</div>
        <div class="stat-value">${data.total_events}</div>
      </div>
      <div class="stat-card control">
        <div class="stat-label">Control avg tokens</div>
        <div class="stat-value">${data.control.avg_tokens.toLocaleString()}</div>
        <div class="stat-sub">${data.control.count} requests · ${data.control.avg_skills_loaded} skills avg</div>
      </div>
      <div class="stat-card clair">
        <div class="stat-label">CLAIR avg tokens</div>
        <div class="stat-value">${data.clair.avg_tokens.toLocaleString()}</div>
        <div class="stat-sub">${data.clair.count} requests · ${data.clair.avg_skills_loaded} skills avg</div>
      </div>
      <div class="stat-card savings">
        <div class="stat-label">Avg tokens saved</div>
        <div class="stat-value">−${data.estimated_savings.toLocaleString()}</div>
        <div class="stat-sub">${data.savings_percent}% reduction</div>
      </div>
    </div>

    ${categoryRows ? `
    <h3 class="table-title">Breakdown by task category</h3>
    <div class="table-wrapper">
      <table class="stats-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Control n</th>
            <th>CLAIR n</th>
            <th>Control avg</th>
            <th>CLAIR avg</th>
            <th>Saved</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>` : ''}
  `;
}

// ─── Form submit ──────────────────────────────────────────────────────────────

document.getElementById('plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('query').value.trim();
  if (!query) return;

  const variant = await ensureVariant();
  renderVariantBadge(variant);

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch(`${API_BASE}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variant }),
    });
    const data = await res.json();

    document.getElementById('response').textContent = data.response;

    // Task category badge
    const catBadge = document.getElementById('task-category-badge');
    catBadge.textContent = (data.task_category || 'general').replace(/_/g, ' ');
    catBadge.className = `task-category-badge cat-${(data.task_category || 'general').replace(/_/g, '-')}`;

    document.getElementById('metrics').innerHTML = `
      <div class="metric">Variant: <strong class="${data.variant}">${data.variant === 'control' ? 'A: Control' : 'B: CLAIR'}</strong></div>
      <div class="metric">Tokens used: <strong>${data.tokens_used.toLocaleString()}</strong></div>
      <div class="metric">Full-load baseline: <strong>${(data.full_load_baseline || 0).toLocaleString()}</strong></div>
      <div class="metric">Skills loaded: <strong>${data.skills_loaded.length}</strong> — <span class="muted">${data.skills_loaded.join(', ')}</span></div>
      ${data.tokens_saved_vs_full_load > 0
        ? `<div class="metric savings">Saved vs full load: <strong>−${data.tokens_saved_vs_full_load.toLocaleString()} tokens (${data.savings_percent}%)</strong></div>`
        : `<div class="metric muted">No savings (control variant loads all skills)</div>`}
    `;

    if (data.full_load_baseline) {
      renderTokenBar(data.tokens_used, data.full_load_baseline);
    }

    document.getElementById('result').classList.remove('hidden');
    await refreshStats();
  } catch (err) {
    console.error(err);
    document.getElementById('response').textContent = 'Error: ' + err.message;
    document.getElementById('result').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
});

// ─── Reset button ─────────────────────────────────────────────────────────────

document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!confirm('Clear all A/B test data and reset variant assignment?')) return;
  await fetch(`${API_BASE}/api/reset`, { method: 'DELETE' });
  currentVariant = null;
  localStorage.removeItem('ab_variant');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('token-bar-container').classList.add('hidden');
  document.getElementById('variant-badge').textContent = '';
  document.getElementById('variant-badge').className = 'variant-badge';
  await refreshStats();
  const variant = await ensureVariant();
  renderVariantBadge(variant);
});

// ─── Refresh stats button ─────────────────────────────────────────────────────

document.getElementById('refresh-stats').addEventListener('click', refreshStats);

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const variant = await ensureVariant();
  renderVariantBadge(variant);
  await refreshStats();
})();
