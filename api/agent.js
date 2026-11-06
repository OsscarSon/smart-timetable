// Vercel Serverless Function：「问问 Mochi」日程助手（工具型 AI）
// 环境变量：GEMINI_API_KEY（必填）、GEMINI_MODEL（可选）
// 设计：模型只“提出方案”（actions），不直接改任何数据；前端先预览，用户确认后才写入，并提供撤销。
// 模型输出一律不信任：逐项校验，ref / id 必须在请求带来的快照里存在，否则丢掉。

const PROMPT = `你是 Mochi 时间表里的“日程助手”。用户会问关于自己日程、作业的问题，或者让你帮忙改日程。
你只能依据下面的“日程快照”回答，不要编造快照里没有的安排。用用户提问时使用的语言回答，简短、具体。

快照说明：
- days：从今天起的若干天；每天有 items（已有安排）和 free（已经算好的空闲时段）。时间都是“当天 0 点起的分钟数”。
- items 的 k：m = 手动活动（有 ref，可以移动 / 删除）；r = 重复活动、f = 固定课程（只读，不能改）。
- hw：还没完成的作业（id、标题、科目、截止日期）。
- now 是现在的分钟数；今天已经过去的时间不要安排。

回答规则：
1. 问空闲 / 安排 / 作业：直接在 reply 里回答，写出具体日期和时间（用 08:30 这样的写法），不要给 actions。空闲时段直接用快照里的 free，不要自己重新计算。
2. 要改动：在 actions 里给方案，reply 用一两句话说明你打算做什么，并说“确认后才会生效”。绝不能说“已经改好了”。
3. 只能移动 / 删除 k=m 的安排（用它的 ref）。重复活动、固定课程不能改，用户要求时解释原因，建议到课表里手动改。
4. 用户没说具体时间时，从 free 里挑合适的时段；放不下就如实说，不要硬塞，也不要和已有安排重叠。
5. 不确定用户指的是哪一条时，在 reply 里问一句，不要给 actions。
6. 日期用 YYYY-MM-DD；start 是当天 0 点起的分钟数；dur 是持续分钟数。活动标题不超过 12 个字，开头加一个贴切的 emoji。
7. 时间精确到分钟：start 取 5 的倍数，dur 至少 15 分钟。

actions 里的工具（最多 8 个）：
- {"tool":"add_event","title":"📚 数学复习","date":"2026-11-12","start":900,"dur":60}
- {"tool":"move_event","ref":"m2927_0","date":"2026-11-13","start":600,"dur":60}      （dur 可省略 = 保持原时长）
- {"tool":"delete_event","ref":"m2927_0"}
- {"tool":"add_homework","title":"英语作文","subject":"英语","due":"2026-11-14"}
- {"tool":"update_homework","id":"作业 id","due":"2026-11-15","done":true}              （due、done 至少给一个）

只输出 JSON：{"reply":"……","actions":[…]}`;

const { guard, int, str, iso } = require('./_lib');
const LANGN = { en: 'English', ms: 'Bahasa Melayu', zh: '简体中文' };
const langNote = (l) => '\n\nLanguage: write "reply" and any event titles you create in ' + (LANGN[l] || 'English') + ', unless the user clearly writes in another language.';

module.exports = async (req, res) => {
  const who = await guard(req, res, { cost: 1, maxBytes: 60_000 });
  if (!who) return;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'missing GEMINI_API_KEY' });

  const { messages, snapshot, lang } = req.body || {};
  if (!Array.isArray(messages) || !messages.length || messages.length > 10) return res.status(400).json({ error: 'bad messages' });
  const msgs = messages.map(m => ({ role: m && m.role === 'model' ? 'model' : 'user', text: str(m && m.text, 600) })).filter(m => m.text);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'last message must be from user' });
  if (!snapshot || typeof snapshot !== 'object' || !iso(snapshot.today) || !Array.isArray(snapshot.days) || snapshot.days.length > 21) return res.status(400).json({ error: 'bad snapshot' });
  const snapText = JSON.stringify(snapshot);
  if (snapText.length > 30000) return res.status(400).json({ error: 'snapshot too large' });

  // 快照里允许被改动的东西：k=m 的 ref → 标题；未完成作业 id → 标题
  const refs = new Map(), hwIds = new Map();
  snapshot.days.forEach(d => (Array.isArray(d && d.items) ? d.items : []).forEach(x => {
    if (x && x.k === 'm' && /^m-?\d+_\d+$/.test(String(x.ref))) refs.set(String(x.ref), str(x.t, 100));
  }));
  (Array.isArray(snapshot.hw) ? snapshot.hw : []).forEach(h => { if (h && h.id) hwIds.set(String(h.id), str(h.t, 100)); });

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT + langNote(lang) + '\n\n日程快照：\n' + snapText }] },
        contents: msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'gemini ' + r.status + ' ' + (await r.text()).slice(0, 200) });
    const j = await r.json();
    let out;
    try { out = JSON.parse((j.candidates?.[0]?.content?.parts?.[0]?.text || '{}').replace(/```json|```/g, '').trim()); }
    catch (e) { return res.status(502).json({ error: 'AI 回复不是有效 JSON' }); }

    const actions = (Array.isArray(out.actions) ? out.actions : []).slice(0, 24).map(a => {
      if (!a) return null;
      const t = a.tool;
      if (t === 'add_event') {
        const o = { tool: t, title: str(a.title, 20), date: iso(a.date), start: int(a.start, 0, 1439, -1), dur: int(a.dur, 15, 480, 60) };
        return o.title && o.date && o.start >= 0 ? o : null;
      }
      if (t === 'move_event') {
        const ref = String(a.ref);
        const o = { tool: t, ref, title: refs.get(ref), date: iso(a.date), start: int(a.start, 0, 1439, -1), dur: a.dur == null ? 0 : int(a.dur, 15, 480, 0) };
        return refs.has(ref) && o.date && o.start >= 0 ? o : null;
      }
      if (t === 'delete_event') {
        const ref = String(a.ref);
        return refs.has(ref) ? { tool: t, ref, title: refs.get(ref) } : null;
      }
      if (t === 'add_homework') {
        const o = { tool: t, title: str(a.title, 60), subject: str(a.subject, 12), due: iso(a.due) };
        return o.title ? o : null;
      }
      if (t === 'update_homework') {
        const id = String(a.id), o = { tool: t, id, title: hwIds.get(id), due: iso(a.due), done: a.done === true ? true : a.done === false ? false : null };
        return hwIds.has(id) && (o.due || o.done !== null) ? o : null;
      }
      return null;
    }).filter(Boolean).slice(0, 8);
    return res.status(200).json({ reply: str(out.reply, 800) || (actions.length ? '我准备了下面的改动，确认后才会生效。' : '我没太明白，能再说具体一点吗？'), actions });
  } catch (e) {
    return res.status(500).json({ error: 'server error: ' + String(e && e.message).slice(0, 120) });
  }
};
