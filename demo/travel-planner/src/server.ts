import express from 'express';
import cors from 'cors';
import path from 'path';
import * as fs from 'fs';
import {
  loadManifest,
  getClairTokenCost,
  getFullLoadTokenCost,
  LoadedSkill,
} from './clair';

// Load .env manually (no dotenv dependency required)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

const app = express();
const PORT = process.env.PORT ?? 3003;

// Project root (skills/ and manifest.json live here)
const PROJECT_ROOT = path.join(__dirname, '..');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const manifest = loadManifest();

// A/B variant type
export type Variant = 'control' | 'clair';

// Task category type — reflects real-world development task types
export type TaskCategory =
  | 'travel_planning'
  | 'ui_change'
  | 'button_interaction'
  | 'debugging'
  | 'styling'
  | 'state_management'
  | 'api_development'
  | 'general';

// Persist A/B events for analysis (in production, use a database)
const abEvents: Array<{
  timestamp: string;
  variant: Variant;
  query: string;
  task_category: TaskCategory;
  tokens_used: number;
  skills_loaded: string[];
  full_load_baseline: number;
  tokens_saved: number;
  savings_percent: string;
  llm_response?: string;
  real_prompt_tokens?: number;
  real_completion_tokens?: number;
}> = [];

function assignVariant(): Variant {
  return Math.random() < 0.5 ? 'control' : 'clair';
}

/**
 * Infer task category from query text.
 * Keyword-based classifier — not biased toward CLAIR.
 */
function inferTaskCategory(query: string): TaskCategory {
  const q = query.toLowerCase();

  if (/\b(button|click|form|input|modal|card|layout|render|component|widget|dropdown|checkbox|toggle|tab|tooltip|badge|icon|image|list|table|grid|flex|responsive|ui|interface)\b/.test(q)) {
    if (/\b(click|submit|handler|event|listener|onclick|addeventlistener|callback|disabled|loading|debounce|throttle|press|tap)\b/.test(q)) {
      return 'button_interaction';
    }
    return 'ui_change';
  }

  if (/\b(style|css|color|theme|dark mode|light mode|font|typography|spacing|padding|margin|border|shadow|animation|transition|hover|focus|gradient|background|opacity|z-index|overflow|scroll|align|justify|gap)\b/.test(q)) {
    return 'styling';
  }

  if (/\b(debug|error|broken|not working|fix|issue|bug|crash|undefined|null|typeerror|console|inspect|devtools|network|cors|404|500|blank screen|white screen|layout broken|style not applying|event not firing|click not working|state not updating)\b/.test(q)) {
    return 'debugging';
  }

  if (/\b(state|store|data flow|update state|reactive|re-render|variable|global state|local state|cache|persist|localstorage|sessionstorage|sync|async state|reset|clear|refresh)\b/.test(q)) {
    return 'state_management';
  }

  if (/\b(api|endpoint|route|rest|http|get|post|put|delete|patch|request|response|json|fetch|axios|express|middleware|cors|authentication|authorization|status code|validation|body parser|query param|header)\b/.test(q)) {
    return 'api_development';
  }

  if (/\b(travel|trip|vacation|destination|itinerary|plan|book|visit|explore|flight|fly|airline|airport|hotel|accommodation|stay|lodging|airbnb|resort|restaurant|food|dining|eat|cuisine|family|kids|children|nature|hiking|outdoor|park|beach|wildlife|scenic|transport|car|rental|train|bus|metro)\b/.test(q)) {
    return 'travel_planning';
  }

  return 'general';
}

/**
 * Build a system prompt from loaded skills.
 * This is what gets sent to the LLM — the key difference between control and CLAIR.
 */
function buildSystemPrompt(loadedSkills: LoadedSkill[]): string {
  const skillContents = loadedSkills.map((ls) =>
    `## Skill: ${ls.skill.id}\n\n${ls.content}`
  ).join('\n\n---\n\n');

  return `You are a helpful AI assistant for a Travel Planner web application. You help with both travel planning queries and software development tasks for the app.

${skillContents ? `The following skill documents are loaded for this request:\n\n${skillContents}` : 'No specific skill documents are loaded for this request. Answer from general knowledge.'}

Provide a concise, practical response to the user's query. For development tasks, give specific code examples or debugging steps. For travel queries, give actionable recommendations.`;
}

/**
 * Call the OpenRouter LLM API with the given system prompt and user query.
 * Returns the response text and token usage.
 */
