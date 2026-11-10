#!/usr/bin/env python3
"""合成课表图片生成器（带真值）。用法：python3 gen_timetables.py OUTDIR [N] [SEED]
覆盖：英文 / 马来文表头、格线有无、彩色格子、多种时间标签写法（24h / 12h+AM·PM / 区间 / 只有开始时间 / 上下两行）、
可选教室 / 老师、休息行、表上方的标题噪声、轻微模糊 / 噪点 / JPEG 压缩；少量“双节连堂（合并格）”单独标记为 hard。"""
import sys, os, json, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
out = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 60; seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
os.makedirs(out, exist_ok=True); rnd = random.Random(seed)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SUB_EN = ['Mathematics','English','Science','History','Geography','Art','Music','Physical Ed','Physics','Chemistry','Biology','Computing','Moral','Drama']
SUB_MS = ['Bahasa Melayu','Matematik','Sains','Sejarah','Geografi','Pendidikan Islam','Pend Jasmani','Bahasa Inggeris','Seni Visual','Muzik','Prinsip Akaun','Fizik','Kimia','Biologi']
DAYS_EN = [['Monday','Tuesday','Wednesday','Thursday','Friday'],['Mon','Tue','Wed','Thu','Fri'],['MON','TUE','WED','THU','FRI']]
DAYS_MS = [['Isnin','Selasa','Rabu','Khamis','Jumaat'],['ISNIN','SELASA','RABU','KHAMIS','JUMAAT']]
PASTEL = [(255,224,230),(220,245,230),(220,235,255),(255,245,200),(255,230,210),(235,225,250)]
def fmt(m, style):
    h, mi = divmod(m, 60)
    if style == '24': return '%02d:%02d' % (h, mi)
    if style == 'dot': return '%d.%02d' % (h, mi)
    ap = 'AM' if h < 12 else 'PM'; hh = h % 12 or 12
    return '%d:%02d %s' % (hh, mi, ap)
