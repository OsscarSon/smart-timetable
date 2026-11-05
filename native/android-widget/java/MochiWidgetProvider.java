package app.mochi.timetable;   // 如果你的包名不同（capacitor.config.json 的 appId），改这一行

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/** Mochi 今日课表小组件：读 App 写进 SharedPreferences（CapacitorStorage / mochi-widget）的 JSON，显示今天还没结束的 5 项；今天没有了就显示明天。 */
public class MochiWidgetProvider extends AppWidgetProvider {
    private static final int[] ROWS = {R.id.mw_row1, R.id.mw_row2, R.id.mw_row3, R.id.mw_row4, R.id.mw_row5};

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
    }

    static void update(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.mochi_widget);
        String title = "今天";
        List<String> lines = new ArrayList<>();
        try {
            String raw = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).getString("mochi-widget", null);
            if (raw == null) {
                lines.add("打开一次 Mochi，这里就会显示今天的课表");
            } else {
                JSONArray days = new JSONObject(raw).getJSONArray("days");
                SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                Calendar c = Calendar.getInstance();
                int nowMin = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
                String today = f.format(c.getTime());
                c.add(Calendar.DAY_OF_MONTH, 1);
                String tomorrow = f.format(c.getTime());
                lines = pick(days, today, nowMin);
                if (lines.isEmpty()) {
                    lines = pick(days, tomorrow, -1);
                    if (!lines.isEmpty()) title = "明天";
                }
                if (lines.isEmpty()) lines.add("没有安排，好好休息 ☕");
            }
        } catch (Exception e) {
            lines.add("读取失败，打开 Mochi 刷新一下");
        }
        v.setTextViewText(R.id.mw_title, "🐱 Mochi · " + title);
        for (int i = 0; i < ROWS.length; i++) {
            if (i < lines.size()) {
                v.setTextViewText(ROWS[i], lines.get(i));
                v.setViewVisibility(ROWS[i], View.VISIBLE);
            } else {
                v.setViewVisibility(ROWS[i], View.GONE);
            }
        }
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (open != null) {
            PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.mw_root, pi);
        }
        mgr.updateAppWidget(id, v);
    }

    /** 取某一天里“结束时间 > afterMin”的项目，最多 5 条，格式：08:00 数学 · A301 · 王老师 */
    private static List<String> pick(JSONArray days, String date, int afterMin) throws Exception {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < days.length(); i++) {
            JSONObject d = days.getJSONObject(i);
            if (!date.equals(d.optString("date"))) continue;
            JSONArray items = d.getJSONArray("items");
            for (int k = 0; k < items.length() && out.size() < 5; k++) {
                JSONObject it = items.getJSONObject(k);
                if (it.optInt("e") <= afterMin) continue;
                int s = it.optInt("s");
                String m = it.optString("m");
                out.add(String.format(Locale.US, "%02d:%02d ", s / 60, s % 60) + it.optString("t") + (m.isEmpty() ? "" : " · " + m));
            }
        }
        return out;
    }
}