async function callLLM(systemPrompt: string, userQuery: string): Promise<{
  response: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = (process.env.OPENROUTER_MODEL || 'openrouter/auto').trim();

  if (!apiKey || apiKey === 'your-openrouter-key-here') {
    // No real API key — return simulated response
    return {
      response: `[SIMULATED] Assistance for: "${userQuery}". Skills loaded and ready for LLM context.`,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
  }

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
    max_tokens: 512,
    temperature: 0.3,
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3003',
      'X-Title': 'Travel Planner CLAIR A/B Test',
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return {
    response: data.choices?.[0]?.message?.content ?? '(no response)',
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
    total_tokens: data.usage?.total_tokens ?? 0,
  };
}

app.get('/api/variant', (_req, res) => {
  const variant = assignVariant();
  res.json({ variant });
});

app.post('/api/plan', async (req, res) => {
  const { query, variant } = req.body as {
    query: string;
    variant: Variant;
  };

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query' });
  }

  const effectiveVariant: Variant = variant ?? assignVariant();
  const taskCategory = inferTaskCategory(query);

  let skillsLoadedIds: string[];
  let loadedSkills: LoadedSkill[];
  let fileBasedTokens: number; // token estimate from file sizes

  if (effectiveVariant === 'control') {
    // Control: full load — load ALL skill files
    const { tokens, loaded } = getFullLoadTokenCost(PROJECT_ROOT, manifest);
    fileBasedTokens = tokens;
    loadedSkills = loaded;
    skillsLoadedIds = loaded.map((l) => l.skill.id);
  } else {
    // CLAIR: router + only matched skills
    const { tokens, loaded } = getClairTokenCost(PROJECT_ROOT, manifest, query);
    fileBasedTokens = tokens;
    loadedSkills = loaded;
    skillsLoadedIds = ['router', ...loaded.map((l) => l.skill.id)];
  }

  // Build system prompt from loaded skills
  const systemPrompt = buildSystemPrompt(loadedSkills);

  // Call the LLM (real API call if key is set, simulated otherwise)
  let llmResponse = '';
  let realPromptTokens = 0;
  let realCompletionTokens = 0;
  let realTotalTokens = 0;

  try {
    const llmResult = await callLLM(systemPrompt, query);
    llmResponse = llmResult.response;
    realPromptTokens = llmResult.prompt_tokens;
    realCompletionTokens = llmResult.completion_tokens;
    realTotalTokens = llmResult.total_tokens;
  } catch (err) {
    console.error('LLM call failed:', err);
    llmResponse = `[LLM error: ${(err as Error).message}]`;
  }

  // Use real token counts if available, otherwise fall back to file-size estimates
  const tokensUsed = realTotalTokens > 0 ? realTotalTokens : fileBasedTokens;

  // Compute savings against full-load baseline
  const { tokens: fullLoadCost } = getFullLoadTokenCost(PROJECT_ROOT, manifest);
  const tokensSaved = fullLoadCost - tokensUsed;
  const savingsPercent =
    fullLoadCost > 0 ? ((tokensSaved / fullLoadCost) * 100).toFixed(1) : '0';

  // Log for A/B analysis
  abEvents.push({
    timestamp: new Date().toISOString(),
    variant: effectiveVariant,
    query,
    task_category: taskCategory,
    tokens_used: tokensUsed,
    skills_loaded: skillsLoadedIds,
    full_load_baseline: fullLoadCost,
    tokens_saved: tokensSaved,
    savings_percent: savingsPercent,
    llm_response: llmResponse,
    real_prompt_tokens: realPromptTokens || undefined,
    real_completion_tokens: realCompletionTokens || undefined,
  });

  res.json({
    variant: effectiveVariant,
    task_category: taskCategory,
    response: llmResponse,
    tokens_used: tokensUsed,
    skills_loaded: skillsLoadedIds,
    full_load_baseline: fullLoadCost,
    tokens_saved_vs_full_load: tokensSaved,
    savings_percent: savingsPercent,
    // Extra detail for transparency
    file_based_tokens: fileBasedTokens,
    real_prompt_tokens: realPromptTokens || null,
    real_completion_tokens: realCompletionTokens || null,
    using_real_llm: realTotalTokens > 0,
  });
});

