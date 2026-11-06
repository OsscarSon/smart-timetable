// Vercel Serverless Function：把课表和新安排交给 Gemini，返回重排后的整周课表
// 环境变量：GEMINI_API_KEY（必填）、GEMINI_MODEL（可选，默认 gemini-3.5-flash-lite）

const LANGN = { en: 'English', ms: 'Bahasa Melayu', zh: '简体中文' };
const langNote = (l) => '\n\nLanguage: write every human-readable string you create (event titles "t", "notes", subject names you invent) in ' + (LANGN[l] || 'English') + '. Keep any wording the user already gave you as it is.';
const RULES = `你是“Mochi”，一个可爱又靠谱的学习时间表规划助手。
任务：根据用户输入的新安排，重排整周课表，并返回【完整】的一周安排。
坐标：day 0=周一 … 6=周日；s、e 为开始和结束时间，用“当天 0 点起的分钟数”（如 9:00=540，10:30=630），取 5 的倍数，e-s 在 30–240 之间；活动必须在可排时间范围内；同一天不能重叠。
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
9. 固定时段 fixed（day、s、e、type；s/e 为分钟数）包含上课、考试和重复活动，绝对不能安排任何活动，也不要把它们放进返回的 events。
10. 用户隐藏的日子（hidden）不要排任何活动。
11. 作业 homework（t 标题、sb 科目、due 截止日期 YYYY-MM-DD，可能为空）：把写作业的时间排进截止日之前的空档，越近越优先，已逾期的尽快安排；每份作业用“📝 科目·作业”之类的标题。
12. notes 是最多 4 条简短中文说明，解释你改了什么、为什么（语气可爱温柔）。
13. 健康（health）：午餐约 12:00–13:00、晚餐约 18:00–19:00 尽量留空，不要排课外学习或训练；睡前留 10 分钟给护肤，不用单独排成活动；训练后可以提醒补水；如果最近摄入明显低于 goalKcal，不要排高强度训练。
只输出 JSON：{"events":[{"day":0,"s":540,"e":660,"t":"📖 数学复习","c":"pink"}],"notes":["..."]}`;

const { generate, ready } = require('./_llm');
const { guard, userKey, inr, str, COLS } = require('./_lib');

module.exports = async (req, res) => {
  const who = await guard(req, res, { cost: 1, maxBytes: 200_000 });
  if (!who) return;
  const gemKey = userKey(req);

  const { text, events, today, hours, study, sports, fixed, hidden, week, homework, health, lang } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 500) {
    return res.status(400).json({ error: 'bad text' });
  }
  if (events != null && (!Array.isArray(events) || events.length > 120)) return res.status(400).json({ error: 'bad events' });
  const prompt =
    `今天是周${'一二三四五六日'[today] || '?'}（day=${today}）。可排时间 ${hours?.[0] ?? 8}:00–${hours?.[1] ?? 22}:00。\n` +
    `当前课表：${JSON.stringify((events || []).slice(0, 80))}\n` +
    `学习与考试：${JSON.stringify(study || {}).slice(0, 3000)}\n` +
    `运动：${JSON.stringify(sports || []).slice(0, 1500)}\n` +
    `本周范围：${String(week || '').slice(0, 120)}\n` +
    `固定时段（上课/考试/重复活动，不可占用）：${JSON.stringify(fixed || []).slice(0, 2500)}\n` +
    `隐藏的日子（不要排）：${JSON.stringify(hidden || [])}\n` +
    `未完成的作业：${JSON.stringify((homework || []).slice(0, 20)).slice(0, 2000)}\n` +
    `健康（护肤步骤、饮食目标与最近摄入、饮水）：${JSON.stringify(health || {}).slice(0, 1500)}\n` +
    `用户的新安排：${text.trim()}\n请返回重排后的完整一周。`;

  const opts = { system: RULES + langNote(lang), messages: [{ role: 'user', text: prompt }], gemKey, thinking: true, temperature: 0.2 };
  if (!ready(opts)) return res.status(500).json({ error: 'no AI key configured' });
  try {
    let text;
    try { text = (await generate(opts)).text; } catch (e) { return res.status(502).json({ error: String(e && e.message).slice(0, 200) }); }
    let out;
    try { out = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch (e) { return res.status(502).json({ error: 'AI 回复不是有效 JSON' }); }
    // 不信任模型输出：逐项校验、截断，坏的直接丢掉（前端还会再校验一遍）
    const evs = (Array.isArray(out.events) ? out.events : []).slice(0, 80).map(x => {
      let s = inr(x.s, 0, 1439, -1), e = inr(x.e, 1, 1440, -1);
      if (s < 0 && x.h != null) { s = inr(Number(x.h) * 60, 0, 1439, -1); e = s + inr(Number(x.len || 1) * 60, 30, 240, 60); }   // 模型偶尔用旧格式
      return { day: inr(x.day, 0, 6, -1), s, e, t: str(x.t, 14), c: COLS.includes(x.c) ? x.c : 'peach' };
    }).filter(x => x.day >= 0 && x.s >= 0 && x.e > x.s && x.t);
    const notes = (Array.isArray(out.notes) ? out.notes : []).slice(0, 4).map(n => str(n, 80));
    return res.status(200).json({ events: evs, notes });
  } catch (e) {
    return res.status(500).json({ error: 'server error: ' + String(e && e.message).slice(0, 120) });
  }
};
