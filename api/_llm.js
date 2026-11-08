// 统一的“文字模型”入口：按顺序尝试多家（免费额度各算各的，一家超额 / 出错就换下一家）。
//   顺序由环境变量 LLM_ORDER 决定，默认 groq,gemini,cloudflare,openrouter；没填 key 的那一家自动跳过。
//   （cerebras、mistral 仍然支持，要用就写进 LLM_ORDER，比如 groq,gemini,cloudflare,openrouter,cerebras）
//   看图（拍照导入课表）只走 Gemini；用户自带的 key（X-User-Key）也只走 Gemini。
// 环境变量：GROQ_API_KEY / GEMINI_API_KEY / CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN / OPENROUTER_API_KEY（以及可选的 CEREBRAS_API_KEY / MISTRAL_API_KEY），
//   模型名可用 GROQ_MODEL / GEMINI_MODEL / CF_MODEL / OPENROUTER_MODEL / CEREBRAS_MODEL / MISTRAL_MODEL 覆盖（免费模型名常变，请以各家控制台为准）。
const TIMEOUT = 20000;
const OAI = {
  // Cloudflare Workers AI 的 OpenAI 兼容接口：网址里带账号 ID，所以 url 用函数；key 用 API Token
  cloudflare: { url: () => `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`, key: 'CLOUDFLARE_API_TOKEN', need: ['CLOUDFLARE_ACCOUNT_ID'], model: () => process.env.CF_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', key: 'OPENROUTER_API_KEY', model: () => process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free' },
  groq:     { url: 'https://api.groq.com/openai/v1/chat/completions', key: 'GROQ_API_KEY',     model: () => process.env.GROQ_MODEL     || 'llama-3.3-70b-versatile' },
  cerebras: { url: 'https://api.cerebras.ai/v1/chat/completions',     key: 'CEREBRAS_API_KEY', model: () => process.env.CEREBRAS_MODEL || 'llama-3.3-70b' },
  mistral:  { url: 'https://api.mistral.ai/v1/chat/completions',      key: 'MISTRAL_API_KEY',  model: () => process.env.MISTRAL_MODEL  || 'mistral-small-latest' },
};
const JSON_HINT = '\n\n只输出一个 JSON 对象（JSON only），不要 markdown，不要多余文字。';
const sig = () => AbortSignal.timeout(TIMEOUT);

async function viaOpenAI(name, o) {
  const p = OAI[name];
  const mk = (withFmt) => fetch(typeof p.url === 'function' ? p.url() : p.url, {
    method: 'POST', signal: sig(),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env[p.key] },
    body: JSON.stringify({
      model: p.model(), temperature: o.temperature ?? 0.2,
      ...(withFmt ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: o.system + JSON_HINT }].concat(o.messages.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }))),
    }),
  });
  let r = await mk(true);
  if (r.status === 400) r = await mk(false);          // 个别模型不认 response_format：退回普通调用，靠提示词要 JSON
  if (!r.ok) throw new Error(name + ' ' + r.status + ' ' + (await r.text()).slice(0, 160));
  const j = await r.json();
  return String(j.choices?.[0]?.message?.content || '');
}

async function viaGemini(key, o) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const contents = o.messages.map((m, i) => {
    const parts = [{ text: m.text }];
    if (o.image && i === 0) parts.unshift({ inlineData: { mimeType: o.image.mime, data: o.image.data } });
    return { role: m.role === 'model' ? 'model' : 'user', parts };
  });
  const mk = (withThinking) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', signal: sig(),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: o.system }] }, contents,
      generationConfig: { responseMimeType: 'application/json', temperature: o.temperature ?? 0.2,
        ...(withThinking ? { thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING || 'minimal' } } : {}) },
    }),
  });
  let r = await mk(!!o.thinking);
  if (r.status === 400 && o.thinking) r = await mk(false);   // 模型不认“思考程度”参数时退回普通调用
  if (!r.ok) throw new Error('gemini ' + r.status + ' ' + (await r.text()).slice(0, 160));
  const j = await r.json();
  return String(j.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

// 这次请求能用哪些来源，按顺序返回：[{name, run}]
function chain(o) {
  if (o.gemKey) return [{ name: 'gemini(own)', run: () => viaGemini(o.gemKey, o) }];
  const gem = process.env.GEMINI_API_KEY;
  if (o.image) return gem ? [{ name: 'gemini', run: () => viaGemini(gem, o) }] : [];
  return (process.env.LLM_ORDER || 'groq,gemini,cloudflare,openrouter').split(',').map(s => s.trim()).filter(Boolean).flatMap(n => {
    if (n === 'gemini') return gem ? [{ name: n, run: () => viaGemini(gem, o) }] : [];
    return OAI[n] && process.env[OAI[n].key] && (OAI[n].need || []).every(k => process.env[k]) ? [{ name: n, run: () => viaOpenAI(n, o) }] : [];
  });
}
const ready = (o) => chain(o).length > 0;
// 返回 { text, provider }；全部失败时抛出最后一个错误
async function generate(o) {
  let last = new Error('没有可用的 AI 来源');
  for (const c of chain(o)) {
    try { const text = await c.run(); if (text.trim()) return { text, provider: c.name }; last = new Error(c.name + ' 返回为空'); }
    catch (e) { last = e; }
  }
  throw last;
}
module.exports = { generate, ready };
