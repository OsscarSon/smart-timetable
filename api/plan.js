// Vercel Serverless Function：把课表和新安排交给 Gemini，返回重排后的整周课表
// 环境变量：GEMINI_API_KEY（必填）、GEMINI_MODEL（可选，默认 gemini-3.8-flash）

const RULES = `你是“Mochi”，一个可爱又靠谱的学习时间表规划助手。
任务：根据用户输入的新安排，重排整周课表，并返回【完整】的一周安排。
坐标：day 0=周一 … 6=周日；h 为开始整点(8–21)；len 为持续小时数(1–3)；活动必须在 22:00 前结束；同一天不能重叠。
颜色 c 只能是 pink、mint、sky、lemon、peach。
规则：
1. 用户提到的一次性活动（聚会、比赛、考试等）必须放在对应的星期和时间，优先级最高。
2. 与之冲突的原有安排要挪到同一天或相邻天的空档，不要凭空删除；实在排不下才删，并在 notes 说明。
3. 作息科学：困难科目放上午 9–11 点；午后 13–14 点安排轻松内容或小憩；12 点和 18 点左右留给吃饭；每个学习块不超过 2 小时，块与块之间留空档休息；晚上 21 点后不排高强度学习。
4. 考试或比赛前一天避免排满，保证休息；考试前几天加入复习，并用间隔重复（隔 1、3、7 天回顾）。
5. 每周保留至少一段运动和一段完全空白的休息时间。
6. 标题 t 不超过 12 个字，开头加一个贴切的 emoji。
7. 用户的学习章节（study.topics，iv=0 表示还没学过）与考试日期（study.ex）：越接近考试，做题和复习越多；考试当天和前一晚不排新内容。
8. 用户的运动（sports）含现在成绩 c 与目标 g：针对差距最大的项目安排间歇或节奏训练，隔天练，长距离放周末；学习优先，运动排在剩余空档。
9. 固定课表 fixed（day、h、len）是上课时间，绝对不能安排任何活动。\n10. notes 是最多 4 条简短中文说明，解释你改了什么、为什么（语气可爱温柔）。
只输出 JSON：{"events":[{"day":0,"h":9,"len":2,"t":"📖 数学复习","c":"pink"}],"notes":["..."]}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'missing GEMINI_API_KEY' });

  const { text, events, today, hours, study, sports, fixed } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 500) {
    return res.status(400).json({ error: 'bad text' });
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const prompt =
    `今天是周${'一二三四五六日'[today] || '?'}（day=${today}）。可排时间 ${hours?.[0] ?? 8}:00–${hours?.[1] ?? 22}:00。\n` +
    `当前课表：${JSON.stringify((events || []).slice(0, 80))}\n` +
    `学习与考试：${JSON.stringify(study || {}).slice(0, 3000)}\n` +
    `运动：${JSON.stringify(sports || []).slice(0, 1500)}\n` +
    `固定上课时间（不可占用）：${JSON.stringify(fixed || []).slice(0, 1500)}\n` +
    `用户的新安排：${text.trim()}\n请返回重排后的完整一周。`;

  const call = (withThinking) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RULES }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          ...(withThinking ? { thinkingConfig: { thinkingLevel: process.env.GEMINI_THINKING || 'low' } } : {}),
        },
      }),
    });
  try {
    let r = await call(true);
    if (r.status === 400) r = await call(false); // 模型不认“思考程度”参数时，退回普通调用
    if (!r.ok) {
      const body = (await r.text()).slice(0, 300);
      return res.status(502).json({ error: 'gemini ' + r.status + ' ' + body });
    }
    const j = await r.json();
    const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let out;
    try { out = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch (e) { return res.status(502).json({ error: 'AI 回复不是有效 JSON' }); }
    return res.status(200).json({ events: out.events, notes: out.notes || [] });
  } catch (e) {
    return res.status(500).json({ error: 'server error: ' + String(e && e.message).slice(0, 120) });
  }
};