def mk(i):
    ms = rnd.random() < 0.45; days = rnd.choice(DAYS_MS if ms else DAYS_EN); subs = SUB_MS if ms else SUB_EN
    nrows = rnd.randint(5, 8); start = rnd.choice([7*60+30, 8*60, 7*60+45]); dur = rnd.choice([30, 35, 40, 45, 60])
    tstyle = rnd.choice(['24', '24', 'dot', '12']); lstyle = rnd.choice(['range', 'range', 'single', 'stack'])
    grid = rnd.random() < 0.7; color = rnd.random() < 0.4; extra = rnd.random() < 0.45; hard = rnd.random() < 0.12
    fs = rnd.randint(19, 25); cw = rnd.randint(170, 230); rh = rnd.randint(64, 92) + (18 if extra else 0); lw = 190 if lstyle != 'single' else 120
    W = lw + cw * 5 + 80; H = 150 + rh * (nrows + (1 if rnd.random() < 0.3 else 0)) + 60
    img = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(img); f = ImageFont.truetype(F, fs); fb = ImageFont.truetype(FB, fs); fsmall = ImageFont.truetype(F, max(14, fs - 5))
    d.text((40, 24), rnd.choice(['Class 5A Timetable', 'JADUAL WAKTU KELAS 4 BESTARI', 'Weekly Schedule 2026', 'Time Table']), fill='black', font=ImageFont.truetype(FB, fs + 6))
    top = 90; x0 = 40
    gt = []; rows = []; t = start
    rec_at = rnd.randint(2, 3) if nrows > 4 else -1
    for r in range(nrows):
        if r == rec_at: rows.append((t, t + 20, 'REHAT' if ms else 'BREAK')); t += 20
        else: rows.append((t, t + dur, None)); t += dur
    # 表头
    for c, name in enumerate(days):
        cx = x0 + lw + c * cw
        if color: d.rectangle([cx, top, cx + cw, top + 50], fill=(200, 215, 240))
        if grid: d.rectangle([cx, top, cx + cw, top + 50], outline='black', width=2)
        tw = d.textlength(name, font=fb); d.text((cx + (cw - tw) / 2, top + 12), name, fill='black', font=fb)
    last = [None] * 5
    for r, (s, e, brk) in enumerate(rows):
        y = top + 50 + r * rh
        if grid: d.rectangle([x0, y, x0 + lw, y + rh], outline='black', width=2)
        if lstyle == 'range': lab = fmt(s, tstyle) + ('-' if rnd.random() < .5 else ' - ') + fmt(e, tstyle); tw = d.textlength(lab, font=fsmall); d.text((x0 + max(4, (lw - tw) / 2), y + rh / 2 - 9), lab, fill='black', font=fsmall)
        elif lstyle == 'single': lab = fmt(s, tstyle); d.text((x0 + 10, y + rh / 2 - 11), lab, fill='black', font=f)
        else: d.text((x0 + 14, y + rh / 2 - 26), fmt(s, tstyle), fill='black', font=fsmall); d.text((x0 + 14, y + rh / 2 + 2), fmt(e, tstyle), fill='black', font=fsmall)
        for c in range(5):
            cx = x0 + lw + c * cw
            if brk:
                if color: d.rectangle([cx, y, cx + cw, y + rh], fill=(235, 235, 235))
                if grid: d.rectangle([cx, y, cx + cw, y + rh], outline='black', width=2)
                if c == 2: d.text((cx + 20, y + rh / 2 - 11), brk, fill='gray', font=f)
                continue
            if rnd.random() < 0.18: 
                if grid: d.rectangle([cx, y, cx + cw, y + rh], outline='black', width=2)
                continue
            sub = rnd.choice([x for x in subs if x != last[c]]); last[c] = sub
            if color: d.rectangle([cx + 2, y + 2, cx + cw - 2, y + rh - 2], fill=rnd.choice(PASTEL))
            if grid: d.rectangle([cx, y, cx + cw, y + rh], outline='black', width=2)
            lines = [sub]
            if extra: lines.append(rnd.choice(['Rm %d' % rnd.randint(1, 30), 'Mr Tan', 'Cikgu Aina', 'Lab 2', 'Bilik 7']))
            tot = len(lines) * (fs + 6); yy = y + (rh - tot) / 2
            for ln in lines:
                tw = d.textlength(ln, font=f)
                while tw > cw - 14 and len(ln) > 4: ln = ln[:-1]; tw = d.textlength(ln, font=f)
                d.text((cx + (cw - tw) / 2, yy), ln, fill='black', font=f); yy += fs + 6
            gt.append({'day': c, 's': s, 'e': e, 't': sub, 'hard': False})
    if hard:   # 合并一个双节连堂：把第 2 行和第 3 行的同一列合成一个大格，文字居中
        r0 = rnd.choice([r for r in range(nrows - 1) if rows[r][2] is None and rows[r + 1][2] is None] or [0]); c = rnd.randint(0, 4); cx = x0 + lw + c * cw; y = top + 50 + r0 * rh
        d.rectangle([cx + 1, y + 1, cx + cw - 1, y + 2 * rh - 1], fill=(250, 250, 250) if not color else rnd.choice(PASTEL)); 
        if grid: d.rectangle([cx, y, cx + cw, y + 2 * rh], outline='black', width=2)
        sub = rnd.choice(subs); tw = d.textlength(sub, font=f); d.text((cx + (cw - tw) / 2, y + rh - fs / 2), sub, fill='black', font=f)
        gt = [g for g in gt if not (g['day'] == c and g['s'] in (rows[r0][0], rows[r + 1 if False else r0 + 1][0]))]
        gt.append({'day': c, 's': rows[r0][0], 'e': rows[r0 + 1][1], 't': sub, 'hard': True})
    if rnd.random() < 0.5: img = img.filter(ImageFilter.GaussianBlur(rnd.choice([0.5, 0.8])))
    if rnd.random() < 0.4:
        px = img.load()
        for _ in range(int(W * H * 0.004)): px[rnd.randrange(W), rnd.randrange(H)] = (rnd.randrange(80, 200),) * 3
    if rnd.random() < 0.25: img = img.rotate(rnd.choice([-0.6, 0.5]), expand=False, fillcolor='white', resample=Image.BICUBIC)
    p = os.path.join(out, 'tt%03d.jpg' % i); img.save(p, quality=rnd.choice([55, 70, 85]))
    json.dump({'file': os.path.basename(p), 'lessons': gt, 'meta': {'ms': ms, 'grid': grid, 'color': color, 'lstyle': lstyle, 'tstyle': tstyle, 'hard': hard, 'extra': extra}}, open(os.path.join(out, 'tt%03d.json' % i), 'w'))
for i in range(N): mk(i)
print('generated', N, 'timetables in', out)
