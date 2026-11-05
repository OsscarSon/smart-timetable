package __PKG__;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * 桌面小组件：当前 / 下一节 + 倒计时（系统 Chronometer，不用每秒刷新）+ 后面几项；今天没课了就显示明天。
 * 数据来自网页端推送的 JSON：{"v":1,"h24":true,"days":[{"date":"2026-11-05","items":[{"s":480,"e":525,"t":"数学","l":"A301 · 王老师"}]}, {...明天...}]}
 * 刷新时机：App 推送新数据时 / 每 30 分钟（系统周期）/ 下一个“开始或结束”的时刻（AlarmManager 非精确闹钟，不需要额外权限）。
 */
public class MochiWidgetProvider extends AppWidgetProvider {
    static final String TICK = "__PKG__.WIDGET_TICK";
    private static final int[] LINES = {R.id.w_l1, R.id.w_l2, R.id.w_l3, R.id.w_l4};
    private static long nextTick = 0;

    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        RemoteViews v = build(c);
        for (int id : ids) m.updateAppWidget(id, v);
        schedule(c);
    }

    @Override public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (i != null && TICK.equals(i.getAction())) refreshAll(c);
    }

    public static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, MochiWidgetProvider.class));
        if (ids.length == 0) return;
        RemoteViews v = build(c);
        for (int id : ids) m.updateAppWidget(id, v);
        schedule(c);
    }

    private static void schedule(Context c) {
        try {
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            Intent i = new Intent(c, MochiWidgetProvider.class).setAction(TICK);
            PendingIntent pi = PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            long at = Math.max(nextTick + 1000, System.currentTimeMillis() + 60000);
            am.set(AlarmManager.RTC, at, pi);   // 非精确：可能晚几分钟，不影响显示（倒计时本身由系统控件走）
        } catch (Exception ignored) { }
    }

    private static String iso(Calendar c) {
        return String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    private static String hhmm(int m, boolean h24) {
        int H = m / 60, M = m % 60;
        if (h24) return String.format(Locale.US, "%02d:%02d", H, M);
        return String.format(Locale.US, "%d:%02d%s", (H % 12 == 0 ? 12 : H % 12), M, H % 24 < 12 ? "am" : "pm");
    }

    private static JSONArray dayItems(JSONObject root, String date) {
        try {
            JSONArray days = root.getJSONArray("days");
            for (int i = 0; i < days.length(); i++) {
                JSONObject d = days.getJSONObject(i);
                if (date.equals(d.optString("date"))) return d.getJSONArray("items");
            }
        } catch (Exception ignored) { }
        return null;
    }

    private static long at(Calendar base, int minutes, int addDays) {
        Calendar c = (Calendar) base.clone();
        c.add(Calendar.DAY_OF_MONTH, addDays);
        c.set(Calendar.HOUR_OF_DAY, minutes / 60);
        c.set(Calendar.MINUTE, minutes % 60);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.mochi_widget);
        Intent li = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (li != null) v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 0, li, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        SharedPreferences sp = c.getSharedPreferences("mochi_widget", Context.MODE_PRIVATE);
        JSONObject root = null;
        try { root = new JSONObject(sp.getString("json", "{}")); } catch (Exception ignored) { }
        Calendar now = Calendar.getInstance();
        Calendar tmr = (Calendar) now.clone();
        tmr.add(Calendar.DAY_OF_MONTH, 1);
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        boolean h24 = root == null || root.optBoolean("h24", true);
        String[] wd = {"日", "一", "二", "三", "四", "五", "六"};

        JSONArray today = root == null ? null : dayItems(root, iso(now));
        JSONArray next = root == null ? null : dayItems(root, iso(tmr));
        for (int id : LINES) v.setViewVisibility(id, View.GONE);
        v.setViewVisibility(R.id.w_cd, View.GONE);
        nextTick = at(now, 24 * 60 + 1, 0);

        if (today == null && next == null) {
            v.setTextViewText(R.id.w_head, "Mochi");
            v.setTextViewText(R.id.w_main, "打开 Mochi 刷新课表");
            v.setTextViewText(R.id.w_sub, "");
            return v;
        }

        List<JSONObject> left = new ArrayList<>();
        try {
            if (today != null) for (int i = 0; i < today.length(); i++) {
                JSONObject o = today.getJSONObject(i);
                if (o.getInt("e") > nowMin) left.add(o);
            }
        } catch (Exception ignored) { }

        boolean tomorrow = left.isEmpty();
        List<JSONObject> list = new ArrayList<>();
        if (tomorrow && next != null) {
            try { for (int i = 0; i < next.length(); i++) list.add(next.getJSONObject(i)); } catch (Exception ignored) { }
        } else list = left;

        int dow = (tomorrow ? tmr : now).get(Calendar.DAY_OF_WEEK) - 1;
        v.setTextViewText(R.id.w_head, (tomorrow ? "明天 · 周" : "今天 · 周") + wd[dow]);

        if (list.isEmpty()) {
            v.setTextViewText(R.id.w_main, tomorrow ? "今天没有安排了 🎉" : "今天没有安排");
            v.setTextViewText(R.id.w_sub, "");
            return v;
        }
        try {
            JSONObject f = list.get(0);
            int s = f.getInt("s"), e = f.getInt("e");
            boolean going = !tomorrow && s <= nowMin;
            long target = going ? at(now, e, 0) : at(now, s, tomorrow ? 1 : 0);
            v.setTextViewText(R.id.w_main, (going ? "进行中 · " : tomorrow ? "明天第一项 · " : "下一项 · ") + f.optString("t"));
            String loc = f.optString("l");
            v.setTextViewText(R.id.w_sub, hhmm(s, h24) + "–" + hhmm(e, h24) + (loc.isEmpty() ? "" : " · " + loc) + (going ? " · 还剩" : " · 倒计时"));
            if (Build.VERSION.SDK_INT >= 24) {
                v.setViewVisibility(R.id.w_cd, View.VISIBLE);
                v.setChronometerCountDown(R.id.w_cd, true);
                v.setChronometer(R.id.w_cd, SystemClock.elapsedRealtime() + (target - System.currentTimeMillis()), null, true);
            }
            nextTick = tomorrow ? at(now, 24 * 60 + 1, 0) : target;
            for (int i = 1; i < list.size() && i <= LINES.length; i++) {
                JSONObject o = list.get(i);
                v.setViewVisibility(LINES[i - 1], View.VISIBLE);
                v.setTextViewText(LINES[i - 1], hhmm(o.getInt("s"), h24) + "  " + o.optString("t") + (o.optString("l").isEmpty() ? "" : " · " + o.optString("l")));
            }
        } catch (Exception ignored) { }
        return v;
    }
}