app.get('/api/ab-stats', (_req, res) => {
  const control = abEvents.filter((e) => e.variant === 'control');
  const clair = abEvents.filter((e) => e.variant === 'clair');

  const avgControl =
    control.length > 0
      ? control.reduce((s, e) => s + e.tokens_used, 0) / control.length
      : 0;
  const avgClair =
    clair.length > 0
      ? clair.reduce((s, e) => s + e.tokens_used, 0) / clair.length
      : 0;
  const savings = avgControl - avgClair;
  const savingsPercent =
    avgControl > 0 ? ((savings / avgControl) * 100).toFixed(1) : '0';

  // Per-category breakdown
  const categories: TaskCategory[] = [
    'travel_planning', 'ui_change', 'button_interaction',
    'debugging', 'styling', 'state_management', 'api_development', 'general'
  ];

  const byCategory = categories.map((cat) => {
    const catControl = control.filter((e) => e.task_category === cat);
    const catClair = clair.filter((e) => e.task_category === cat);
    const catAvgControl = catControl.length > 0
      ? Math.round(catControl.reduce((s, e) => s + e.tokens_used, 0) / catControl.length)
      : null;
    const catAvgClair = catClair.length > 0
      ? Math.round(catClair.reduce((s, e) => s + e.tokens_used, 0) / catClair.length)
      : null;
    const catSavings = (catAvgControl !== null && catAvgClair !== null)
      ? catAvgControl - catAvgClair
      : null;
    const catSavingsPct = (catAvgControl !== null && catSavings !== null && catAvgControl > 0)
      ? ((catSavings / catAvgControl) * 100).toFixed(1)
      : null;

    const avgSkillsControl = catControl.length > 0
      ? (catControl.reduce((s, e) => s + e.skills_loaded.length, 0) / catControl.length).toFixed(1)
      : null;
    const avgSkillsClair = catClair.length > 0
      ? (catClair.reduce((s, e) => s + e.skills_loaded.length, 0) / catClair.length).toFixed(1)
      : null;

    return {
      category: cat,
      control_count: catControl.length,
      clair_count: catClair.length,
      avg_tokens_control: catAvgControl,
      avg_tokens_clair: catAvgClair,
      avg_tokens_saved: catSavings,
      savings_percent: catSavingsPct,
      avg_skills_control: avgSkillsControl,
      avg_skills_clair: avgSkillsClair,
    };
  }).filter((c) => c.control_count > 0 || c.clair_count > 0);

  // Skills loaded frequency
  const skillFrequency: Record<string, { control: number; clair: number }> = {};
  for (const event of abEvents) {
    for (const skill of event.skills_loaded) {
      if (!skillFrequency[skill]) skillFrequency[skill] = { control: 0, clair: 0 };
      skillFrequency[skill][event.variant]++;
    }
  }

  // Check if real LLM was used
  const realLlmCount = abEvents.filter((e) => e.real_prompt_tokens && e.real_prompt_tokens > 0).length;

  res.json({
    total_events: abEvents.length,
    using_real_llm: realLlmCount > 0,
    real_llm_requests: realLlmCount,
    control: {
      count: control.length,
      avg_tokens: Math.round(avgControl),
      avg_skills_loaded: control.length > 0
        ? (control.reduce((s, e) => s + e.skills_loaded.length, 0) / control.length).toFixed(1)
        : '0',
    },
    clair: {
      count: clair.length,
      avg_tokens: Math.round(avgClair),
      avg_skills_loaded: clair.length > 0
        ? (clair.reduce((s, e) => s + e.skills_loaded.length, 0) / clair.length).toFixed(1)
        : '0',
    },
    estimated_savings: Math.round(savings),
    savings_percent: savingsPercent,
    by_category: byCategory,
    skill_frequency: skillFrequency,
    events: abEvents.slice(-100),
  });
});

// Export all events as JSON
app.get('/api/export', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ab-events-${Date.now()}.json"`);
  res.json({ exported_at: new Date().toISOString(), total: abEvents.length, events: abEvents });
});

// Reset events (for re-running tests)
app.delete('/api/reset', (_req, res) => {
  const count = abEvents.length;
  abEvents.length = 0;
  res.json({ message: `Cleared ${count} events` });
});

app.listen(PORT, () => {
  const { tokens: fullLoad } = getFullLoadTokenCost(PROJECT_ROOT, manifest);
  const hasApiKey = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your-openrouter-key-here');
  console.log(`Travel Planner A/B Test server at http://localhost:${PORT}`);
  console.log(`Full-load baseline (actual skills): ${fullLoad} tokens`);
  console.log(`Total skills in manifest: ${manifest.skills.length}`);
  console.log(`LLM provider: ${process.env.LLM_PROVIDER ?? 'not set'}`);
  console.log(`OpenRouter model: ${process.env.OPENROUTER_MODEL ?? 'not set'}`);
  console.log(`Real LLM API calls: ${hasApiKey ? 'ENABLED (OpenRouter key found)' : 'DISABLED (no API key)'}`);
});
