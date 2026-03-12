const http = require('http');
const fs = require('fs');

function post(query, variant) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variant });
    const req = http.request({
      hostname: 'localhost', port: 3003, path: '/api/plan',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3003, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const lines = [];
  const log = (s) => { lines.push(s); process.stdout.write(s + '\n'); };

  // Test 1: CLAIR variant with real LLM
  log('=== TEST 1: CLAIR — Find flights to Paris ===');
  const r1 = await post('Find flights to Paris in April', 'clair');
  log('variant: ' + r1.variant);
  log('task_category: ' + r1.task_category);
  log('tokens_used: ' + r1.tokens_used);
  log('file_based_tokens: ' + r1.file_based_tokens);
  log('real_prompt_tokens: ' + r1.real_prompt_tokens);
  log('real_completion_tokens: ' + r1.real_completion_tokens);
  log('using_real_llm: ' + r1.using_real_llm);
  log('skills_loaded: ' + r1.skills_loaded.join(', '));
  log('savings_percent: ' + r1.savings_percent + '%');
  log('LLM response (first 300 chars): ' + String(r1.response).substring(0, 300));
  log('');

  // Test 2: Control variant with real LLM
  log('=== TEST 2: Control — Find flights to Paris ===');
  const r2 = await post('Find flights to Paris in April', 'control');
  log('variant: ' + r2.variant);
  log('tokens_used: ' + r2.tokens_used);
  log('file_based_tokens: ' + r2.file_based_tokens);
  log('real_prompt_tokens: ' + r2.real_prompt_tokens);
  log('real_completion_tokens: ' + r2.real_completion_tokens);
  log('using_real_llm: ' + r2.using_real_llm);
  log('skills_loaded count: ' + r2.skills_loaded.length);
  log('savings_percent: ' + r2.savings_percent + '%');
  log('LLM response (first 300 chars): ' + String(r2.response).substring(0, 300));
  log('');

  // Test 3: Dev task — CLAIR
  log('=== TEST 3: CLAIR — Debug button not firing ===');
  const r3 = await post('The submit button is not firing the click event handler', 'clair');
  log('variant: ' + r3.variant);
  log('task_category: ' + r3.task_category);
  log('tokens_used: ' + r3.tokens_used);
  log('real_prompt_tokens: ' + r3.real_prompt_tokens);
  log('using_real_llm: ' + r3.using_real_llm);
  log('skills_loaded: ' + r3.skills_loaded.join(', '));
  log('LLM response (first 300 chars): ' + String(r3.response).substring(0, 300));
  log('');

  // Stats
  log('=== STATS ===');
  const stats = await get('/api/ab-stats');
  log('total_events: ' + stats.total_events);
  log('using_real_llm: ' + stats.using_real_llm);
  log('real_llm_requests: ' + stats.real_llm_requests);
  log('control avg_tokens: ' + stats.control.avg_tokens);
  log('clair avg_tokens: ' + stats.clair.avg_tokens);
  log('estimated_savings: ' + stats.estimated_savings);
  log('savings_percent: ' + stats.savings_percent + '%');

  // Write to file
  fs.writeFileSync('llm_test_results.txt', lines.join('\n'), 'utf8');
  log('Results written to llm_test_results.txt');
}

run().catch(err => {
  const msg = 'ERROR: ' + err.message;
  process.stdout.write(msg + '\n');
  fs.writeFileSync('llm_test_results.txt', msg, 'utf8');
});
